import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export const ImageGen = internalAction({
    args: {
        imageUrl: v.string(),
        userId: v.string(),
        style: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"images">> => {
        console.log(`[ImageGen] START for imageUrl: ${args.imageUrl}, userId: ${args.userId}, style: ${args.style}`);

        if (!process.env.REPLICATE_API_TOKEN) {
            console.error("[ImageGen] ERROR: Replicate API token not configured");
            throw new ConvexError("Replicate API token not configured");
        }

        // Find the image record to update status
        const imageRecord = await ctx.runQuery(internal.image.getImageByUrl, {
            imageUrl: args.imageUrl
        });

        if (!imageRecord) {
            console.error("[ImageGen] ERROR: Image record not found for imageUrl:", args.imageUrl);
            throw new ConvexError("Image record not found");
        }

        try {
            // Update status to processing
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: imageRecord._id,
                status: "processing"
            });

            // Prepare the input for FLUX.1 Kontext Pro model
            const input = {
                prompt: getStylePrompt(args.style),
                input_image: args.imageUrl,
                aspect_ratio: "match_input_image",
                output_format: "jpg",
                safety_tolerance: 2
            };
            console.log('[ImageGen] Replicate input:', JSON.stringify(input));

            let output;
            try {
                console.log('[ImageGen] About to call Replicate.run...');
                output = await replicate.run(
                    "black-forest-labs/flux-kontext-pro",
                    { input }
                );
                console.log('[ImageGen] Replicate.run finished');
                
                // According to Replicate docs, output should be a string URL directly
                console.log('[ImageGen] Output type:', typeof output);
                console.log('[ImageGen] Output is array:', Array.isArray(output));
                
                // Don't try to JSON.stringify the output as it may have circular references
                if (typeof output === "string") {
                    console.log('[ImageGen] Output is string URL:', output);
                } else if (Array.isArray(output)) {
                    console.log('[ImageGen] Output is array with length:', output.length);
                    console.log('[ImageGen] First item type:', typeof output[0]);
                } else {
                    console.log('[ImageGen] Output is object with keys:', output ? Object.keys(output) : 'null');
                }
                
            } catch (err) {
                console.error('[ImageGen] Replicate API error:', err instanceof Error ? err.message : 'Unknown error');
                if (err instanceof Error && err.stack) {
                    console.error('[ImageGen] Error stack:', err.stack);
                }
                await ctx.runMutation(internal.image.updateImageStatus, {
                    imageId: imageRecord._id,
                    status: "error"
                });
                throw new ConvexError("Replicate API error: " + (err instanceof Error ? err.message : 'Unknown error'));
            }

            // Extract the cartoon image URL from the output
            // According to Replicate docs, the output should be a string URL directly
            let cartoonImageUrl: string | undefined = undefined;
            
            if (typeof output === "string") {
                cartoonImageUrl = output;
            } else if (Array.isArray(output) && output.length > 0) {
                // If it's an array, take the first item
                cartoonImageUrl = typeof output[0] === "string" ? output[0] : undefined;
            } else if (output && typeof output === "object") {
                // If it's an object, try to extract from common properties
                const outputObj = output as any;
                if (outputObj.output && typeof outputObj.output === "string") {
                    cartoonImageUrl = outputObj.output;
                } else if (Array.isArray(outputObj.output) && outputObj.output.length > 0) {
                    cartoonImageUrl = typeof outputObj.output[0] === "string" ? outputObj.output[0] : undefined;
                }
            }

            if (!cartoonImageUrl || typeof cartoonImageUrl !== 'string') {
                console.error("[ImageGen] Could not extract cartoonImageUrl from Replicate output");
                console.error("[ImageGen] Output type:", typeof output);
                console.error("[ImageGen] Output is array:", Array.isArray(output));
                if (output && typeof output === "object") {
                    console.error("[ImageGen] Output keys:", Object.keys(output));
                }
                
                await ctx.runMutation(internal.image.updateImageStatus, {
                    imageId: imageRecord._id,
                    status: "error"
                });
                throw new ConvexError("Invalid response from image generation model");
            }

            console.log(`[ImageGen] Generated cartoon image URL: ${cartoonImageUrl}`);

            // Update the image record with the cartoon image URL
            await ctx.runMutation(internal.image.updateImageWithCartoonUrl, {
                imageId: imageRecord._id,
                cartoonImageUrl: cartoonImageUrl
            });
            console.log(`[ImageGen] Successfully updated image record with cartoon URL`);

            // Deduct credit from user
            await ctx.runMutation(internal.image.deductUserCredit, {
                userId: args.userId
            });

            console.log(`[ImageGen] SUCCESS - Image processing completed for imageUrl: ${args.imageUrl}`);
            return imageRecord._id;

        } catch (error: any) {
            console.error("[ImageGen] ERROR in main try/catch:", error?.message || error);
            if (error?.stack) {
                console.error("[ImageGen] ERROR stack:", error.stack);
            }
            // Update status to error
            await ctx.runMutation(internal.image.updateImageStatus, {
                imageId: imageRecord._id,
                status: "error"
            });
            throw new ConvexError(`Failed to generate image: ${error?.message || "Unknown error"}`);
        }
    }
});

// Helper function to get the appropriate prompt for each style
function getStylePrompt(style: string): string {
    const stylePrompts: { [key: string]: string } = {
        "simpsons": "Transform this into the iconic Simpsons cartoon style with yellow skin, overbite, and the distinctive Springfield aesthetic",
        "family-guy": "Convert this to the Family Guy cartoon style with bold outlines, simple shapes, and the distinctive Seth MacFarlane art style",
        "studio-ghibli": "Transform this into Studio Ghibli animation style with soft, painterly textures, warm colors, and the magical Miyazaki aesthetic",
        "disney": "Convert this to classic Disney animation style with vibrant colors, smooth lines, and the timeless Disney character aesthetic",
        "anime": "Transform this into anime style with large expressive eyes, detailed hair, and the distinctive Japanese animation aesthetic",
        "comic-book": "Convert this to comic book style with bold lines, halftone dots, and the classic superhero comic aesthetic",
        "south-park": "Transform this into South Park style with simple geometric shapes, flat colors, and the distinctive cutout paper aesthetic"
    };

    return stylePrompts[style] || "Make this a 90s cartoon";
}

// Helper query to get image by ID
export const getImageById = internalQuery({
    args: {
        imageId: v.id("images"),
    },
    handler: async (ctx, args) => {
        const image = await ctx.db.get(args.imageId);
        return image;
    }
});

// Helper query to get image by URL
export const getImageByUrl = internalQuery({
    args: {
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const images = await ctx.db
            .query("images")
            .filter(q => q.eq(q.field("originalImageUrl"), args.imageUrl))
            .collect();

        return images[0] || null;
    },
});

// Helper mutation to update image status
export const updateImageStatus = internalMutation({
    args: {
        imageId: v.id("images"),
        status: v.string(),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updateData = {
            status: args.status,
            updatedAt: Date.now(),
        };

        if (args.errorMessage) {
            console.error(`[updateImageStatus] Error for image ${args.imageId}: ${args.errorMessage}`);
        }

        await ctx.db.patch(args.imageId, updateData);
        return { success: true };
    },
});

// Update image with cartoon URL
export const updateImageWithCartoonUrl = internalMutation({
    args: {
        imageId: v.id("images"),
        cartoonImageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`[updateImageWithCartoonUrl] Updating image ${args.imageId} with cartoon URL: ${args.cartoonImageUrl}`);

        await ctx.db.patch(args.imageId, {
            cartoonImageUrl: args.cartoonImageUrl,
            status: "completed",
            updatedAt: Date.now(),
        });

        console.log(`[updateImageWithCartoonUrl] cartoonImageUrl saved: ${args.cartoonImageUrl}`);
        console.log(`[updateImageWithCartoonUrl] Image successfully updated`);
        return { success: true };
    },
});

// Deduct credit from user
export const deductUserCredit = internalMutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Get the user record
            const users = await ctx.db
                .query("users")
                .withIndex("by_user_id", (q) =>
                    q.eq("userId", args.userId)
                )
                .collect();

            const user = users[0];
            if (user) {
                // Use a type assertion to access imageCredits
                const userWithCredits = user as unknown as { imageCredits?: number };
                const currentCredits = userWithCredits.imageCredits || 0;

                if (currentCredits > 0) {
                    await ctx.db.patch(user._id, {
                        imageCredits: currentCredits - 1
                    } as any);

                    console.log(`[deductUserCredit] Deducted 1 credit from user ${args.userId}, remaining: ${currentCredits - 1}`);
                } else {
                    console.log(`[deductUserCredit] User ${args.userId} has no credits to deduct`);
                }
            }
        } catch (error) {
            console.error(`[deductUserCredit] Error deducting credit:`, error);
        }
    },
});

// Fix for currently stuck image (one-time use function)
export const fixStuckImage = mutation({
    args: {
        imageIdString: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
        try {
            const imageId = args.imageIdString as Id<"images">;
            const image = await ctx.db.get(imageId);
            
            if (!image) {
                return { success: false, message: "Image not found" };
            }

            await ctx.db.patch(imageId, {
                status: "completed",
                updatedAt: Date.now(),
            });

            return { success: true, message: "Image status updated to completed" };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
        }
    },
});




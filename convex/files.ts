import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// Generate a signed upload URL
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Generate a signed URL for uploading
    return await ctx.storage.generateUploadUrl();
  },
});

// Save the uploaded image information
export const saveUploadedImage = mutation({
  args: {
    storageId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // We don't need to check if the file exists
    // The file was just uploaded so it should exist

    // Generate a URL for the uploaded file
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    // Create a new image record with the URL
    const imageId = await ctx.db.insert("images", {
      userId: args.userId,
      originalStorageId: args.storageId,
      originalImageUrl: imageUrl || undefined, // Handle the case where URL could be null
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return imageId;
  },
});

// Get a URL to download an uploaded file with proper content type
export const getImageUrl = query({
  args: { 
    storageId: v.string(),
    contentType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    console.log(`[getImageUrl] Getting URL for storage ID: ${args.storageId}`);
    
    try {
      // Try to determine content type from the storageId or provided parameter
      let imageContentType = args.contentType || 'image/png';
      
      // Check the storage ID for file extension clues
      const storageId = args.storageId;
      if (storageId.includes('.jpg') || storageId.includes('.jpeg')) {
        imageContentType = 'image/jpeg';
      } else if (storageId.includes('.svg')) {
        imageContentType = 'image/svg+xml';
      } else if (storageId.includes('.png')) {
        imageContentType = 'image/png';
      }
      
      console.log(`[getImageUrl] Using content type: ${imageContentType}`);
      
      // Get URL from storage
      // Unfortunately, Convex storage.getUrl() doesn't accept content type parameters
      // But we're logging this information for debugging purposes
      const url = await ctx.storage.getUrl(args.storageId);
      
      if (!url) {
        console.log(`[getImageUrl] Failed to get URL for storage ID: ${args.storageId}`);
        return null;
      }
      
      console.log(`[getImageUrl] Generated URL: ${url}`);
      return url;
    } catch (error) {
      console.error(`[getImageUrl] Error getting URL:`, error);
      return null;
    }
  },
});

// Get all images for a user
export const getUserImages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return images;
  },
});

// Get a specific image by ID
export const getImageById = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }
    return image;
  },
});

// Get image by storage ID
export const getImageByStorageId = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.storageId))
      .collect();

    return images[0] || null;
  },
});

// Generate a cartoon version from original image
export const cartoonifyImage = mutation({
  args: { storageId: v.string(), style: v.string() },
  handler: async (ctx, args) => {
    // Find the image record by storage ID
    const images = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("originalStorageId"), args.storageId))
      .collect();

    const image = images[0];
    if (!image) {
      throw new ConvexError("Image record not found");
    }

    // Check if image is already being processed or completed
    if (image.status === "processing") {
      console.log(`[cartoonifyImage] Image ${image._id} is already being processed, skipping`);
      return { success: true, status: "processing" };
    }

    if (image.status === "completed" && image.cartoonImageUrl) {
      console.log(`[cartoonifyImage] Image ${image._id} is already completed, skipping`);
      return { success: true, status: "completed" };
    }

    // Update status to processing
    await ctx.db.patch(image._id, {
      status: "processing",
      updatedAt: Date.now(),
    });
    
    try {
      // Schedule the image generation task
      await ctx.scheduler.runAfter(0, internal.image.ImageGen, {
        imageUrl: image.originalImageUrl!,
        userId: image.userId,
        style: args.style
      });
      
      // The ImageGen action will update the image record when it completes
      return { success: true, status: "processing" };
    } catch (error) {
      console.error("[cartoonifyImage] Error scheduling ImageGen action:", error);
      
      // If scheduling fails, revert status to pending
      await ctx.db.patch(image._id, {
        status: "pending",
        updatedAt: Date.now()
        // Note: We can't store the error message since there's no field for it in the schema
      });
      
      throw new ConvexError("Failed to schedule image generation");
    }
  },
});



// Store a user record (typically called after sign-in)
export const storeUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    /**
     * Query the database for a user with the specified Clerk ID.
     * Uses the "by_user_id" index to find a unique user record.
     */
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    // Create a new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      userId: args.clerkId,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get all processing images for a user
export const getUserProcessingImages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all images that are in processing state for this user
    const processingImages = await ctx.db
      .query("images")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "processing")
        )
      )
      .collect();

    return processingImages;
  },
});

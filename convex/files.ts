import { ConvexError, v } from "convex/values";
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

// Get a signed URL to download an uploaded file
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
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
  args: { storageId: v.string() },
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
    
    // Update status to processing
    await ctx.db.patch(image._id, {
      status: "processing",
      updatedAt: Date.now(),
    });

    // In a real implementation, we would call an external API or ML model here
    // For demonstration purposes, we'll just use the original image as cartoon
    // In a real application:
    // 1. Process the image with an AI/ML model or external API
    // 2. Upload the processed image to storage
    // 3. Get a storage ID for the cartoon image
    
    // For this demo, we're reusing the original image/URL
    // In a real implementation, you would upload a new processed image
    const cartoonStorageId = image.originalStorageId;
    const cartoonImageUrl = image.originalImageUrl;
    
    // Update the record with the cartoon image information
    await ctx.db.patch(image._id, {
      status: "completed",
      cartoonStorageId: cartoonStorageId,
      cartoonImageUrl: cartoonImageUrl || undefined, // Handle the case where URL could be null
      updatedAt: Date.now(),
    });

    return { success: true };
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

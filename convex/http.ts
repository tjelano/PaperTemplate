import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { AiChat } from "./chat";
import { paymentWebhook } from "./transactions";
import { ConvexError } from "convex/values";

const http = httpRouter();

// Handle all OPTIONS requests with a wildcard route
http.route({
  pathPrefix: "/", // Match any path
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Get the origin from the request
    const origin = request.headers.get("Origin") || "*";
    
    return new Response(null, {
      status: 204, // No content
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Allow all common methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With", // Allow common headers
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }),
});

// Handle POST requests to chat endpoint
http.route({
  path: "/api/chat",
  method: "POST",
  handler: AiChat,
});

http.route({
    path: "/payments/webhook",
    method: "POST",
    handler: paymentWebhook,
  });
  

// Add a route to handle image file uploads
http.route({
  path: "/api/process-cartoon",
  method: "POST",
  handler: httpAction(async (_ctx, _request) => {
    try {
      // In a production implementation this would:
      // 1. Get the image from the request body
      // 2. Process the image through cartoon API (or ML model)
      // 3. Return the processed image
      
      // For this demo, we'll just simulate processing with a placeholder
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof ConvexError ? error.message : "Unknown error occurred" 
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
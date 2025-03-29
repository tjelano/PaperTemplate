import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { httpAction } from "./_generated/server";

export const AiChat = httpAction(async (_, req) => {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'),
        system: 'You are a helpful assistant.',
        messages,

        onFinish: (text) => {
            console.log("text", text);
        }
    });

    // Get the origin from the request
    const origin = req.headers.get("Origin") || "*";
    
    // Set complete CORS headers to match the OPTIONS handler
    return result.toDataStreamResponse({
        headers: new Headers({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }),
    });
});
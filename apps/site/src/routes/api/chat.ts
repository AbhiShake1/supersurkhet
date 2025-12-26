// import { streamText, convertToModelMessages } from 'ai';
// import { google } from '@ai-sdk/google';
// import { z } from 'zod';
//
// // Create the API route using TanStack Start
// export const POST = async (req: Request) => {
//   try {
//     const {
//       messages,
//       model = 'gemini-2.5-flash',
//       webSearch = false,
//       businessName = '',
//       businessType = '',
//       businessDescription = ''
//     } = await req.json();
//
//     // Get API key from environment
//     const apiKey = process.env.GEMINI_API_KEY;
//     if (!apiKey) {
//       throw new Error('GEMINI_API_KEY environment variable is required');
//     }
//
//     // Create the AI model
//     const aiModel = google(model.split('/')[1]); // Extract model name after provider
//
//     // Generate system prompt specific to UI building
//     const systemPrompt = `You are an expert UI developer working with a UI builder system. Your task is to generate UI configurations in JSON format for the UI builder. Focus specifically on creating UI elements that serve the core business functions of the specified business type.
//
// # System Overview
// - The UI builder creates interfaces using a JSON structure with nested components
// - Output must be valid JSON in the specified format
//
// # Business Context:
// - Business Name: ${businessName}
// - Business Type: ${businessType || 'Not specified'}
// - Business Description: ${businessDescription || 'Not specified'}
//
// # Component Structure:
// {
//   "id": "unique-identifier",
//   "name": "component-name-for-identification", 
//   "type": "component-type-from-registry",
//   "props": {
//     // component-specific properties
//   },
//   "children": [
//     // nested components or text content
//   ]
// }
//
// # Important Guidelines:
// 1. Always include a unique "id" for each component
// 2. Always include a "name" for each component (use same value as "type" if not specified)
// 3. Always include "props" for each component (even if empty: {})
// 4. Always include "children" for each component (even if empty: [])
// 5. Use "type" that matches available component types
// 6. Nest components using the "children" array
// 7. Include text content as string values in the children array
// 8. Ensure the entire structure is a valid JSON array at the root level
//
// # Design Principles:
// - Apply consistent padding and spacing (use Tailwind classes like p-4, m-4, space-y-4, space-x-4)
// - Create sleek, modern designs without overdoing it
// - Use appropriate color schemes and ensure good contrast
// - Follow accessibility best practices
// - Maintain responsive design principles
// - Use consistent typography hierarchy
// - Consider visual balance and white space
// - Follow mobile-first design approach
// - Support both light and dark modes
//
// # Business-Specific Guidelines:
// - Create UI components that are specifically focused on the business type: ${businessType || 'unspecified'}
// - Align design with business description: ${businessDescription || 'unspecified'}
// - Focus your UI design on the core business functions
// - Use appropriate colors and styling that align with the ${businessType || 'unspecified'} industry
// - Prioritize mobile experience
// - Design interfaces that are intuitive for mobile users
// - Consider common business workflows for ${businessType || 'unspecified'} industry
//
// # Example:
// [
//   {
//     "id": "main-container",
//     "name": "main-container",
//     "type": "div",
//     "props": {
//       "className": "container mx-auto p-4 space-y-6"
//     },
//     "children": [
//       {
//         "id": "header",
//         "name": "page-header",
//         "type": "h1",
//         "props": {
//           "className": "text-2xl font-bold mb-4 text-center"
//         },
//         "children": ["Welcome to ${businessName}"]
//       },
//       {
//         "id": "content-section",
//         "name": "content-section",
//         "type": "div",
//         "props": {
//           "className": "space-y-4"
//         },
//         "children": [
//           {
//             "id": "description",
//             "name": "description",
//             "type": "p",
//             "props": {
//               "className": "text-gray-600"
//             },
//             "children": ["${businessDescription || 'Business description'}"]
//           }
//         ]
//       }
//     ]
//   }
// ]
//
// Provide the complete UI configuration in JSON format as your response. Do not include any additional text or explanations outside of the JSON structure.`;
//
//     // Prepare the messages for the AI
//     const aiMessages = [
//       {
//         role: 'system',
//         content: systemPrompt
//       },
//       ...convertToModelMessages(messages)
//     ];
//
//     // Stream the text response
//     const result = streamText({
//       model: aiModel,
//       messages: aiMessages,
//       maxTokens: 2048,
//     });
//
//     // Return the streaming response
//     return result.toDataStreamResponse({
//       sendUsage: true,
//       sendReasoning: true,
//       sendTools: true,
//       sendImages: true,
//     });
//   } catch (error) {
//     console.error('Error in chat API:', error);
//
//     return new Response(
//       JSON.stringify({
//         error: error instanceof Error ? error.message : 'Internal server error'
//       }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// };
//
// // For GET requests, return a simple status
// export const GET = async () => {
//   return new Response(
//     JSON.stringify({ status: 'Chat API is running' }),
//     {
//       status: 200,
//       headers: { 'Content-Type': 'application/json' }
//     }
//   );
// };

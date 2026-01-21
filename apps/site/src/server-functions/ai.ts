// import { google } from "@ai-sdk/google";
import { createServerFn } from "@tanstack/react-start";
// import { convertToModelMessages, streamText } from "ai";
import z from "zod";
// import { createStreamableValue } from "@ai-sdk/rsc"

export const getBuilderChat = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    messages: z.array(z.string()),
    model: z.string().optional(),
    webSearch: z.boolean().optional(),
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    businessDescription: z.string().optional(),
  }))
  .handler(async ({
    data: {
      messages,
      model = 'gemini-2.5-flash',
      webSearch = false,
      businessName = '',
      businessType = '',
      businessDescription = '',
    }
  }) => {
    //     try {
    //       const apiKey = process.env.GEMINI_API_KEY;
    //       if (!apiKey) {
    //         throw new Error('GEMINI_API_KEY environment variable is required');
    //       }
    //
    //       const aiModel = google("gemini-2.0-flash-lite");
    //
    //       const systemPrompt = `You are an expert UI developer working with a UI builder system. Your task is to generate UI configurations in JSON format for the UI builder.
    //
    // # Business Context:
    // - Business Name: ${businessName}
    // - Business Type: ${businessType || 'Not specified'}
    // - Business Description: ${businessDescription || 'Not specified'}
    //
    // # Component Rules:
    // - Always include id, name, type, props, children
    // - Root must be a JSON array
    // - Output JSON only (no prose)
    //
    // # Design Guidelines:
    // - Mobile-first
    // - Accessible
    // - Clean, modern UI
    // - Tailwind-based spacing and layout
    // - Industry-aligned design (${businessType || 'unspecified'})
    // `;
    //       (async () => {
    //         const { textStream } = streamText({
    //           model: aiModel,
    //           prompt: prompt,
    //           messages: aiMessages,
    //         });
    //
    //         for await (const delta of textStream) {
    //           // 3. Update the value as it streams
    //           stream.update(delta);
    //         }
    //
    //         // 4. Mark it as finished
    //         stream.done();
    //       })();
    //
    //       const streamable = createStreamableValue()
    //       const aiMessages = [
    //         { role: 'system', content: systemPrompt },
    //         ...convertToModelMessages(messages),
    //       ];
    //
    //       const result = streamText({
    //         model: aiModel,
    //         messages: aiMessages,
    //         maxTokens: 2048,
    //       });
    //
    //       for await (const chunk of result?.fullStream) {
    //         streamable.append(chunk)
    //       }
    //
    //       streamable.done()
    //
    //       return streamable
    //
    //       // return result.toDataStreamResponse({
    //       //   sendUsage: true,
    //       //   sendReasoning: true,
    //       //   sendTools: true,
    //       //   sendImages: true,
    //       // });
    //     } catch (error) {
    //       console.error('Error in builder chat:', error);
    //
    //       // return new Response(
    //       //   JSON.stringify({
    //       //     error:
    //       //       error instanceof Error
    //       //         ? error.message
    //       //         : 'Internal server error',
    //       //   }),
    //       //   {
    //       //     status: 500,
    //       //     headers: { 'Content-Type': 'application/json' },
    //       //   }
    //       // );
    //     }
  });

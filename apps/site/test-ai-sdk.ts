import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

async function test() {
  const google = createGoogleGenerativeAI({ apiKey: 'test' });
  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Hello',
    });
    console.log(result);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();

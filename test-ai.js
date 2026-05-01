const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function test() {
  const google = createGoogleGenerativeAI({ apiKey: 'dummy-key' });
  const model = google('gemini-2.5-flash');
  
  try {
    const result = await generateText({
      model: model,
      prompt: 'Hello',
    });
    console.log(result);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();

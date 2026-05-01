import { testBoyaiConnection } from './src/server-functions/ai-proxy';

async function run() {
  try {
    const res = await testBoyaiConnection({ headers: { 'X-Boyai-Key': 'test' } });
    console.log(res);
  } catch (e) {
    console.error("CRASH:", e);
  }
}

run();

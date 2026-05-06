import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  const genAI = new GoogleGenerativeAI("your_temporary_api_key_here");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    await model.generateContent("hello");
  } catch (e) {
    console.log("TEMPORARY KEY ERROR:", e.message);
  }
}

run();

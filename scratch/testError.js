import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  const genAI = new GoogleGenerativeAI("AIzaSyDummyKeyThatIsInvalid12345");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    await model.generateContent("hello");
  } catch (e) {
    console.log("DUMMY KEY ERROR:", e.message);
  }
}

run();

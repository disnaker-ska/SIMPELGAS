import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
let key = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/VITE_GEMINI_API_KEY=(.*)/);
  if (match) key = match[1].trim();
}

if (!key) {
  console.log('API Key not found in .env');
  process.exit(1);
}

async function getModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

getModels();

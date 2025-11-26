import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { defaultData } from './seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  const dataPath = path.join(__dirname, '..', 'data', 'trails.json');
  await writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
  console.log(`Seeded ${dataPath} with default architect skill trails.`);
}

seed().catch(err => {
  console.error('Failed to seed data', err);
  process.exitCode = 1;
});

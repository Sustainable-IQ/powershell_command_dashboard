#!/usr/bin/env node

/**
 * Sanity check: Load catalog programmatically and print command count + first 3 IDs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('=== Catalog Programmatic Load Sanity Check ===\n');

const packsDir = path.join(rootDir, 'src/catalog/packs');
const packFiles = ['inventory.json', 'networking.json', 'startup.json', 'privacy.json'];

let allCommands = [];
let errors = [];

console.log('Loading packs...');
for (const packFile of packFiles) {
  const packPath = path.join(packsDir, packFile);

  try {
    const content = fs.readFileSync(packPath, 'utf-8');
    const pack = JSON.parse(content);

    if (pack.commands && Array.isArray(pack.commands)) {
      allCommands.push(...pack.commands);
      console.log(`  ✓ ${packFile}: ${pack.commands.length} commands`);
    } else {
      errors.push(`${packFile}: No commands array found`);
    }
  } catch (error) {
    errors.push(`${packFile}: ${error.message}`);
  }
}

console.log();

if (errors.length > 0) {
  console.error('Errors encountered:');
  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

console.log(`Total commands loaded: ${allCommands.length}`);
console.log();

if (allCommands.length >= 3) {
  console.log('First 3 command IDs:');
  for (let i = 0; i < 3; i++) {
    console.log(`  ${i + 1}. ${allCommands[i].id}`);
  }
} else {
  console.log('Warning: Less than 3 commands loaded');
}

console.log();
console.log('✓ Catalog loaded successfully');

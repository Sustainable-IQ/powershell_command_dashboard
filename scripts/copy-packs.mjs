#!/usr/bin/env node

/**
 * Pack Bundling Script
 * Copies src/catalog/packs/*.json → out/catalog/packs/*.json
 * Used during build to bundle command packs with extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const sourceDir = path.join(rootDir, 'src', 'catalog', 'packs');
const destDir = path.join(rootDir, 'out', 'catalog', 'packs');

console.log('=== Pack Bundling ===');
console.log(`Source: ${sourceDir}`);
console.log(`Destination: ${destDir}`);

// Verify source exists
if (!fs.existsSync(sourceDir)) {
  console.error(`❌ ERROR: Source directory not found: ${sourceDir}`);
  process.exit(1);
}

// Get pack files
const packFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));

if (packFiles.length === 0) {
  console.error(`❌ ERROR: No .json files found in ${sourceDir}`);
  process.exit(1);
}

console.log(`\nFound ${packFiles.length} pack(s) to copy:`);
packFiles.forEach(f => console.log(`  - ${f}`));

// Create destination directory
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`\n✓ Created destination: ${destDir}`);
}

// Copy packs
let copiedCount = 0;
let errors = [];

for (const packFile of packFiles) {
  const sourcePath = path.join(sourceDir, packFile);
  const destPath = path.join(destDir, packFile);

  try {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    // Validate JSON
    JSON.parse(content);

    fs.writeFileSync(destPath, content, 'utf-8');
    copiedCount++;
    console.log(`✓ Copied: ${packFile}`);
  } catch (error) {
    errors.push({ file: packFile, error: error.message });
    console.error(`✗ Failed to copy ${packFile}: ${error.message}`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Copied: ${copiedCount}/${packFiles.length}`);

if (errors.length > 0) {
  console.error(`Errors: ${errors.length}`);
  errors.forEach(({ file, error }) => {
    console.error(`  - ${file}: ${error}`);
  });
  process.exit(1);
}

console.log('✓ Pack bundling complete');

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(process.cwd());
const jsFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(full);
  }
}

walk(root);
for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

for (const file of ['data/config.json', 'data/categories.json', 'data/artworks.json', 'data/tags.json', 'package.json']) {
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

console.log('Comprobación completada: ' + jsFiles.length + ' archivos JavaScript y 5 JSON');

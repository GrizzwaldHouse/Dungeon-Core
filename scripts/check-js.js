// check-js.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep syntax coverage aligned with every project JavaScript module as files are added.

const { readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const sourceDirectories = ['client', 'scripts', 'server', 'shared', 'tests'];

// Only descend into source directories; installed dependencies and generated files are outside this list.
function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return javascriptFiles(fullPath);
      return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

const files = sourceDirectories.flatMap((directory) => javascriptFiles(path.join(root, directory)));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);

// Makes a consistent copy of the database while the wiki keeps running.
//   DATA_DIR=./data node tools/backup.js [backup-folder]
// Copies wiki.db (as a snapshot) and any pictures not already in the backup folder.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || 'data';
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const out = path.resolve(process.argv[2] || path.join(dataDir, 'backups'));
fs.mkdirSync(path.join(out, 'uploads'), { recursive: true });
const file = path.join(out, `wiki-${stamp}.db`);
new DatabaseSync(path.join(dataDir, 'wiki.db')).exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
let copied = 0;
for (const name of fs.readdirSync(path.join(dataDir, 'uploads'))) {
  const dest = path.join(out, 'uploads', name);
  if (!fs.existsSync(dest)) { fs.copyFileSync(path.join(dataDir, 'uploads', name), dest); copied++; }
}
console.log(`Saved ${file} and ${copied} new picture${copied === 1 ? '' : 's'} to ${out}/uploads`);

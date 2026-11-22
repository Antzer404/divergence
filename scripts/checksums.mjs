import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
const files = (await readdir('release')).filter(f => /\.(exe|zip|dmg|AppImage)$/.test(f)).sort();
const lines = [];
for (const file of files) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(`release/${file}`)) hash.update(chunk);
  lines.push(`${hash.digest('hex')}  ${file}`);
}
await writeFile('release/SHA256SUMS.txt', lines.join('\n') + '\n');
console.log(`Checksums written for ${files.length} artifacts.`);

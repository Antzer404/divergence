import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
await sharp('assets/icon.svg').resize(1024, 1024).png().toFile('assets/icon.png');
const png = await sharp('assets/icon.svg').resize(256, 256).png().toBuffer();
await writeFile('assets/icon.ico', await pngToIco(png));

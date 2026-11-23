import { readFile } from 'node:fs/promises';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
if (process.env.RELEASE_TAG !== `v${version}`) {
  throw new Error(`Release tag must match package version v${version}; received ${process.env.RELEASE_TAG}`);
}
console.log(`Building ${process.env.RELEASE_TAG} from its matching source.`);

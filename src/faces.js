import { writeFile, access, readFile } from "node:fs/promises";
import { logger } from "./logger.js";
import  MurmurHash3 from 'imurmurhash';


async function hash(buffer) {
  return MurmurHash3(buffer.toString()).result()
}

async function loadHashTable() {
  try {
    await access("./data.json");
    const file = await readFile("./data.json");
    return await JSON.parse(file);
  } catch {
    return {};
  }
}

async function writeHash(image_hash) {
  let hashes = await loadHashTable();

  if (image_hash in hashes) {
    return;
  }

  hashes[image_hash] = null;
  await writeFile("./data.json", JSON.stringify(hashes));
}

async function checkHash(image_hash) {
  let hashes = await loadHashTable();
  if (!(image_hash in hashes)) {
    logger.error(`${image_hash} not in hash table`);
    return None;
  }

  return hashes[image_hash];
}

async function writeName(image_hash, name) {
  let hashes = await loadHashTable();

  if (!(image_hash in hashes)) {
    logger.error(`Uknown hash ${image_hash}`);
    return;
  }

  hashes[image_hash] = name;
  await writeFile("./data.json", JSON.stringify(hashes));
}

export { hash, writeHash, checkHash, writeName };

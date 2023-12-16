import { writeFile, rm, access, readFile } from "node:fs/promises";
import { logger } from "./logger.js";

import { imageHash } from "image-hash";

async function hash(buffer, extension) {
  await writeFile("./temp." + extension, buffer);

  const image_hash = await new Promise((resolve, reject) => {
    imageHash("./temp." + extension, 8, false, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  }).catch((error) => {
    logger.error(error);
    return undefined;
  });

  await rm("./temp." + extension);

  return image_hash;
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

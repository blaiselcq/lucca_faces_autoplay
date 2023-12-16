const fs = require("node:fs/promises");

const { imageHash } = require("image-hash");

async function hash(buffer, content_type) {
  const extension = content_type.split("/")[1];
  await fs.writeFile("./temp." + extension, buffer);

  const image_hash = await new Promise((resolve, reject) => {
    imageHash("./temp." + extension, 8, false, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });

  await fs.rm("./temp." + extension);

  return image_hash;
}

async function loadHashTable() {
  try {
    await fs.access("./data.json");
    const file = await fs.readFile("./data.json");
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
  await fs.writeFile("./data.json", JSON.stringify(hashes));
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
  await fs.writeFile("./data.json", JSON.stringify(hashes));
}

module.exports = { hash, writeHash, checkHash, writeName };

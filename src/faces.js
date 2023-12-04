const fs = require("node:fs/promises");
const util = require("util");

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

function loadHashTable() {
  return fs.stat("./data.json").then(async () => {
    const file = await fs.readFile("./data.json");
    return JSON.parse(file);
  });
  // .catch(() => ({}));
}

async function writeHash(image_hash) {
  let hashes = await loadHashTable();

  if (image_hash in hashes) {
    return;
  }
  hashes[image_hash] = 0;
  await fs.writeFile("./data.json", JSON.stringify(hashes));
}

module.exports = { hash, writeHash };

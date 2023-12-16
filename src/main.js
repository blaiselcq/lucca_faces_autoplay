import dotenv from "dotenv";
dotenv.config();

import Player from "./player.js";

const player = new Player({ headless: false });

async function main(is_learning) {
  is_learning = process.env.LEARNING;

  do {
    await player.play(is_learning);
  } while (is_learning);
}

export { main };

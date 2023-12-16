import dotenv from "dotenv";
dotenv.config();

import Player from "./player.js";

const player = new Player({ headless: false });

player.play();

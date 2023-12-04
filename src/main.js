require("dotenv").config();

const Player = require("./player");

const player = new Player({ headless: false });

player.play();

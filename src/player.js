const logger = require("./logger");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

class Player {
  constructor(args) {
    this.browserOptions = {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: args.headless,
    };

    this.luccaFacesUrl = process.env.URL;
    if (!this.luccaFacesUrl) throw "No start url provided";

    this.userName = process.env.EMAIL;
    if (!this.userName) throw "No username provided";

    this.password = process.env.PASSWORD;
    if (!this.password) throw "No password provided";

    this.normalWait = { timeout: 20_000 };
  }

  async startupAndLogin() {
    logger.info(`Browser args : ${this.browserOptions.args.join(" ")}`);
    const browser = await puppeteer.launch(this.browserOptions);
    const page = await browser.newPage();

    await page.goto(this.luccaFacesUrl);

    await page.waitForSelector(".local-login", this.normalWait);

    logger.info("Reached login form");

    await page.type("[id^='username-input']", this.userName, {
      delay: 5,
    });
    await page.type("[id^='password-input']", this.password, {
      delay: 5,
    });

    await Promise.all([
      page.evaluate(() =>
        document.querySelector("[id^='login-submit-button']").click(),
      ),
      page.waitForNavigation(),
    ]);

    logger.info("Succesful log in");

    return page;
  }

  async startGame(page) {
    await page.waitForSelector("app-game .logo", this.normalWait);
    await page.waitForSelector(".launch-sentence", this.normalWait);

    await page.waitForTimeout(1_000);

    await page.click("app-game .logo .rotation-loader");

    await page.waitForSelector(".score-header", this.normalWait);
    logger.info("Started game");
  }

  async play() {
    const page = await this.startupAndLogin();

    await this.startGame(page);
  }
}

module.exports = Player;

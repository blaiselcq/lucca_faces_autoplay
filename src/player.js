const logger = require("./logger");

const { hash, writeHash, checkHash, writeName } = require("./faces");

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
    this.shortWait = { timeout: 5_000 };

    this.imagesSeen = {};
    this.lastQuestion = -1;
  }

  async waitHasSeenImage(image_number, timeout = 5_000) {
    const start_time = Date.now();

    while (!(image_number in this.imagesSeen)) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (Date.now() - start_time >= timeout) {
      logger.error(
        `Unable to find image ${image_number} within the specified time.`,
      );
      return None;
    }

    return this.imagesSeen[image_number];
  }

  async interceptRequests(page) {
    page.on("response", async (response) => {
      if (!response.url().endsWith("/picture")) {
        return;
      }
      logger.debug(`Intercept response for ${response.url()}`);
      if (!response.ok()) {
        logger.error(`Request for ${response.url()} did not succeed`);
        return;
      }

      const content_type = response.headers()["content-type"];
      if (!(content_type == "image/jpeg" || content_type == "image/png")) {
        logger.error(
          `Wrong image (${content_type}) type for ${response.url()}`,
        );
        return;
      }

      const image_number = response.url().split("/").at(-2);

      const image_hash = await hash(await response.buffer(), content_type);
      logger.debug(`Image hash: ${image_hash}`);

      this.imagesSeen[image_number] = image_hash;
      await writeHash(image_hash);
    });
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

  async getQuestionNumber(page) {
    await page.waitForSelector(".score-tracker.full-test", this.normalWait);
    return await page.$eval(".score-tracker.full-test", (element) =>
      [...element.querySelectorAll(".score-tracker-point")].findIndex((x) =>
        x.classList.contains("is-current"),
      ),
    );
  }

  async selectAnswer(page, name) {
    await page.$$eval(".answers .answer", (elements) =>
      elements.find((x) => x.innerText.includes(name)).click(),
    );

    logger.info(`Selecting answer "${name}"`);
  }

  async getSolution(page) {
    await page.waitForSelector(".answers .is-right", this.normalWait);

    return await page.$eval(
      ".answers .is-right",
      (element) => element.innerText,
    );
  }

  async tryGuess(page) {
    this.lastQuestion = await this.getQuestionNumber(page);
    if (this.lastQuestion > Object.keys(this.imagesSeen).length) {
      logger.debug(`Waiting image for question ${question_number + 1}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    await page.waitForSelector("app-question .image", this.shortWait);
    const image_url = await page.$eval(
      "app-question .image",
      (el) => el.style["background-image"],
    );

    await page.waitForSelector(".answers .answer", this.shortWait);
    const answers = await page.$$eval(".answers .answer", (elements) =>
      elements.map((x) => x.innerText),
    );

    const image_number = image_url.split("/").at(-2);

    const image_hash = await this.waitHasSeenImage(image_number);
    let name = await checkHash(image_hash);
    const name_known = name != null;

    if (!name_known) {
      logger.warn(`Image ${image_hash} not yet known, selecting first answer`);
      name = answers[0];
    }

    await this.selectAnswer(page, name);
    const right_answer = await this.getSolution(page);
    if (name !== right_answer) {
      logger.info(`Right answer was ${right_answer}`);
    }

    if (!name_known) {
      writeName(image_hash, right_answer);
    }

    await page.waitForResponse((response) =>
      response.url().includes("questions/next"),
    );
  }

  async play() {
    const page = await this.startupAndLogin();

    await this.interceptRequests(page);

    await this.startGame(page);
    while ((await page.$(".score-header")) != null) {
      await this.tryGuess(page);
    }
  }
}

module.exports = Player;

import BaseFarmer from "../lib/BaseFarmer.js";

export default class SpaceJumpFarmer extends BaseFarmer {
  static id = "spacejump";
  static title = "SpaceJump";
  static emoji = "🚀";
  static platform = "telegram";
  static type = "webapp";
  static host = "mywebapp.ru";
  static domains = ["mywebapp.ru"];
  static path = "/SpaceJump";
  static telegramLink = "https://t.me/spacejump_game_bot?start=SpaceJump2024";
  static interval = "*/5 * * * *";
  static singleton = true;
  static rating = 4;
  static cacheAuth = true;
  static cacheTelegramWebApp = true;
  static published = true;

  getReferralLink() {
    return this.getOriginalReferralLink();
  }

  getOriginalReferralLink() {
    return `https://t.me/spacejump_game_bot?start=${this.getUserId()}`;
  }

  async process() {
    this.logger.log(`SpaceJump Farmer running - game automates via content script`);
    this.logger.keyValue("Game URL", `https://${this.constructor.host}/SpaceJump`);
    this.logger.keyValue("Status", "Content script handles gameplay automation");
    return true;
  }

  async getCookies() {
    return [];
  }
}
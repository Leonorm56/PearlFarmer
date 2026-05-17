import BaseFarmer from "../lib/BaseFarmer.js";

const DEVICE_DATABASE = [
  { name: "Samsung Galaxy S25 Ultra", model: "SM-S938B", android: 15, chrome: 136 },
  { name: "Samsung Galaxy S24 Ultra", model: "SM-S928B", android: 14, chrome: 131 },
  { name: "Samsung Galaxy S23 Ultra", model: "SM-S918B", android: 14, chrome: 128 },
  { name: "Samsung Galaxy A56", model: "SM-A566B", android: 14, chrome: 131 },
  { name: "Google Pixel 10 Pro", model: "GC3VE", android: 16, chrome: 136 },
  { name: "Google Pixel 9 Pro", model: "GW5VE", android: 15, chrome: 134 },
  { name: "OnePlus 13", model: "CPH2653", android: 15, chrome: 134 },
  { name: "Xiaomi 14 Ultra", model: "2406APN5LG", android: 15, chrome: 131 },
  { name: "Xiaomi Poco F8 Pro", model: "2412DPC6AG", android: 15, chrome: 134 },
];

export default class SpaceJumpFarmer extends BaseFarmer {
  static id = "spacejump";
  static title = "SunSpace JUMP";
  static emoji = "🚀";
  static platform = "telegram";
  static type = "webapp";
  static host = "mywebapp.ru";
  static domains = ["mywebapp.ru"];
  static path = "/SpaceJump/index.html";
  static telegramLink = "https://t.me/sunspacejump_bot?start=SunSpaceJump2024";
  static interval = "*/10 * * * *";
  static singleton = true;
  static rating = 4;
  static cacheAuth = true;
  static cacheTelegramWebApp = true;
  static published = true;
  static autoStart = false;
  static localOnly = true; // Uses in-browser auto-play, no cloud API

  async start(signal) {
    this.logger.log("=== SpaceJump Farmer (Local Mode) ===");
    this.logger.log("Use 'Start Auto-Play' button for in-browser automation");
    this.logger.log("No cloud API calls needed - runs entirely in browser");
    await new Promise((resolve) => {
      if (signal.aborted) return resolve();
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
    this.logger.log("SpaceJump Farmer stopped.");
    return true;
  }

  getReferralLink() {
    return "https://t.me/sunspacejump_bot?start=SunSpaceJump2024";
  }

  getOriginalReferralLink() {
    return "https://t.me/sunspacejump_bot?start=SunSpaceJump2024";
  }

  configureDevice() {
    const sessionKey = `spacejump_device_${this.getUserId()}`;
    let device = null;
    try { device = this.storage?.get?.(sessionKey); } catch {}
    
    if (!device) {
      const randomIdx = Math.floor(Math.random() * DEVICE_DATABASE.length);
      device = DEVICE_DATABASE[randomIdx];
      try { this.storage?.set?.(sessionKey, device); } catch {}
    }

    this.device = device;
    this.logger.log(`Device: ${device.name} (Android ${device.android})`);
    return device;
  }

  async process() {
    if (this.constructor.localOnly) {
      this.logger.log(`=== Space Jump Farmer (Local Mode) ===`);
      this.logger.log("Use 'Start Auto-Play' button for in-browser automation");
      return true;
    }
    return true;
  }

  async getCookies() {
    return [];
  }

  createTools() {
    return [
      {
        name: "Game Status",
        list: [
          {
            id: "status",
            icon: "info",
            title: "Check Status",
            action: async () => {
              try {
                const raw = localStorage.getItem("spacejumpUserData");
                const userData = raw ? JSON.parse(raw) : null;
                if (userData) {
                  return {
                    success: true,
                    coin: userData.coin || 0,
                    bill: userData.bill || 0,
                    games: userData.games_amount || 0,
                  };
                }
                return { success: false, error: "No game data yet" };
              } catch (err) {
                return { success: false, error: err.message };
              }
            },
            dispatch: true,
          },
        ],
      },
    ];
  }
}
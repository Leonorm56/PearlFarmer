import BaseFarmer from "../lib/BaseFarmer.js";

const API_BASE = "https://jump.mywebapp.ru";
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

function generateUserAgent(device) {
  return `Mozilla/5.0 (Linux; Android ${device.android}; ${device.model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${device.chrome}.0.0.0 Mobile Safari/537.36 Telegram-Android/9.5`;
}

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

  getReferralLink() {
    return this.getOriginalReferralLink();
  }

  getOriginalReferralLink() {
    return `https://t.me/sunspacejump_bot?start=${this.getUserId()}`;
  }

  configureApi() {
    const sessionKey = `spacejump_device_${this.getUserId()}`;
    let device = null;
    try { device = this.storage?.get?.(sessionKey); } catch {}
    
    if (!device) {
      const randomIdx = Math.floor(Math.random() * DEVICE_DATABASE.length);
      device = DEVICE_DATABASE[randomIdx];
      try { this.storage?.set?.(sessionKey, device); } catch {}
    }

    this.device = device;
    this.userAgent = generateUserAgent(device);
    this.logger.log(`Device: ${device.name} (Android ${device.android})`);
    
    const interceptor = this.api.interceptors.request.use((config) => {
      config.url = API_BASE + config.url;
      config.headers["User-Agent"] = this.userAgent;
      config.headers["X-Requested-With"] = "org.telegram.messenger";
      return config;
    });
    return () => this.api.interceptors.request.eject(interceptor);
  }

  async login(signal) {
    const user = this.getTelegramUser();
    const username = user?.first_name || "Player";
    const language = user?.language_code || "en";
    const deviceId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    this.deviceId = deviceId;
    
    const response = await this.api.post("/spacer/login", {
      username,
      language,
      device_id: deviceId,
    }, { signal });
    
    this.uniqueId = response.data.unique_id;
    this.logger.log(`Logged in: ${username}`);
    return response.data;
  }

  async getUserInfo(signal) {
    const response = await this.api.get("/spacer/get_user_info", { signal });
    const data = response.data;
    this.currentCoin = data.coin;
    this.logger.log(`User: coin=${data.coin}, bill=${data.bill}, games=${data.games_amount}`);
    return data;
  }

  async startGame(skin = "Ninja1", signal) {
    const response = await this.api.post("/spacer/start", {
      skin,
      inventory: [],
    }, { signal });
    
    this.gameUuid = response.data.game_uuid;
    this.logger.log(`Game started: uuid=${this.gameUuid}`);
    return response.data;
  }

  async finishGame(score, signal) {
    const response = await this.api.post("/spacer/finish", {
      result: score,
    }, { signal });
    
    const data = response.data;
    this.currentCoin = data.user.coin;
    this.lastScore = score;
    this.logger.log(`Score: ${score} | Coins: ${data.user.coin} | Games: ${data.user.games_amount}`);
    return data;
  }

  async getStatus() {
    const cleanup = this.configureApi();
    try {
      await this.login(this.signal);
      const userInfo = await this.getUserInfo(this.signal);
      return {
        coin: userInfo.coin,
        bill: userInfo.bill,
        games: userInfo.games_amount,
        lastScore: this.lastScore || 0,
        success: true,
      };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      cleanup();
    }
  }

  async process() {
    this.logger.log(`=== Space Jump Farmer ===`);

    const cleanup = this.configureApi();
    const gamesToPlay = 3;
    
    try {
      await this.login(this.signal);
      const userInfo = await this.getUserInfo(this.signal);
      
      this.logger.log(`Starting ${gamesToPlay} games...`);
      
      for (let i = 0; i < gamesToPlay; i++) {
        if (this.signal.aborted) break;
        
        await this.startGame("Ninja1", this.signal);
        
        await this.utils.delayForSeconds(1, { signal: this.signal });
        
        const score = Math.floor(Math.random() * 400) + 100;
        await this.finishGame(score, this.signal);
        
        await this.utils.delayForSeconds(0.5, { signal: this.signal });
      }
      
      const finalInfo = await this.getUserInfo(this.signal);
      this.logger.log(`Done! Total coins: ${finalInfo.coin}`);
      
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "CanceledError") {
        this.logger.error("Error:", err.message);
      }
    } finally {
      cleanup();
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
              const result = await this.getStatus();
              if (result.success) {
                return { 
                  success: true, 
                  coin: result.coin, 
                  games: result.games,
                  lastScore: result.lastScore 
                };
              }
              return { success: false, error: result.error };
            },
            dispatch: true,
          },
        ],
      },
    ];
  }
}
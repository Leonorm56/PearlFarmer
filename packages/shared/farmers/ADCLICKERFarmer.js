import { Api } from "telegram";
import BaseDirectFarmer from "../lib/BaseDirectFarmer.js";

const CHANNEL_LINKS = [
  "https://t.me/AdclickersbotGroup",
  "https://t.me/adclickersbotchannel",
  "https://t.me/brand_awareness",
  "https://t.me/taskonlinebotChannel",
  "https://t.me/gxgsport",
];

const SUPPORTED_TASKS = ["Join Chats", "View Posts", "Message Bots"];

export default class ADCLICKERFarmer extends BaseDirectFarmer {
  static id = "adclicker";
  static title = "ADCLICKER";
  static emoji = "🤖";
  static telegramLink = "https://t.me/Adclickersbot";
  static interval = "*/15 * * * *";
  static host = "";
  static domains = [];
  static singleton = true;
  static rating = 3;

  async process() {
    await this.executeTask("Start Bot", () => this.sendStart());
    await this.logUserInfo();
    await this.executeTask("Subscribe to Channels", () => this.subscribeToChannels());
    await this.executeTask("Verify", () => this.verifyAccount());
    await this.executeTask("Tasks", () => this.runAllTasks());
  }

  async logUserInfo() {
    this.logger.newline();

    try {
      const me = await this.client.getMe();
      this.logger.keyValue("User", `${me.username || me.firstName || "(no-name)"} (${me.id})`);
    } catch {
      this.logCurrentUser();
    }

    let balance = "—";
    try {
      const msgs = await this.client.getMessages(this.entity, { limit: 5 });
      for (const msg of msgs) {
        const m = (msg.message || "").match(/Main Balance\s*:\s*([\d.]+)\s*USD/);
        if (m) { balance = `${m[1]} USD`; break; }
      }
    } catch {}
    this.logger.keyValue("Balance", balance);
  }

  async subscribeToChannels() {
    for (const link of CHANNEL_LINKS) {
      if (this.signal.aborted) break;
      await this.joinWithCheck(link);
      await this.utils.delayForSeconds(3, { signal: this.signal });
    }
  }

  async joinWithCheck(link) {
    try {
      const name = link.replace("https://t.me/", "");
      const entity = await this.client.getEntity(name);
      await this.client.invoke(
        new Api.channels.GetParticipant({ channel: entity, participant: "me" }),
      );
      this.logger.info(`${name} - Already joined`);
    } catch {
      this.logger.info(`${link} - Joining...`);
      await this.joinTelegramLink(link);
    }
  }

  async verifyAccount() {
    let message = this.lastMessage;
    if (!message) return;

    const hasMenu = message.buttons?.flat().some(
      (btn) => btn.text?.includes("Earnings") || btn.text?.includes("Ads"),
    );
    if (hasMenu) return;

    const gxgsport = await this.client.getEntity("gxgsport_bot");
    const msgs = await this.client.getMessages(gxgsport, { limit: 1 });
    if (!msgs.length) return;

    const msg = msgs[0];
    const age = Date.now() / 1000 - msg.date;
    if (age > 10) {
      this.logger.warn(`@gxgsport_bot latest msg is ${Math.round(age)}s old (max 10s)`);
      return;
    }

    this.logger.info("Forwarding message to verify...");
    await this.waitForReply(
      () => this.client.forwardMessages(this.entity, {
        messages: [msg.id],
        fromPeer: gxgsport,
      }),
      { timeout: 20000, filter: (msg) => msg.buttonCount > 0 },
    );
  }

  async navigateToEarnings() {
    let message = this.lastMessage;
    if (!message) return;

    const allBtns = message.buttons?.flat().map((b) => ({ text: b.text })) || [];

    const earnBtn = allBtns.find((b) => b.text.includes("Earnings"));
    if (!earnBtn) {
      message = await this.sendStart();
    }

    try {
      await message.click({ text: (input) => input.includes("Earnings") });
    } catch (error) {
      this.logger.warn(`Earnings click: ${error.message}`);
    }

    await this.utils.delayForSeconds(2, { signal: this.signal });

    try {
      const msgs = await this.client.getMessages(this.entity, { limit: 1 });
      if (msgs.length > 0) {
        this.lastMessage = msgs[0];
        const b2 = msgs[0].buttons?.flat().map((b) => b.text) || [];
        this.logger.info(`After Earnings: "${msgs[0].message?.slice(0, 100)}" buttons: ${JSON.stringify(b2)}`);
        return msgs[0];
      }
    } catch {}

    return this.lastMessage;
  }

  async showBalance(message) {
    if (!message?.message) return;
    const match = message.message.match(/Main Balance\s*:\s*([\d.]+)\s*USD/);
    if (match) {
      this.logger.keyValue("BALANCE", `${match[1]} USD`);
    }
  }

  async runAllTasks() {
    let message = await this.navigateToEarnings();
    if (!message) return;

    await this.showBalance(message);

    if (message.message?.includes("No tasks are available")) {
      this.logger.info("No tasks available");
      return;
    }

    for (const taskType of SUPPORTED_TASKS) {
      while (!this.signal.aborted) {
        const btn = message.buttons?.flat().find(
          (b) => b.text?.includes(taskType),
        );
        if (!btn) break;

        this.logger.info(`Processing: ${taskType}`);

        try {
          const isMessageBots = taskType.includes("Message Bots");
          const taskMsg = await this.clickButton(message, btn.text, {
            hasButtons: !isMessageBots,
          });

          // No more tasks available
          if (taskMsg.message?.includes("No tasks")) {
            this.logger.info(`No more ${taskType} tasks`);
            break;
          }

          let reward = taskMsg;
          if (!taskMsg.message?.includes("✅ Success")) {
            reward = await this.executeTaskType(taskType, taskMsg);
          }

          if (!reward) {
            this.logger.info(`No reward from ${taskType}, moving on`);
            break;
          }

          await this.showBalance(reward);
          this.logger.success(`Done ${taskType}`);
          message = await this.navigateToEarnings();
        } catch (error) {
          this.logger.warn(`Failed ${taskType}: ${error.message}`);
          message = await this.navigateToEarnings();
          break;
        }

        await this.utils.delayForSeconds(3, { signal: this.signal });
      }
    }
  }

  async executeTaskType(taskName, message) {
    if (taskName.includes("Message Bots")) {
      return this.handleMessageBots(message);
    }

    const btns = message.buttons?.flat().map((b) => ({ text: b.text, url: !!b.url })) || [];
    this.logger.info(`${taskName} msg: "${message.message?.slice(0, 120)}" btns: ${JSON.stringify(btns)}`);

    const urlButtons = message.buttons?.flat().filter((btn) => btn.url) || [];
    for (const btn of urlButtons) {
      await this.joinWithCheck(btn.url);
      await this.utils.delayForSeconds(3, { signal: this.signal });
    }

    // Click non-URL action button (e.g. 👁️ View Post) before confirming
    if (!urlButtons.length) {
      const actionBtn = message.buttons?.flat().find(
        (b) => !b.url && !b.text?.includes("✅") && !b.text?.includes("🔴") && !b.text?.includes("⏩"),
      );
      if (actionBtn) {
        await message.click({ text: (input) => input.includes(actionBtn.text) });
        await this.utils.delayForSeconds(2, { signal: this.signal });
      }
    }

    const confirmBtn = btns.find((b) => b.text.includes("✅"));
    if (!confirmBtn) { this.logger.info("✅ confirm btn not found"); return null; }

    await message.click({ text: (input) => input.includes("✅") });
    await this.utils.delayForSeconds(2, { signal: this.signal });

    try {
      const msgs = await this.client.getMessages(this.entity, { limit: 1 });
      if (msgs.length > 0) {
        this.lastMessage = msgs[0];
        return msgs[0];
      }
    } catch {}

    return this.lastMessage;
  }

  async handleMessageBots(taskMsg) {
    const btns = taskMsg?.buttons?.flat().map((b) => ({ text: b.text, url: !!b.url })) || [];
    this.logger.info(`Message Bots msg: "${taskMsg?.message?.slice(0, 120)}" btns: ${JSON.stringify(btns)}`);

    // Find the target bot from the "✉️ Message Bot" button
    const msgBtn = taskMsg?.buttons?.flat().find(
      (b) => b.text?.includes("✉️") || b.text?.includes("Message Bot"),
    );
    if (!msgBtn) {
      this.logger.warn("No Message Bot button found");
      return null;
    }

    let targetBot;
    if (msgBtn.url) {
      const match = msgBtn.url.match(/t\.me\/([a-zA-Z0-9_]+)/);
      if (!match) { this.logger.warn(`Could not parse URL: ${msgBtn.url}`); return null; }
      targetBot = match[1];
    } else {
      this.logger.warn("Message Bot button has no URL");
      return null;
    }

    let targetEntity;
    try { targetEntity = await this.client.getEntity(targetBot); }
    catch { this.logger.warn(`Could not find bot @${targetBot}`); return null; }

    // Send /start to the target bot and get a fresh message
    this.logger.info(`Messaging @${targetBot}...`);
    await this.client.sendMessage(targetEntity, { message: "/start" });
    await this.utils.delayForSeconds(3, { signal: this.signal });

    const botMsgs = await this.client.getMessages(targetEntity, { limit: 1 });
    if (!botMsgs.length) { this.logger.warn(`No response from @${targetBot}`); return null; }

    const msgToForward = botMsgs[0];
    const age = Date.now() / 1000 - msgToForward.date;
    if (age > 13) {
      this.logger.warn(`@${targetBot} response is ${Math.round(age)}s old (max 13s)`);
      return null;
    }

    // Forward the target bot's response to adclickersbot
    this.logger.info("Forwarding bot response to @adclickersbot...");
    const fwdMsg = await this.waitForReply(
      () => this.client.forwardMessages(this.entity, {
        messages: [msgToForward.id],
        fromPeer: targetEntity,
      }),
      { timeout: 20000, hasButtons: false },
    );

    // Click ✅ Started to confirm
    const confirmBtn = taskMsg?.buttons?.flat().find((b) => b.text?.includes("✅"));
    if (confirmBtn) {
      await taskMsg.click({ text: (input) => input.includes("✅") });
      await this.utils.delayForSeconds(2, { signal: this.signal });
    }

    try {
      const msgs = await this.client.getMessages(this.entity, { limit: 1 });
      if (msgs.length > 0) { this.lastMessage = msgs[0]; return msgs[0]; }
    } catch {}

    return fwdMsg || this.lastMessage;
  }

  createTools() {
    return [
      {
        name: "Tasks",
        list: [
          {
            id: "claim-all-tasks",
            icon: "tasks",
            title: "Claim All Tasks",
            action: this.runAllTasks.bind(this),
            dispatch: false,
          },
        ],
      },
    ];
  }
}

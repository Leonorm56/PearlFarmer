import { Api } from "telegram";
import BaseDirectFarmer from "../lib/BaseDirectFarmer.js";

const CHANNEL_LINKS = [
  "https://t.me/AdclickersbotGroup",
  "https://t.me/adclickersbotchannel",
  "https://t.me/brand_awareness",
  "https://t.me/taskonlinebotChannel",
  "https://t.me/AdclickersbotPaymentChannel",
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
    if (age > 30) {
      this.logger.warn(`@gxgsport_bot latest msg is ${Math.round(age)}s old (max 30s)`);
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
    const isTaskList = (msg) => {
      if (!msg?.buttons) return false;
      const btns = msg.buttons.flat().map((b) => b.text);
      return SUPPORTED_TASKS.some((t) => btns.some((b) => b.includes(t)));
    };

    // Already on the task list — return as-is
    if (isTaskList(this.lastMessage)) return this.lastMessage;

    // If we see "Earnings" button, click it directly instead of /start
    const curBtns = this.lastMessage?.buttons?.flat().map((b) => b.text) || [];
    const earnBtn = curBtns.find((b) => b.includes("Earnings"));
    if (earnBtn) {
      try {
        await this.lastMessage.click({ text: (input) => input.includes("Earnings") });
        await this.utils.delayForSeconds(2, { signal: this.signal });
        const msgs = await this.client.getMessages(this.entity, { limit: 1 });
        if (msgs.length) {
          this.lastMessage = msgs[0];
          if (isTaskList(msgs[0])) return msgs[0];
        }
      } catch {}
    }

    // Fallback: send /start and navigate to Earnings
    for (let attempt = 0; attempt < 3; attempt++) {
      const menu = await this.sendStart();
      if (!menu) continue;

      const menuBtns = menu.buttons?.flat().map((b) => b.text) || [];
      const eBtn = menuBtns.find((b) => b.includes("Earnings"));
      if (!eBtn) continue;

      try {
        await menu.click({ text: (input) => input.includes("Earnings") });
      } catch {
        continue;
      }
      await this.utils.delayForSeconds(2, { signal: this.signal });

      const msgs = await this.client.getMessages(this.entity, { limit: 1 });
      if (!msgs.length) continue;

      const msg = msgs[0];
      this.lastMessage = msg;
      const btns = msg.buttons?.flat().map((b) => b.text) || [];
      this.logger.info(`After Earnings: "${msg.message?.slice(0, 100)}" buttons: ${JSON.stringify(btns)}`);

      if (isTaskList(msg)) return msg;

      const homeBtn = btns.find((b) => b.includes("Home") || b.includes("Back"));
      if (!homeBtn) continue;

      await msg.click({ text: (input) => input.includes(homeBtn) });
      await this.utils.delayForSeconds(2, { signal: this.signal });
    }

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
      this.logger.info("No tasks available — checking for notification toggle");
      const notifBtn = message.buttons?.flat().find(
        (b) => b.text?.includes("🔔"),
      );
      if (notifBtn) {
        this.logger.info(`Clicking notification button: "${notifBtn.text}"`);
        await message.click({ text: notifBtn.text });
        await this.utils.delayForSeconds(2, { signal: this.signal });
      }
      return;
    }

    const MAX_PER_TASK = 3;

    for (const taskType of SUPPORTED_TASKS) {
      let processed = 0;
      while (!this.signal.aborted && processed < MAX_PER_TASK) {
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
          processed++;

          // Navigate to Earnings to get fresh task list
          message = await this.navigateToEarnings();
          if (!message) break;
        } catch (error) {
          this.logger.warn(`Failed ${taskType}: ${error.message}`);
          message = await this.navigateToEarnings();
          break;
        }

        await this.utils.delayForSeconds(3, { signal: this.signal });
      }

      message = await this.navigateToEarnings();
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

    // Click action button (e.g. 👁️ View Post) before confirming
    const actionBtn = message.buttons?.flat().find(
      (b) => !b.url && !b.text?.includes("✅") && !b.text?.includes("🔴") && !b.text?.includes("⏩") && !b.text?.includes("✉️"),
    );
    if (actionBtn) {
      await message.click({ text: (input) => input.includes(actionBtn.text) });
      await this.utils.delayForSeconds(2, { signal: this.signal });
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
    this.logger.info(`Message Bots msg: "${taskMsg?.message?.slice(0, 400)}" btns: ${JSON.stringify(btns)}`);

    const msgBtn = taskMsg?.buttons?.flat().find(
      (b) => b.text?.includes("✉️") || b.text?.includes("Message Bot"),
    );
    if (!msgBtn) { this.logger.warn("No Message Bot button found"); return null; }

    // Figure out target bot from URL
    let targetBot;
    if (msgBtn.url) {
      const match = msgBtn.url.match(/t\.me\/([a-zA-Z0-9_]+)/);
      if (match) targetBot = match[1];
    }
    if (!targetBot) {
      const match = taskMsg?.message?.match(/@([a-zA-Z0-9_]+bot)/i);
      if (match) targetBot = match[1];
    }
    if (!targetBot) { this.logger.warn("Could not determine target bot"); return null; }
    this.logger.info(`Target bot: @${targetBot}`);

    // 1. Click ✉️ Message Bot
    this.logger.info("Clicking ✉️ Message Bot...");
    await taskMsg.click({ text: (input) => input.includes("✉️") });

    // 2. Press ✅ Started
    this.logger.info("Pressing ✅ Started...");
    await this.utils.delayForSeconds(2, { signal: this.signal });
    await taskMsg.click({ text: (input) => input.includes("✅") });

    // 3. Wait for "🔎 Forward..." prompt, then start the target bot and forward
    this.logger.info("Waiting for forward prompt...");
    for (let i = 0; i < 15; i++) {
      if (this.signal.aborted) return null;
      const msgs = await this.client.getMessages(this.entity, { limit: 5 });
      if (msgs.some((m) => m.message?.includes("🔎 Forward any message from"))) {
        this.logger.info("Forward prompt received, starting target bot...");
        let targetEntity;
        try { targetEntity = await this.client.getEntity(targetBot); }
        catch { this.logger.warn(`Could not find bot @${targetBot}`); return null; }

        await this.client.sendMessage(targetEntity, { message: "/start" });
        await this.utils.delayForSeconds(3, { signal: this.signal });

        const botMsgs = await this.client.getMessages(targetEntity, { limit: 1 });
        if (!botMsgs.length) { this.logger.warn(`No messages from @${targetBot}`); return null; }

        this.logger.info(`Forwarding @${targetBot} message...`);
        const fwdMsg = await this.waitForReply(
          () => this.client.forwardMessages(this.entity, {
            messages: [botMsgs[0].id],
            fromPeer: targetEntity,
          }),
          { timeout: 30000, hasButtons: true },
        );

        try {
          const msgs = await this.client.getMessages(this.entity, { limit: 1 });
          if (msgs.length > 0) { this.lastMessage = msgs[0]; return msgs[0]; }
        } catch {}

        return fwdMsg || this.lastMessage;
      }
      await this.utils.delayForSeconds(2, { signal: this.signal });
    }

    this.logger.warn("Forward prompt not received");
    return null;

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

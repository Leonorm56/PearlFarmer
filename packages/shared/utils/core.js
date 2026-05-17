import axios from "axios";

export { v4 as uuid } from "uuid";

export { default as md5 } from "md5";

export * as changeCase from "change-case";

export const randomItem = (items) =>
  items[Math.floor(Math.random() * items.length)];

export function randomPercent(value, min = 0, max = 100) {
  return Math.floor(
    (value * (min + Math.floor(Math.random() * (max - min)))) / 100,
  );
}

export function chance(percent) {
  return Math.random() < percent / 100;
}

export function shuffle(array) {
  const results = [...array];
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }
  return results;
}

export function extraGamePoints(points, percent = 20) {
  return points + randomPercent(points, 0, percent);
}

/** Fetch Content */
export function fetchContent(url, ...options) {
  return axios.get(url, ...options).then((res) => res.data);
}

/** With Value */
export function withValue(value, callback) {
  return callback ? callback(value) : (callback) => callback(value);
}

/** Tap Value */
export function tapValue(value, callback) {
  if (callback) {
    callback(value);
  }
  return callback
    ? value
    : (callback) => {
        callback(value);
        return value;
      };
}

/** Format number
 * @param {number} value
 */
export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export const DEVICE_DATABASE = [
  { name: "Samsung Galaxy S25 Ultra", model: "SM-S938B", android: 15, chrome: 136 },
  { name: "Samsung Galaxy S24 Ultra", model: "SM-S928B", android: 14, chrome: 131 },
  { name: "Samsung Galaxy S23 Ultra", model: "SM-S918B", android: 14, chrome: 128 },
  { name: "Samsung Galaxy A56", model: "SM-A566B", android: 14, chrome: 131 },
  { name: "Samsung Galaxy A36", model: "SM-A366B", android: 14, chrome: 131 },
  { name: "Samsung Galaxy A16 5G", model: "SM-A166B", android: 14, chrome: 128 },
  { name: "Google Pixel 10 Pro", model: "GC3VE", android: 16, chrome: 136 },
  { name: "Google Pixel 9 Pro", model: "GW5VE", android: 15, chrome: 134 },
  { name: "Google Pixel 8 Pro", model: "GQ4V6", android: 15, chrome: 131 },
  { name: "Google Pixel 7a", model: "GQKV3", android: 14, chrome: 128 },
  { name: "OnePlus 13", model: "CPH2653", android: 15, chrome: 134 },
  { name: "OnePlus 12", model: "CPH2609", android: 14, chrome: 131 },
  { name: "OnePlus Nord 4", model: "CPH2641", android: 14, chrome: 131 },
  { name: "Xiaomi 14 Ultra", model: "2406APN5LG", android: 15, chrome: 131 },
  { name: "Xiaomi Redmi Note 14 Pro+ 5G", model: "2411DRK6G", android: 14, chrome: 131 },
  { name: "Xiaomi Poco F8 Pro", model: "2412DPC6AG", android: 15, chrome: 134 },
  { name: "Motorola Edge 60 Pro", model: "XT2527", android: 15, chrome: 134 },
  { name: "Honor 400", model: "HN", android: 15, chrome: 131 },
  { name: "OPPO Find X9 Pro", model: "CPH2655", android: 15, chrome: 134 },
  { name: "vivo X100 Pro", model: "PD2324", android: 14, chrome: 128 },
  { name: "Samsung Galaxy Z Fold 6", model: "SM-F956B", android: 14, chrome: 131 },
  { name: "Nothing Phone (3a)", model: "N/A", android: 15, chrome: 131 },
  { name: "Infinix Note 40 Pro", model: "X6851", android: 14, chrome: 128 },
  { name: "Realme GT 8 Pro", model: "RMX5011", android: 15, chrome: 134 },
];

export const TELEGRAM_VERSIONS = ["9.5", "9.4", "9.3", "9.2", "9.1", "9.0", "8.0", "7.5"];

export function getDeviceForSession(userId) {
  const hash = String(userId).split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const index = Math.abs(hash) % DEVICE_DATABASE.length;
  return DEVICE_DATABASE[index];
}

export function getTelegramVersion(userId) {
  const index = Math.abs(parseInt(String(userId).replace(/\D/g, ''), 10) || 0) % TELEGRAM_VERSIONS.length;
  return TELEGRAM_VERSIONS[index];
}

export function generateAndroidUserAgent(device, telegramVersion) {
  const tgVersion = telegramVersion || "9.5";
  const androidVersion = device.android || 14;
  const chromeVersion = device.chrome || 131;
  return `Mozilla/5.0 (Linux; Android ${androidVersion}; ${device.model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Mobile Safari/537.36 Telegram-Android/${tgVersion}`;
}

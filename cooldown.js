const ms = require("ms");

function checkCooldown(lastUsed, cooldownMs) {
  if (!lastUsed) return { onCooldown: false };
  const now = Date.now();
  const lastTime = new Date(lastUsed).getTime();
  const diff = now - lastTime;
  if (diff < cooldownMs) {
    const remaining = cooldownMs - diff;
    return { onCooldown: true, remaining, readableTime: formatTime(remaining) };
  }
  return { onCooldown: false };
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const COOLDOWNS = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  WORK: 30 * 60 * 1000,
  FORAGE: 5 * 60 * 1000,
  FISH: 10 * 60 * 1000,
  HUNT: 15 * 60 * 1000,
  ROB: 60 * 60 * 1000,
  AUTOHUNT: 60 * 60 * 1000,
};

module.exports = { checkCooldown, formatTime, COOLDOWNS };

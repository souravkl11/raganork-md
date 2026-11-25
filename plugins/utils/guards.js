const dns = require("node:dns").promises;
const fs = require("node:fs");
const net = require("node:net");
const config = require("../../config");
const context = require("../../core/context");
const { uniqueTempPath } = require("../../core/helpers");
const { isAdmin } = require("./misc");
const { getString } = require("./lang");
const Lang = getString("utils");

async function groupAdminGuard(message, { botAdmin = false, ownerOnly = false } = {}) {
  if (!message.isGroup) {
    await message.sendReply(Lang.GROUP_ONLY);
    return false;
  }
  const allowed =
    message.fromOwner ||
    (!ownerOnly && config.ADMIN_ACCESS && (await isAdmin(message, message.sender)));
  if (!allowed) return false;
  if (botAdmin && !(await isAdmin(message))) {
    await message.sendReply(Lang.NOT_ADMIN);
    return false;
  }
  return true;
}

const cooling = new Map();

function cooldown(key, ms) {
  const now = Date.now();
  if (cooling.size > 1000) {
    for (const [k, until] of cooling) if (until <= now) cooling.delete(k);
  }
  if ((cooling.get(key) ?? 0) > now) return false;
  cooling.set(key, now + ms);
  return true;
}

const accountKey = (...parts) => [context.accountId() || "_", ...parts].join(":");

async function withTempFile(name, fn) {
  const file = uniqueTempPath(name);
  try {
    return await fn(file);
  } finally {
    try {
      await fs.promises.unlink(file);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

function timeSince(date) {
  if (!date) return Lang.NEVER;
  var seconds = Math.floor((new Date() - new Date(date)) / 1000);
  var interval = seconds / 31536000;
  if (interval > 1) {
    return Lang.YEARS_AGO.format(Math.floor(interval));
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Lang.MONTHS_AGO.format(Math.floor(interval));
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Lang.DAYS_AGO.format(Math.floor(interval));
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Lang.HOURS_AGO.format(Math.floor(interval));
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Lang.MINUTES_AGO.format(Math.floor(interval));
  }
  return Lang.SECONDS_AGO.format(Math.floor(seconds));
}

function isPrivateV4(address) {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) return isPrivateV4(address);
  const v6 = address.toLowerCase().split("%")[0];
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  const hex = v6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return (
    v6 === "::" ||
    v6 === "::1" ||
    /^f[cd]/.test(v6) ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith("ff")
  );
}

async function isPublicHttpUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (net.isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await dns.lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch (_) {
    return false;
  }
}

module.exports = {
  groupAdminGuard,
  cooldown,
  accountKey,
  withTempFile,
  timeSince,
  isPublicHttpUrl,
};

// detects URLs and bare domains that WhatsApp renders as clickable links

const validTLDs = [
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "int",
  "info",
  "biz",
  "name",
  "pro",
  "museum",
  "coop",
  "aero",
  "jobs",
  "mobi",
  "travel",
  "tel",
  "cat",
  "asia",
  "post",
  "xxx",
  "arpa",
  "online",
  "tech",
  "store",
  "app",
  "dev",
  "ai",
  "io",
  "co",
  "me",
  "tv",
  "cc",
  "tk",
  "ml",
  "ga",
  "cf",
  "business",
  "site",
  "website",
  "blog",
  "news",
  "media",
  "social",
  "email",
  "shop",
  "money",
  "finance",
  "health",
  "fitness",
  "sports",
  "games",
  "music",
  "video",
  "photo",
  "art",
  "design",
  "fashion",
  "food",
  "travel",
  "hotel",
  "book",
  "club",
  "community",
  "forum",
  "wiki",
  "live",
  "stream",
  "chat",
  "link",
  "click",
  "today",
  "now",

  "us",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "it",
  "es",
  "nl",
  "be",
  "ch",
  "at",
  "se",
  "no",
  "dk",
  "fi",
  "is",
  "ie",
  "pt",
  "gr",
  "tr",
  "ru",
  "ua",
  "pl",
  "cz",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "si",
  "rs",
  "ba",
  "mk",
  "al",
  "mt",
  "cy",
  "lu",
  "li",
  "ad",
  "mc",
  "sm",
  "va",
  "by",
  "md",
  "ee",
  "lv",
  "lt",
  "jp",
  "kr",
  "cn",
  "hk",
  "tw",
  "sg",
  "my",
  "th",
  "ph",
  "id",
  "vn",
  "bd",
  "pk",
  "lk",
  "np",
  "bt",
  "mm",
  "kh",
  "la",
  "bn",
  "mv",
  "af",
  "ir",
  "iq",
  "sy",
  "lb",
  "jo",
  "ps",
  "il",
  "sa",
  "ae",
  "qa",
  "bh",
  "kw",
  "om",
  "ye",
  "eg",
  "ly",
  "tn",
  "dz",
  "ma",
  "sd",
  "et",
  "ke",
  "tz",
  "ug",
  "rw",
  "bi",
  "mw",
  "zm",
  "zw",
  "za",
  "na",
  "bw",
  "sz",
  "ls",
  "mg",
  "mu",
  "sc",
  "km",
  "dj",
  "so",
  "er",
  "cf",
  "td",
  "cm",
  "gq",
  "ga",
  "cg",
  "cd",
  "ao",
  "st",
  "cv",
  "gw",
  "gn",
  "sl",
  "lr",
  "ci",
  "gh",
  "tg",
  "bj",
  "ne",
  "bf",
  "ml",
  "sn",
  "gm",
  "mr",
  "br",
  "ar",
  "cl",
  "pe",
  "ec",
  "co",
  "ve",
  "gy",
  "sr",
  "uy",
  "py",
  "bo",
  "mx",
  "gt",
  "bz",
  "sv",
  "hn",
  "ni",
  "cr",
  "pa",
  "cu",
  "jm",
  "ht",
  "do",
  "pr",
  "vi",
  "ag",
  "bb",
  "dm",
  "gd",
  "kn",
  "lc",
  "vc",
  "tt",
  "aw",
  "cw",
  "sx",
  "bq",
  "in",
];

function isValidTLD(tld) {
  return validTLDs.includes(tld.toLowerCase());
}

function getValidTLDs() {
  return [...validTLDs];
}

function createLinkPatterns() {
  const tldPattern = validTLDs.join("|");

  return [
    /\bhttps?:\/\/\S+/gi,
    /\bwww\.\S+\.\S+/gi,
    new RegExp(
      `\\b[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.(${tldPattern})(?:\\/\\S*)?\\b`,
      "gi"
    ),
    new RegExp(
      `\\b[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.(${tldPattern})\\b`,
      "gi"
    ),
  ];
}

function isValidLink(link) {
  if (/^https?:\/\/$/.test(link)) {
    return false;
  }

  if (/^\w+\.\w+$/.test(link) && !link.includes("/")) {
    const parts = link.split(".");
    const tld = parts[parts.length - 1].toLowerCase();
    if (!validTLDs.includes(tld)) {
      return false;
    }
  }

  if (/^\d+\.\d+(\.\d+)?(\.\d+)?$/.test(link)) {
    return false;
  }

  if (link.length < 4) {
    return false;
  }

  return true;
}

function detectLinks(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const urlPatterns = createLinkPatterns();
  let foundLinks = [];

  for (const pattern of urlPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      foundLinks = foundLinks.concat(matches);
    }
  }

  return [...new Set(foundLinks)].filter(isValidLink);
}

function hasLinks(text) {
  return detectLinks(text).length > 0;
}

function extractDomain(link) {
  try {
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      let domain = link.replace(/^www\./, "");

      domain = domain.split("/")[0];
      return domain.toLowerCase();
    }

    const url = new URL(link);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch (error) {
    let domain = link.replace(/^(https?:\/\/)?(www\.)?/, "");
    domain = domain.split("/")[0];
    return domain.toLowerCase();
  }
}

module.exports = {
  validTLDs,
  isValidTLD,
  getValidTLDs,
  createLinkPatterns,
  isValidLink,
  detectLinks,
  hasLinks,
  extractDomain,
};

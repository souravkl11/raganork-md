const axios = require("axios");
const translate = require("@vitalets/google-translate-api");

const malayalamToManglish = (r) => {
  const e = {
    അ: "a",
    ആ: "aa",
    ഇ: "i",
    ഈ: "ee",
    ഉ: "u",
    ഊ: "oo",
    ഋ: "ru",
    എ: "e",
    ഏ: "e",
    ഐ: "ai",
    ഒ: "o",
    ഓ: "o",
    ഔ: "au",
  };

  const a = {
    ക്ക: "kk",
    ഗ്ഗ: "gg",
    ങ്ങ: "ng",
    ക്ക: "kk",
    ച്ച: "cch",
    ജ്ജ: "jj",
    ഞ്ഞ: "nj",
    ട്ട: "tt",
    ണ്ണ: "nn",
    ത്ത: "tth",
    ദ്ദ: "ddh",
    ദ്ധ: "ddh",
    ന്ന: "nn",
    ന്ത: "nth",
    ങ്ക: "nk",
    ണ്ട: "nd",
    ബ്ബ: "bb",
    പ്പ: "pp",
    മ്മ: "mm",
    യ്യ: "yy",
    ല്ല: "ll",
    വ്വ: "vv",
    ശ്ശ: "sh",
    സ്സ: "s",
    ക്സ: "ks",
    ഞ്ച: "nch",
    ക്ഷ: "ksh",
    മ്പ: "mp",
    റ്റ: "tt",
    ന്റ: "nt",
    ന്ത: "nth",
    ന്ത്യ: "nthy",
  };

  const n = {
    ക: "k",
    ഖ: "kh",
    ഗ: "g",
    ഘ: "gh",
    ങ: "ng",
    ച: "ch",
    ഛ: "chh",
    ജ: "j",
    ഝ: "jh",
    ഞ: "nj",
    ട: "d",
    ഠ: "dh",
    ഡ: "d",
    ഢ: "dd",
    ണ: "n",
    ത: "th",
    ഥ: "th",
    ദ: "d",
    ധ: "dh",
    ന: "n",
    പ: "p",
    ഫ: "ph",
    ബ: "b",
    ഭ: "bh",
    മ: "m",
    യ: "y",
    ര: "r",
    ല: "l",
    വ: "v",
    ശ: "sh",
    ഷ: "sh",
    സ: "s",
    ഹ: "h",
    ള: "l",
    ഴ: "zh",
    റ: "r",
  };

  const t = {
    ല്: "l",
    ള്: "l",
    ണ്: "n",
    ന്: "n",
    ര്: "r",
    ക്ക്: "k",
  };

  const o = {
    "ു്": "u",
    "ാ": "aa",
    "ി": "i",
    "ീ": "ee",
    "ു": "u",
    "ൂ": "oo",
    "ൃ": "ru",
    "െ": "e",
    "േ": "e",
    "ൈ": "y",
    "ൊ": "o",
    "ോ": "o",
    "ൌ": "ou",
    "ൗ": "au",
    "ഃ": "a",
  };

  function h(r) {
    r = p(a, (r = r.replace(/[\u200B-\u200D\uFEFF]/g, "")));
    r = p(e, r);
    r = p(n, r);
    let h = "";

    for (const l in a) {
      if (a.hasOwnProperty(l)) {
        h = a[l];
        r = (r = (r = r.replace(RegExp(l + "്([\\w])", "g"), h + "$1")).replace(
          RegExp(l + "്", "g"),
          h + "u"
        )).replace(RegExp(l, "g"), h + "a");
      }
    }

    for (const l in n) {
      if (n.hasOwnProperty(l)) {
        h = n[l];
        r = r.replace(RegExp(l + "(?!്)", "g"), h + "a");
      }
    }

    for (const l in n) {
      if (n.hasOwnProperty(l)) {
        h = n[l];
        r = r.replace(RegExp(l + "്(?![\\s).;,\"'/\\%!])", "ig"), h);
      }
    }

    for (const l in n) {
      if (n.hasOwnProperty(l)) {
        h = n[l];
        r = r.replace(RegExp(l + "്", "g"), h + "u");
      }
    }

    for (const l in n) {
      if (n.hasOwnProperty(l)) {
        h = n[l];
        r = r.replace(RegExp(l, "g"), h);
      }
    }

    for (const l in e) {
      if (e.hasOwnProperty(l)) {
        h = e[l];
        r = r.replace(RegExp(l, "g"), h);
      }
    }

    for (const l in t) {
      if (t.hasOwnProperty(l)) {
        h = t[l];
        r = r.replace(RegExp(l, "g"), h);
      }
    }

    r = r.replace(/ം/g, "m");

    for (const l in o) {
      if (o.hasOwnProperty(l)) {
        h = o[l];
        r = r.replace(RegExp(l, "g"), h);
      }
    }

    return r.replace(/(^\s*\w|[\.\!\?]\s*\w)/g, function (r) {
      return r.toUpperCase();
    });
  }

  function p(r, e) {
    for (
      let a = 0,
        n = RegExp("(" + l(r).join("|") + ")(" + l(o).join("|") + ")", "g");
      null != a;

    ) {
      (a = n.exec(e)) && (e = e.replace(RegExp(a[0], "g"), r[a[1]] + o[a[2]]));
    }
    return e;
  }

  function l(r) {
    const e = [];
    for (const a in r) {
      r.hasOwnProperty(a) && e.push(a);
    }
    return e;
  }

  return h(r);
};

const manglishToMalayalam = async (r) => {
  try {
    const { data: e } = await axios.get(
      `https://inputtools.google.com/request?text=${r}&itc=ml-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`
    );
    return e[1][0][1][0] || false;
  } catch (a) {
    console.log(a.message);
    return false;
  }
};

module.exports = {
  malayalamToManglish,
  manglishToMalayalam,
};

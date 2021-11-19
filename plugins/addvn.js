function R(o, s) {
  const l = Q();
  return R = function (O, C) {
    O = O - 109;
    let P = l[O];
    if (R.GCzzgG === undefined) {
      var J = function (B) {
        const W = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
        let M = "", y = "";
        for (let v = 0, g, t, H = 0; t = B.charAt(H++); ~t && (g = v % 4 ? g * 64 + t : t, v++ % 4) ? M += String.fromCharCode(255 & g >> (-2 * v & 6)) : 0) {
          t = W.indexOf(t);
        }
        for (let a = 0, S = M.length; a < S; a++) {
          y += "%" + ("00" + M.charCodeAt(a).toString(16)).slice(-2);
        }
        return decodeURIComponent(y);
      };
      const Y = function (B, W) {
        let M = [], v = 0, g, t = "";
        B = J(B);
        let H;
        for (H = 0; H < 256; H++) {
          M[H] = H;
        }
        for (H = 0; H < 256; H++) {
          v = (v + M[H] + W.charCodeAt(H % W.length)) % 256, g = M[H], M[H] = M[v], M[v] = g;
        }
        H = 0, v = 0;
        for (let a = 0; a < B.length; a++) {
          H = (H + 1) % 256, v = (v + M[H]) % 256, g = M[H], M[H] = M[v], M[v] = g, t += String.fromCharCode(B.charCodeAt(a) ^ M[(M[H] + M[v]) % 256]);
        }
        return t;
      };
      R.rHEpJx = Y, o = arguments, R.GCzzgG = !![];
    }
    const m = l[0], I = O + m, L = o[I];
    return !L ? (R.wSvCTA === undefined && (R.wSvCTA = !![]), P = R.rHEpJx(P, C), o[I] = P) : P = L, P;
  }, R(o, s);
}
function Q() {
  const d = ["iSkhkCo4W4m", "mZe2mdKYDM53ufDI", "WPGclG", "zgvSyMDTid8OlG", "zMfRzq", "mty4s05mDuPY", "ywrKyMDTid8OlG", "ChvZAa", "BwfW", "ndeZzLjYsNrS", "Cgf0Aa", "csRcN1X4WPyUiJe9", "EmkpywtdVIfjsG", "tMv5BwfY", "D3jPDgvgAwXL", "ywrKq29TBwfUza", "W7/cKuK", "W6BdGYTs", "pMmw", "W7tcJSoR", "W4NdPrhdLL4+fmk3l10", "WRXQW6r7W4zte8oFWQD9", "EdddMtG", "yMDT", "ntv2vejiB3u", "W7RdLGy", "c3zdWRFcHLS", "yxvKAw8", "W7JcOmkpW4i", "u0fwrv9vu0fhrq", "AGZdVG4", "W6RcK1tdNq", "W7NcHbPBFLZdOvjH", "W73cR8kcWOpcGZK9W5K8jq", "BM90zxm", "WRtcUCo+E8ogW53cJWTQWP8meLC", "nZu4mJCXr3Diwg1L", "W4BcLSo1W6S3qSoVga", "ag8NfSost8oqBaZcQq", "y2XPzw50", "x0DPDMuGysbIzW", "CMvHzezPBgvtEq", "mtG4mJy3mhnMt2XbCG", "nqbNW5TroGazWPdcI8oTfCoJ", "CmonucHrkComsa", "W7pcHHDMW6/dKSkTsxDwW5ml", "z2v0qMDT", "nIVdGN3cUSoibIaWkq", "lI9ZB3vYyxyV", "su1hoZS7", "WRhcUCo+F8oiW5BdQJzcWP0ahG", "W6aGW6DMW5mJhmoDWRL9", "r29VzcbUAwDODa", "hmkvbmkSDfmflCob", "W5JdR1vGkYRcTCo1puS", "hSk7lKG", "Aw8HxW", "W4ldSW1/", "W4NcI8k5W7CWsCoNaSkuW78", "W5JdHSkLjCkgW47dIcT1WPO", "WOxdIKy6", "Aw5JBhvKzxm", "W7/dHYm", "x1jLCgX5ihrVia", "W6RcNqa8WR3cJ8kAw019", "W4bHA3pcU8k6W5dcTeHXWRBcSG", "bCoulSk2hCohx3ybzW", "WPWPFmo8WRZcOGhdLG", "W63cN8o7", "WP3dI8kUWRzXf8oihmk2W7JdSCou", "W77cPSkwW5ddGXm", "BM90zq", "W79LsvJdHCoGit/dHg8", "CMvWBhLFBwvZCW", "g8oqma", "aNqyWPFcGf8rWPdcHdC", "m8oGWPRcNmkzwCo/WRe", "qxLPBNu", "W7TPxvhdKW", "W6ZcK1ZdHCoH", "BxLYzq", "lmoDCG", "yqLi", "ywDL", "y29UDMvYDgLUzW", "BsbUyw1LihrVia", "dZOeW4jdW5FdJf7cO8kX", "fCkAeCkr", "Dgv4Da", "z1W7WP8n", "W6ZcGSo/umoxvbvDW6rF", "C2vUze1LC3nHzW", "zg93BMXVywrnzq", "BwvZC2fNzq", "e8kiWQK", "WRtcUmo9ECogW5ZdIsPWWQevgW", "zwqGyMDTCYfF", "W6e4iWyRWPpcKbK", "bmoummk+kCo9qwatCW", "zGldPa", "z8kACuldKWqgtenG", "W7OZmayNWQJcMa9AW5O", "e2VdQmk7W4Gn", "lM1WmW", "CMvTB3zL", "lCksacj2p8oJt18", "nfbisvDsCa", "rmkikZS", "nJa1nJC4vxjfBejN", "W7NcLbzmueVdU0nLCa", "BgX5igfKzgvKia", "zgvSzxrLqMDT", "xmobW6pdSuBdUmoSW6VcLW", "sgvSBg8", "W6uJmWm9", "W5pdI15XBHW8Fq", "C2vK", "qgfKAxDHANnOAq", "ndC1otHty2vuAha", "W7FdPSkVka", "DSoedc5ZB8oB"];
  Q = function () {
    return d;
  };
  return Q();
}
const B = o, Y = R;
(function (s, l) {
  const L = o, I = R, O = s();
  while (!![]) {
    try {
      const C = parseInt(I("0x86", "glzL")) / 1 + parseInt(L("0xbe")) / 2 * (-parseInt(L("0x78")) / 3) + parseInt(L("0xce")) / 4 + -parseInt(I("0x7f", "Gy#f")) / 5 + parseInt(L("0xca")) / 6 * (parseInt(L("0xd6")) / 7) + -parseInt(L("0xd2")) / 8 * (parseInt(I("0x95", "#WEg")) / 9) + parseInt(L("0x7e")) / 10 * (parseInt(I("0xd9", "0ssG")) / 11);
      if (C === l) break; else O.push(O.shift());
    } catch (P) {
      O.push(O.shift());
    }
  }
}(Q, 422344));
function o(R, s) {
  const l = Q();
  return o = function (O, C) {
    O = O - 109;
    let P = l[O];
    if (o.ZELftb === undefined) {
      var J = function (Y) {
        const B = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
        let W = "", M = "";
        for (let y = 0, v, g, t = 0; g = Y.charAt(t++); ~g && (v = y % 4 ? v * 64 + g : g, y++ % 4) ? W += String.fromCharCode(255 & v >> (-2 * y & 6)) : 0) {
          g = B.indexOf(g);
        }
        for (let H = 0, a = W.length; H < a; H++) {
          M += "%" + ("00" + W.charCodeAt(H).toString(16)).slice(-2);
        }
        return decodeURIComponent(M);
      };
      o.YDoKpA = J, R = arguments, o.ZELftb = !![];
    }
    const m = l[0], I = O + m, L = R[I];
    return !L ? (P = o.YDoKpA(P), R[I] = P) : P = L, P;
  }, o(R, s);
}
const sk = require("fs"), fs = require(Y("0x8e", "CBZ(") + "s"), path = require(B("0xd7")), {MessageType, Mimetype} = require(B("0xc9") + Y("0x9f", "H&JQ")), Asena = require(Y("0xc4", "YIb6")), {successfullMessage, errorMessage, infoMessage} = require(Y("0x94", "p2Sz")), BgmDB = require(Y("0x87", "X()T")), Language = require("../language"), Lang = Language[Y("0x89", "M3z&")](B("0x76"));
Asena.addCommand({pattern: "addbgm ?(.*)", fromMe: !![], desc: Lang[B("0x71")]}, async (s, l) => {
  const M = Y, W = B, O = l[1];
  if (!s[W("0x9d") + "age"]) {
    await s.sendMessage(W("0x93") + M("0x75", "7)km") + "_");
    return;
  } else {
    if (!O) {
      await s[M("0xc1", "waTQ") + "e"]("_Give me a" + M("0x8a", "**6#") + "!_");
      return;
    } else {
      if (s[W("0x9d") + W("0xa7")]) {
        if (!s[M("0xae", "ob4Q") + W("0xa7")][M("0xcd", "vr!L")] && !s["reply_mess" + W("0xa7")][M("0xa2", "pRPA")] && !s[M("0xb9", "Fwsj") + "age"][M("0xcc", "mUWF")] && !s[W("0x9d") + M("0xa5", "0ssG")][M("0xde", "KKWL")]) {
          const C = await s[W("0x7b")][W("0xb0") + "diaMessage"]({key: {remoteJid: s[W("0x9d") + M("0xb2", "YIb6")].jid, id: s[M("0x9c", "pRPA") + "age"].id}, message: s[M("0xe2", "X()T") + W("0xa7")][M("0x70", "7)km")][M("0xe1", "Kcj%") + W("0xa7")]});
          fs[W("0xdb")](W("0x84") + O + ".mp3", C), await s[M("0x96", "t%CS") + "e"]("_Successfu" + W("0xc2") + O + (M("0x83", "e4#9") + M("0x9a", "7)km")), MessageType[W("0xac")]);
        } else return await s.sendMessage(M("0x8f", "glzL") + M("0xaa", ")XQE") + W("0x8c"));
        return;
      }
    }
  }
}), Asena.addCommand({pattern: B("0xd3") + "*)", fromMe: !![], dontAddCommandList: !![]}, async (s, l) => {
  const v = B, y = Y, O = l[1];
  if (!O && !s[y("0xb6", "t%CS") + y("0xdd", "Viqc")]) return;
  const C = [y("0x90", "p2Sz"), v("0xa1"), y("0x98", "CBZ("), "Bot", y("0xdf", ")XQE"), v("0x88"), v("0xc5"), "Hi", v("0xda"), "Pm", "Sed", y("0xad", "Gy#f"), "assist", y("0xb7", "Bcn$"), v("0xe4"), y("0xa6", "t2y%"), v("0xa8"), v("0xd1"), "fork", "fuck", y("0xc6", "Fwsj"), v("0xa4"), y("0xab", "M3z&"), "number", "oombi", y("0xcb", "glzL"), y("0xc7", "Pv2("), v("0xbc"), y("0xa3", "Viqc"), v("0xc8"), y("0x74", "waTQ"), y("0xd8", "4@*$") + "on"], P = await BgmDB[v("0x82")](), J = [];
  P[v("0xd5")](m => {
    const g = y;
    !m[g("0xe3", "e4#9")][g("0x79", "CBZ(")]("IMG;;;") && J.push(m.note);
  });
  if (!J[v("0x91")](l[1]) && !C[y("0x80", "QUE*")](l[1])) {
    await BgmDB[y("0xba", "pEox")](O);
    return;
  }
}), Asena.addCommand({on: Y("0x8d", "**6#"), fromMe: ![]}, async (s, l) => {
  const t = Y, O = await BgmDB.getBgm(), C = [];
  O[t("0x9e", "t%CS")](P => {
    const a = t, H = o;
    !P[H("0x9b")].includes(H("0x85")) && C[H("0xd4")](P[a("0x72", "Bcn$")]);
  }), C[t("0x92", "KKWL")](async P => {
    const h = t, S = o;
    let J = new RegExp("\\b" + P + "\\b", "g");
    J.test(s[S("0xb1")]) && await s[S("0x7b")][S("0xaf") + "e"](s[h("0xe0", "ob4Q")], sk[S("0x7d") + "nc"](S("0x84") + P + S("0xbb")), MessageType[S("0x6f")], {mimetype: Mimetype.mp4Audio, quoted: s.data, ptt: !![]});
  });
}), Asena[B("0xdc")]({pattern: "delbgm ?(.*)", fromMe: !![], dontAddCommandList: !![]}, async (s, l) => {
  const f = Y, T = B, O = l[1];
  if (!O) return await s.sendMessage(T("0x7c") + T("0xa9") + f("0x97", "31N["));
  const C = await BgmDB[T("0x82")](), P = [];
  C[f("0xcf", "Q3G7")](J => {
    const A = f, X = T;
    !J[X("0x9b")][A("0xa0", "]H8d")]("IMG;;;") && P[X("0xd4")](J.note);
  });
  if (P[T("0x91")](O)) {
    await BgmDB[T("0xc3")](O), await s[T("0xaf") + "e"](f("0x7a", "eb%6") + "lly delete" + f("0x6d", "Viqc") + O + (f("0xb8", "0ssG") + T("0xb4")), MessageType[f("0x73", "Viqc")]);
    return;
  }
}), Asena[B("0xdc")]({pattern: B("0xd0") + "*)", fromMe: !![], dontAddCommandList: !![]}, async (s, l) => {
  const F = B, U = Y, O = l[1];
  if (!O) return;
  const C = await BgmDB[U("0x6e", "H&JQ")](), P = [];
  C[F("0xd5")](J => {
    const G = F, q = U;
    !J[q("0x8b", "tPDD")][G("0x91")]("IMG;;;") && P.push(J[q("0xbf", "GD4)")]);
  });
  if (P[U("0xb5", "Fwsj")](O)) {
    await sk.unlinkSync(F("0x84") + O + F("0xbb"));
    return;
  }
});

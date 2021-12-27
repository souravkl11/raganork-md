// Music finder - souravkl11/raganork
(function (F, K) {
    function k(F, K) {
        return R(F - -'0x189', K);
    }
    var q = F();
    while (!![]) {
        try {
            var n = parseInt(k(0x6a, '0x70')) / (-0x2 * -0x86d + 0x2568 + -0x3641) + -parseInt(k('0x67', 0x6a)) / (0x133d + -0x91 * 0xa + -0xd91) + parseInt(k(0x7d, '0x7b')) / (0x8e3 + -0xdea + 0x50a) + parseInt(k('0x84', '0x70')) / (0x1d41 + -0x17f5 + -0x548) + parseInt(k('0x7b', '0x89')) / (0x1fc + -0x166b + 0x1474) + parseInt(k('0x6c', 0x67)) / (0x9bf + -0x151f + 0xb66) + -parseInt(k(0x6b, 0x6d)) / (-0x9ca * -0x1 + -0x4b3 + -0x510);
            if (n === K) break;
            else q['push'](q['shift']());
        } catch (S) {
            q['push'](q['shift']());
        }
    }
}(A, -0x14ff06 + -0x338 * 0x127 + -0x212d3 * -0x11));
var New = require('../events'),
    {
        MessageType,
        Mimetype
    } = require('@adiwajshi' + 'ng/baileys');

function A() {
    var d = [':_ *', 'downloadAn', '3207852MYnUJy', 'addCommand', '_ *', 'quotedMess', 'sendMessag', 'album', 'any music!', 'text', 'CHANNEL', 'e date:_ *', 'owner can ', 'jid', 'reply_mess', '* \x0a_Releas', 'find ?(.*)', 'Message', 'video', '262916PMlZaT', 'error', '_Only the ', '1207094zWURhw', '29885618IZiGMc', '6869136xXCGGa', 'raganork-b', 'release_da', 'sticker', '_Reply to ', 'pattern', 'result', 'ZEKAIS_API', 'error_code', 'WORKTYPE', 'fromMe', 'ommand!_', 'use this c', 'artist', 'public', '4281495wXrBGb', 'dSaveMedia', '3245043vIyhLi', 'age', 'client', '* \x0a_Artist', 'data'];
    A = function () {
        return d;
    };
    return A();
}
const setting = require('../config');

function R(t, N) {
    var F = A();
    return R = function (K, q) {
        K = K - (-0x1 * 0xf61 + 0xa * 0x114 + -0x33d * -0x2);
        var n = F[K];
        return n;
    }, R(t, N);
}
var find = require(j(0x570, '0x564') + 'ot');
let sourav = setting[j('0x583', 0x56c)] == j(0x581, '0x571') ? ![] : !![];
var t = {};
t['pattern'] = j(0x571, '0x55b'), t[j('0x56e', '0x56d')] = !![];

function j(F, K) {
    return R(K - '0x36e', F);
}
Raganork[j('0x583', 0x57c)](t, async (F, K) => {
    function C(F, K) {
        return j(K, F - -0x403);
    }
    if (!F['reply_mess' + C('0x172', 0x15f)]['text'] && !F['reply_mess' + C('0x172', '0x168')][C(0x15a, 0x16f)] && !F[C('0x156', 0x165) + C('0x172', 0x17b)][C('0x163', 0x14c)] && !F['reply_mess' + C(0x172, '0x176')]['image']) {
        var q = await F[C('0x173', '0x15d')][C(0x177, '0x183') + C(0x170, 0x160) + C(0x159, 0x161)]({
            'key': {
                'remoteJid': F['reply_mess' + 'age']['jid'],
                'id': F['reply_mess' + C('0x172', '0x166')]['id']
            },
            'msg': F['reply_mess' + C(0x172, 0x179)][C(0x175, 0x162)][C(0x14d, 0x160) + 'age']
        });
        if (setting[C('0x152', '0x166')] !== 'undefined') return;
        var n = setting[C(0x167, '0x15e')],
            S = await find['query']['music'](q, n);
        if (S[C('0x166', '0x162')]) return await F[C('0x173', '0x183')][C(0x14e, '0x13a') + 'e'](F['jid'], '_Title:_ *' + find[C(0x166, 0x176)]['title'] + ('* \x0a_Album:' + C(0x14c, '0x15c')) + find['result'][C(0x14f, '0x139')] + (C(0x174, '0x169') + C('0x176', '0x17f')) + find[C(0x166, 0x152)][C(0x16d, 0x17d)] + (C(0x157, 0x155) + C(0x153, '0x14b')) + find['result'][C('0x162', '0x16b') + 'te'] + '*', MessageType[C('0x151', '0x14d')], {
            'quoted': F[C('0x156', 0x16a) + C(0x172, 0x160)][C('0x175', '0x18b')]
        });
        if (S['error']) return await F[C('0x173', '0x16d')][C(0x14e, '0x160') + 'e'](F['jid'], '_Error ' + find[C('0x15c', 0x14e)][C(0x168, 0x17f)] + '_', MessageType[C(0x151, '0x153')], {
            'quoted': F[C(0x175, 0x18b)]
        });
        if (!S[C(0x166, '0x155')]) return await F['client'][C('0x14e', '0x148') + 'e'](F[C(0x155, 0x148)], '_Failed!_', MessageType['text'], {
            'quoted': F[C(0x175, '0x16c')]
        });
    } else return await F[C('0x173', '0x180')]['sendMessag' + 'e'](F[C('0x155', '0x155')], C(0x164, '0x158') + C('0x150', 0x151) + '_', MessageType[C('0x151', '0x14f')], {
        'quoted': F[C(0x175, '0x163')]
    });
});
if (setting['WORKTYPE'] === j(0x567, '0x571')) {
    var N = {};
    N[j('0x573', '0x568')] = j(0x55b, '0x55b'), N['fromMe'] = ![], Raganork[j(0x56d, 0x57c)](N, async (F, K) => {
        function U(F, K) {
            return j(K, F - 0x73);
        }
        return await F[U('0x5e9', 0x5f2)]['sendMessag' + 'e'](F['jid'], U(0x5d3, '0x5da') + U('0x5ca', 0x5cb) + U(0x5e2, 0x5f5) + U(0x5e1, '0x5d4'), MessageType[U('0x5c7', 0x5ca)], {
            'quoted': F[U(0x5eb, 0x5eb)]
        });
    });
}
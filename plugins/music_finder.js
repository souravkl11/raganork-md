// Music finder - souravkl11/raganork
function B(h, j) {
    return v(h - 0xbb, j);
}(function (h, j) {
    function p(h, j) {
        return v(j - 0x22b, h);
    }
    var K = h();
    while (!![]) {
        try {
            var U = parseInt(p(0x2fd, 0x311)) / (-0x883 + 0x862 * -0x3 + 0x21aa) + parseInt(p(0x307, 0x310)) / (0x538 * -0x1 + -0xfb6 + 0x14f0) + parseInt(p(0x320, '0x326')) / (0x2f * 0x5e + 0x1 * -0x60f + -0xb30) * (-parseInt(p('0x309', '0x325')) / (0x11de + -0x1291 * -0x1 + -0x246b)) + parseInt(p(0x30f, '0x31a')) / (-0x2618 + -0x8ec + -0x2f09 * -0x1) + -parseInt(p('0x330', '0x32a')) / (-0x84b * -0x3 + 0x1ce0 + -0x35bb) * (-parseInt(p(0x2fe, 0x300)) / (-0x6 * -0x66 + -0x5b * 0x7 + 0x20)) + -parseInt(p('0x32f', 0x334)) / (0xaa0 + 0x1e4e + -0x15d * 0x1e) * (-parseInt(p('0x32f', 0x315)) / (-0x1c3e + 0x2c * -0x8e + -0x34af * -0x1)) + parseInt(p(0x33e, 0x327)) / (0x24bd + 0x3 * 0x20d + -0x2ada) * (-parseInt(p(0x315, '0x30f')) / (0xbc5 * -0x3 + 0x8 * 0x185 + 0x1732));
            if (U === j) break;
            else K['push'](K['shift']());
        } catch (c) {
            K['push'](K['shift']());
        }
    }
}(F, 0x6b8e3 + 0xd022 * 0x10 + 0x16 * -0x789e));

function v(u, Z) {
    var h = F();
    return v = function (j, K) {
        j = j - (0x17f5 * -0x1 + 0x1831 + 0x93);
        var U = h[j];
        return U;
    }, v(u, Z);
}
var New = require(B('0x19c', 0x19a)),
    {
        MessageType,
        Mimetype
    } = require(B('0x1ac', '0x18e') + 'ng/baileys');
const setting = require(B(0x18b, 0x194));
var find = require(B(0x1a3, '0x1b6') + 'ot');
let sourav = setting[B(0x19b, 0x1aa)] == B('0x191', 0x194) ? ![] : !![];
var u = {};
u[B('0x196', 0x1b4)] = B('0x1c2', '0x1cf'), u[B('0x199', '0x1b5')] = !![], New[B('0x1c0', '0x1aa')](u, async (h, j) => {
    function z(h, j) {
        return B(h - -'0x7a', j);
    }
    if (!h[z(0x13a, '0x13d') + z(0x13e, 0x15c)][z('0x134', 0x115)] && !h['reply_mess' + z('0x13e', 0x12d)][z(0x11d, '0x11a')] && !h[z('0x13a', '0x123') + z('0x13e', '0x12a')][z(0x12f, 0x13b)] && !h[z('0x13a', '0x157') + z(0x13e, '0x150')][z(0x128, '0x134')]) {
        var K = await h[z('0x115', '0x105')][z(0x135, '0x14e') + z('0x120', 0x108) + z('0x124', '0x135')]({
                'key': {
                    'remoteJid': h['reply_mess' + 'age'][z('0x147', 0x148)],
                    'id': h['reply_mess' + z(0x13e, '0x120')]['id']
                },
                'message': h[z(0x13a, '0x11d') + z('0x13e', 0x158)][z(0x119, '0x124')][z('0x113', 0x110) + z('0x13e', 0x15c)]
            }),
            U = setting[z('0x12d', '0x129')],
            c = await find[z('0x133', 0x120)][z(0x14c, '0x12e')](K, U);
        console['log'](c);
        if (c[z(0x138, 0x140)]) {
            let w = '_Title:_ *' + c['result'][z('0x145', 0x14a)] + (z('0x139', 0x150) + z(0x114, 0xfc)) + c[z(0x138, '0x131')]['album'] + (z(0x131, 0x12e) + ':_ *') + c['result']['artist'] + (z(0x137, '0x155') + z(0x114, '0xfc')) + c['result'][z('0x14b', 0x136)] + ('* \x0a_Releas' + z(0x12e, 0x137)) + c[z(0x138, 0x152)]['release_da' + 'te'] + (z(0x11a, '0x10d') + 'ink:_ ') + ('https://ww' + z('0x118', '0x116') + z(0x136, '0x130') + z('0x12c', '0x149') + z('0x112', 0x121)) + c[z('0x138', '0x11c')]['title'][z(0x11e, 0x10f)](' ')['join']('') + '*';
            return await h[z('0x115', 0x10f)]['sendMessag' + 'e'](h['jid'], w, MessageType[z('0x134', 0x14d)], {
                'quoted': h[z(0x119, '0x126')]
            });
        }
        if (c[z('0x123', '0x140')]) return await h[z(0x115, '0x126')][z(0x142, 0x15f) + 'e'](h[z(0x147, '0x133')], z(0x143, 0x141) + c[z('0x123', '0x10c')][z('0x11b', '0x126')] + '_', MessageType[z('0x134', 0x14f)], {
            'quoted': h[z(0x119, 0x104)]
        });
        if (!c[z(0x138, 0x153)]) return await h[z('0x115', '0xf8')][z('0x142', 0x154) + 'e'](h[z(0x147, 0x149)], z(0x144, 0x126), MessageType[z(0x134, 0x14c)], {
            'quoted': h[z(0x119, '0x11d')]
        });
    } else return await h[z('0x115', 0x10b)][z(0x142, '0x14b') + 'e'](h[z(0x147, '0x137')], z('0x13f', 0x145) + z(0x110, '0x103') + '_', MessageType[z(0x134, 0x14b)], {
        'quoted': h[z(0x119, 0xfc)]
    });
});
if (setting[B('0x19b', 0x19a)] === B(0x191, 0x1a2)) {
    var Z = {};
    Z[B(0x196, 0x187)] = B(0x1c2, '0x1ab'), Z[B('0x199', '0x194')] = ![], New[B('0x1c0', '0x1a3')](Z, async (h, j) => {
        function y(h, j) {
            return B(h - -'0x24', j);
        }
        return await h[y('0x16b', '0x176')][y('0x198', '0x187') + 'e'](h[y('0x19d', '0x1a4')], y(0x19f, '0x1b2') + y('0x180', 0x185) + 'use this c' + y(0x197, '0x1a9'), MessageType[y('0x18a', '0x189')], {
            'quoted': h[y('0x16f', '0x158')]
        });
    });
}

function F() {
    var m = ['8348351oMWAcB', '11362wsTIcp', '543832ZHqYWy', 'image', 'raganork-b', 'owner can ', '4357629nQNXBC', 's?search_q', 'ZEKAIS_KEY', 'e date:_ *', 'sticker', '3524065baWYEt', '* \x0a_Artist', '@adiwajshi', 'query', 'text', 'downloadAn', 'com/result', '* \x0a_Label:', 'result', '* \x0a_Album:', 'reply_mess', '4748LBGBJb', '2790AVEeJL', '10jkMuXo', 'age', '_Reply to ', '4428522xAZRcc', 'ommand!_', 'sendMessag', '_Error ', '_Failed!_', 'title', 'addCommand', 'jid', 'find ?(.*)', '_Only the ', '8AhbCOx', 'label', 'music', 'any music!', '../config', 'uery=', 'quotedMess', '_ *', 'client', '7MPVoLu', 'public', 'w.youtube.', 'data', '* \x0a_Song l', 'error_code', 'pattern', 'video', 'split', 'fromMe', 'dSaveMedia', 'WORKTYPE', '../events', 'error', 'Message'];
    F = function () {
        return m;
    };
    return F();
}
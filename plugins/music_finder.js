// Music finder - souravkl11/raganork
(function (h, j) {
    function p(h, j) {
        return v(h - '0x37b', j);
    }
    var K = h();
    while (!![]) {
        try {
            var U = parseInt(p(0x419, 0x431)) / (-0x9e2 + 0x1 * 0x11d2 + 0x3 * -0x2a5) * (-parseInt(p('0x42c', '0x433')) / (-0x30b * -0x1 + 0x4d8 + 0x1 * -0x7e1)) + parseInt(p(0x439, 0x430)) / (0xa88 + 0x1a7e * 0x1 + -0x767 * 0x5) * (-parseInt(p('0x443', 0x448)) / (-0x1811 + 0x594 * 0x1 + 0x1281)) + -parseInt(p(0x40b, '0x421')) / (0x2662 + -0xa5 + 0x25b8 * -0x1) * (parseInt(p('0x420', '0x421')) / (0x112 * 0x3 + 0x155 * 0x12 + -0x90e * 0x3)) + -parseInt(p('0x41a', '0x41c')) / (0x6 * -0x182 + 0x719 * 0x5 + 0x17 * -0x126) * (parseInt(p('0x422', '0x43b')) / (-0x159d + -0x19d3 + 0x2f78)) + parseInt(p(0x421, 0x439)) / (0x261a + -0x23d + -0x23d4) * (parseInt(p('0x436', 0x43b)) / (0x1 * 0x1845 + -0xd44 * 0x1 + 0x1 * -0xaf7)) + parseInt(p(0x41f, '0x42c')) / (0x1998 + 0x19 * -0xb3 + 0x409 * -0x2) + parseInt(p(0x442, 0x438)) / (-0x177d * 0x1 + 0x2363 + 0x2 * -0x5ed);
            if (U === j) break;
            else K['push'](K['shift']());
        } catch (c) {
            K['push'](K['shift']());
        }
    }
}(F, 0x557d4 + 0x7ff9c + 0x125 * 0xf4));

function v(u, Z) {
    var h = F();
    return v = function (j, K) {
        j = j - (-0xed * 0x1d + -0x1cce + 0x3834);
        var U = h[j];
        return U;
    }, v(u, Z);
}
var New = require(B('0x3b2', '0x3b4')),
    {
        MessageType,
        Mimetype
    } = require(B(0x3b5, '0x3cb') + B('0x390', '0x39e'));
const setting = require(B('0x3a8', '0x39d'));

function B(h, j) {
    return v(h - 0x2f8, j);
}
var find = require(B(0x3a0, 0x3a5) + 'ot');
let sourav = setting[B('0x3a7', '0x3ad')] == 'public' ? ![] : !![];
var u = {};
u['pattern'] = 'find ?(.*)', u[B(0x3ac, '0x3be')] = !![], New[B('0x3ba', 0x3b5)](u, async (h, j) => {
    function z(h, j) {
        return B(j - -0x448, h);
    }
    if (!h[z(-'0xb3', -0x9a) + z(-0x8a, -'0x90')]['text'] && !h['reply_mess' + z(-0x9a, -0x90)]['video'] && !h[z(-'0x88', -'0x9a') + z(-0x82, -0x90)]['sticker'] && !h[z(-'0xb1', -'0x9a') + z(-'0x75', -0x90)]['image']) {
        var K = await h[z(-0xc8, -'0xad')][z(-'0x79', -0x8c) + z(-0x97, -'0x9d') + 'Message']({
                'key': {
                    'remoteJid': h['reply_mess' + z(-'0xad', -0x90)][z(-'0xa7', -'0x99')],
                    'id': h[z(-0x93, -'0x9a') + 'age']['id']
                },
                'message': h[z(-0x7c, -0x9a) + z(-'0xa1', -0x90)][z(-'0x7c', -'0x97')]['quotedMess' + z(-0xa7, -0x90)]
            }),
            U = setting[z(-0xc6, -'0xb5')],
            c = await find[z(-0xbd, -0xb9)][z(-0x86, -'0xa2')](K, U);
        console[z(-0xa3, -0xaf)](c);
        if (c['result']) {
            let w = z(-'0x93', -0x8d) + c[z(-'0xb6', -'0xbc')][z(-0xb5, -'0xc3')] + (z(-0xac, -'0xa6') + '_ *') + c[z(-0xad, -'0xbc')][z(-'0xaa', -0xb7)] + (z(-0xa4, -'0x8f') + z(-'0xa3', -0x8b)) + c[z(-'0xb0', -'0xbc')][z(-'0xa7', -0xb4)] + (z(-'0x7c', -'0x91') + z(-'0x98', -0x87)) + c[z(-'0xc1', -'0xbc')][z(-0x91, -'0xa7')] + (z(-0xbb, -0xbe) + z(-0xa9, -0xb3)) + c['result'][z(-'0xac', -'0xba') + 'te'] + ('* \x0a_Song l' + 'ink:_ ') + (z(-'0xa3', -'0x8a') + 'w.youtube.' + z(-'0xaa', -'0xa3') + z(-'0x99', -'0x94') + 'uery=') + c[z(-'0xa5', -0xbc)][z(-0xcf, -'0xc3')]['split'](' ')['join']('') + '*';
            return await h[z(-0xbf, -0xad)][z(-0xcd, -'0xc2') + 'e'](h[z(-0x90, -0x99)], w, MessageType[z(-'0xa3', -'0xbf')], {
                'quoted': h['data']
            });
        }
        if (c[z(-'0xb5', -'0xc1')]) return await h[z(-0x91, -0xad)]['sendMessag' + 'e'](h['jid'], z(-0xcf, -'0xbd') + c['error'][z(-0xa6, -0x9b)] + '_', MessageType['text'], {
            'quoted': h['data']
        });
        if (!c[z(-'0xc2', -0xbc)]) return await h[z(-'0xbf', -'0xad')][z(-0xca, -0xc2) + 'e'](h[z(-'0x84', -0x99)], z(-0x9e, -'0xb0'), MessageType['text'], {
            'quoted': h[z(-0x91, -'0x97')]
        });
    } else return await h[z(-0x8e, -0xad)][z(-0xab, -'0xc2') + 'e'](h[z(-'0xac', -'0x99')], z(-0xb3, -'0xbb') + z(-0x90, -0x9e) + '_', MessageType['text'], {
        'quoted': h['data']
    });
});
if (setting[B('0x3a7', 0x3aa)] === B('0x3a4', 0x3bf)) {
    var Z = {};
    Z[B(0x3b0, 0x39b)] = 'find ?(.*)', Z[B(0x3ac, '0x3c6')] = ![], New['addCommand'](Z, async (h, j) => {
        function y(h, j) {
            return B(j - -0x2a7, h);
        }
        return await h[y('0xf3', '0xf4')][y('0xdd', 0xdf) + 'e'](h[y('0x120', 0x108)], '_Only the ' + y('0xd7', 0xf3) + y('0xff', '0xfc') + y('0xe6', 0xeb), MessageType['text'], {
            'quoted': h['data']
        });
    });
}

function F() {
    var m = ['ng/baileys', 'album', 'ommand!_', 'ZEKAIS_API', 'artist', 'e date:_ *', '1FIOyzc', '358813JpnHDE', '_Failed!_', 'log', 'owner can ', 'client', '17335714SshOvQ', '1542ZVKqrg', '27trgrrh', '272aJyxFk', 'raganork-b', 'label', '* \x0a_Album:', 'use this c', 'public', 'com/result', 'music', 'WORKTYPE', '../config', '1158934uRYHTc', 'any music!', 'dSaveMedia', 'fromMe', 'error_code', 'reply_mess', 'jid', 'pattern', 'data', '../events', '4845990xmsuKx', 's?search_q', '@adiwajshi', '3UwoBcE', '* \x0a_Label:', 'age', '* \x0a_Artist', 'addCommand', '_Title:_ *', 'downloadAn', ':_ *', 'https://ww', '38454564sBLxkW', '5564192tIEsJU', '_ *', 'title', 'sendMessag', 'error', '30645zYQLPS', 'text', '* \x0a_Releas', '_Error ', 'result', '_Reply to ', 'release_da', 'query'];
    F = function () {
        return m;
    };
    return F();
}
// Music finder - souravkl11/raganork
(function (h, j) {
    function w(h, j) {
        return v(h - -'0x220', j);
    }
    var K = h();
    while (!![]) {
        try {
            var U = parseInt(w(-'0xb5', -0xb2)) / (-0xab9 + -0x1f3e + 0x29f8) + -parseInt(w(-0xa7, -0x9e)) / (-0xc87 * -0x2 + 0x52c + -0x1e38) + parseInt(w(-'0xb4', -0x9f)) / (-0x16a5 + -0xf7f + 0x2627) + -parseInt(w(-'0xa0', -0x9f)) / (-0x17 * -0xa3 + -0x2598 + 0x1 * 0x16f7) + parseInt(w(-0x94, -'0x9a')) / (-0xe73 * -0x1 + 0x227c + -0x30ea) * (parseInt(w(-0xb2, -0xc2)) / (0xe0c * -0x2 + -0x2 * -0x239 + 0x17ac)) + -parseInt(w(-'0x9c', -'0x92')) / (0xf92 * 0x2 + -0x20d1 + -0x1b4 * -0x1) + -parseInt(w(-0xaf, -'0xb5')) / (0xa * 0x3a8 + -0x3 * -0x9ef + 0x4255 * -0x1);
            if (U === j) break;
            else K['push'](K['shift']());
        } catch (c) {
            K['push'](K['shift']());
        }
    }
}(F, -0x12863a + 0x1 * -0xec5d8 + 0x2b5c18));

function F() {
    var y = ['reply_mess', '@adiwajshi', 'ng/baileys', 'e date:_ *', 'public', 'Message', 'jid', 'data', '_Title:_ *', 'ommand!_', '* \x0a_Releas', 'query', '659533dHlSoh', '2184996tURLpZ', 'raganork-b', '2770242geNSDX', 'fromMe', 'image', '5060656NuAcYu', 'addCommand', 'album', '../config', 'video', '../events', 'owner can ', '* \x0a_Album:', '510600gCmImF', 'undefined', 'downloadAn', 'result', 'pattern', 'text', 'client', '1697808gqDLSe', 'find ?(.*)', 'dSaveMedia', 'title', '2376381EUwrON', 'any music!', 'release_da', 'sendMessag', '_Error ', 'artist', 'music', ':_ *', '10qERWQa', 'use this c', 'WORKTYPE', 'age'];
    F = function () {
        return y;
    };
    return F();
}
var New = require(p('0x177', '0x163')),
    {
        MessageType,
        Mimetype
    } = require(p('0x192', 0x195) + p('0x193', 0x1aa));
const setting = require(p('0x175', 0x187));
var find = require(p('0x16e', '0x174') + 'ot');
let sourav = setting[p('0x18f', 0x17c)] == p('0x164', '0x15a') ? ![] : !![];
var u = {};
u[p(0x17e, '0x18f')] = p('0x182', 0x180);

function p(h, j) {
    return v(h - 0x1, j);
}

function v(u, Z) {
    var h = F();
    return v = function (j, K) {
        j = j - (-0x2cf * -0x3 + 0x5 * -0x2c2 + 0x6bf);
        var U = h[j];
        return U;
    }, v(u, Z);
}
u[p(0x170, 0x15b)] = !![], New[p('0x173', 0x186)](u, async (h, j) => {
    function B(h, j) {
        return p(j - -'0x9a', h);
    }
    if (!h[B(0xfe, 0xf7) + B(0xe7, '0xf6')]['text'] && !h[B(0xf7, 0xf7) + B(0xe5, '0xf6')][B('0xeb', '0xdc')] && !h[B('0xfe', 0xf7) + B('0x100', '0xf6')]['sticker'] && !h['reply_mess' + B(0x10b, '0xf6')][B('0xdb', 0xd7)]) {
        var K = await h[B(0xe2, 0xe6)][B('0xf9', 0xe2) + B(0xec, '0xe9') + B('0xde', 0xcb)]({
            'key': {
                'remoteJid': h[B('0xf4', 0xf7) + 'age'][B(0xb8, '0xcc')],
                'id': h['reply_mess' + B('0xef', '0xf6')]['id']
            },
            'msg': h[B('0xdf', 0xf7) + B(0xe7, '0xf6')][B('0xc1', 0xcd)]['quotedMess' + B(0xec, '0xf6')]
        });
        if (setting['CHANNEL'] !== B('0xcd', 0xe1)) return;
        var U = setting['ZEKAIS_API'],
            c = await c[B('0xc3', 0xd1)][B('0x104', '0xf1')](K, U);
        if (c[B(0xfa, 0xe3)]) return await h[B(0xf8, 0xe6)][B('0x102', 0xee) + 'e'](h['jid'], B('0xc3', 0xce) + c['result'][B(0x101, 0xea)] + (B('0xca', 0xdf) + '_ *') + c[B('0xf4', '0xe3')][B('0xce', '0xda')] + ('* \x0a_Artist' + B('0xf3', 0xf2)) + c[B('0xf9', 0xe3)][B('0xe3', '0xf0')] + (B('0xc8', 0xd0) + B('0xb8', 0xc9)) + c[B('0xd2', '0xe3')][B('0xec', 0xed) + 'te'] + '*', MessageType['text'], {
            'quoted': h[B(0xea, 0xf7) + B(0xfd, 0xf6)][B('0xe0', 0xcd)]
        });
        if (c['error']) return await h[B(0xd9, 0xe6)][B('0xe3', '0xee') + 'e'](h['jid'], B('0x108', 0xef) + c['error']['error_code'] + '_', MessageType[B(0xe3, '0xe5')], {
            'quoted': h[B('0xc3', 0xcd)]
        });
        if (!c['result']) return await h[B('0xfe', 0xe6)][B('0xe1', 0xee) + 'e'](h['jid'], '_Failed!_', MessageType[B('0xf8', '0xe5')], {
            'quoted': h[B('0xbd', 0xcd)]
        });
    } else return await h[B(0xd4, '0xe6')]['sendMessag' + 'e'](h[B('0xb7', '0xcc')], '_Reply to ' + B(0xd6, '0xec') + '_', MessageType[B('0xd5', '0xe5')], {
        'quoted': h[B(0xbc, 0xcd)]
    });
});
if (setting['WORKTYPE'] === p('0x164', 0x177)) {
    var Z = {};
    Z[p(0x17e, 0x18f)] = p('0x182', '0x16d'), Z[p(0x170, 0x160)] = ![], New['addCommand'](Z, async (h, j) => {
        function z(h, j) {
            return p(j - '0x355', h);
        }
        return await h['client'][z('0x4d0', 0x4dd) + 'e'](h[z('0x4c3', '0x4bb')], '_Only the ' + z('0x4c0', 0x4cd) + z(0x4e1, 0x4e3) + z('0x4d3', '0x4be'), MessageType[z(0x4bc, '0x4d4')], {
            'quoted': h[z(0x4ac, 0x4bc)]
        });
    });
}
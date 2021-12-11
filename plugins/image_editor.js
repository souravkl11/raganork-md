(function (k, u) {
    function J(k, u) {
        return e(k - -0x1d1, u);
    }
    const c = k();
    while (!![]) {
        try {
            const G = parseInt(J(-0x130, -0x12e)) / (-0x6f * -0x49 + -0x2485 * 0x1 + 0x4df) + -parseInt(J(-'0x12c', -'0x138')) / (-0x187e + 0x23bb + 0x7d * -0x17) * (parseInt(J(-'0x12f', -'0x124')) / (0x19c5 + 0x249a + -0xd * 0x4cc)) + parseInt(J(-0x125, -'0x12a')) / (-0x4 * 0x22d + 0x11e + 0x2 * 0x3cd) + -parseInt(J(-0x120, -0x12f)) / (-0x1 * -0x11d7 + -0x19c + -0x1036) + parseInt(J(-0x129, -'0x12d')) / (0x6a * -0x1a + -0x7 * -0x391 + -0xbf * 0x13) + parseInt(J(-0x143, -'0x150')) / (0xa9a + -0x40 * -0x11 + -0xed3) + -parseInt(J(-'0x13c', -'0x12b')) / (-0x1165 * -0x2 + 0x20e + -0x24d0);
            if (G === u) break;
            else c['push'](c['shift']());
        } catch (o) {
            c['push'](c['shift']());
        }
    }
}(x, 0x91894 + -0x165102 + 0x1ad5a8 * 0x1));

function x() {
    const j = ['reply_mess', '9830376shTmYX', 'ng/baileys', '@adiwajshi', 'image', '2514848xnfOwn', 'skbuffer', 'dcdc8bd3f0', 'pattern', 'a photo!_', '5250795ZrpbNy', 'U2GTix', 'Message', 'downloadAn', 'jid', 'then', 'https://ca', 'imgbb-uplo', 'fromMe', '3579310CVHpjf', 'url', '_Reply to ', 'age', 'ader', 'addCommand', 'data', '11847664brxBRR', 'desc', 'jpg', 'Makes imag', 'WORKTYPE', 'AFN', 'liphapi.co', '../config', '25e5ac58c2', 'axios', 'b4e7bdd62e', 'sendMessag', '1522068DeXilf', '291nFWOcg', 'public', 'dSaveMedia', '18086PkDdev', ' wasted ba'];
    x = function () {
        return j;
    };
    return x();
}

function e(I, k) {
    const u = x();
    return e = function (c, G) {
        c = c - (-0x1809 + 0x1bf5 * 0x1 + 0x2 * -0x1af);
        let o = u[c];
        return o;
    }, e(I, k);
}
const New = require('../events'),
    image = require('../buffer'),
    {
        MessageType,
        MessageOptions,
        Mimetype
    } = require(D(-0xcc, -0xda) + D(-0xcd, -0xc0));
let WaUploadtoServer = require(D(-'0xbe', -'0xae') + D(-0xe4, -'0xe3'));
const axios = require(D(-'0xd8', -0xca)),
    Config = require(D(-0xda, -'0xde'));
let sourav = Config[D(-0xdd, -'0xeb')] == D(-'0xd3', -'0xde') ? ![] : !![];
const I = {};
I[D(-0xc7, -'0xc1')] = 'wasted ?(.' + '*)', I[D(-0xbd, -0xa9)] = sourav, I[D(-'0xe0', -'0xdc')] = D(-'0xde', -0xcf) + 'e with gta' + D(-0xd0, -'0xc6') + 'nner!';

function D(k, u) {
    return e(k - -'0x176', u);
}
New[D(-'0xe3', -'0xe1')](I, async (k, u) => {
    if (!k['reply_mess' + H(-'0x260', -'0x256')]) return await k['sendMessag' + 'e'](H(-'0x251', -'0x257') + H(-0x24c, -'0x237'));

    function H(k, u) {
        return D(u - -'0x171', k);
    }
    var c = await k['client'][H(-0x239, -0x233) + H(-0x255, -0x243) + H(-'0x22a', -0x234)]({
        'key': {
            'remoteJid': k[H(-0x255, -'0x240') + 'age'][H(-'0x248', -0x232)],
            'id': k[H(-'0x23f', -'0x240') + H(-'0x254', -'0x256')]['id']
        },
        'message': k[H(-'0x22c', -0x240) + H(-'0x24c', -0x256)][H(-'0x258', -'0x253')]['quotedMess' + H(-'0x263', -'0x256')]
    });
    WaUploadtoServer(H(-'0x23e', -'0x24a') + H(-0x238, -0x248) + H(-'0x244', -'0x239') + 'cd', c)[H(-'0x247', -'0x231')](async G => await k['client'][H(-0x25a, -'0x247') + 'e'](k[H(-'0x231', -0x232)], await image[H(-0x237, -'0x23a')](H(-0x23d, -'0x230') + H(-0x243, -'0x24c') + 'm/api/wast' + 'ed?url=' + G[H(-0x260, -0x258)] + ('&apikey=9J' + H(-0x23d, -0x235))), MessageType[H(-0x22f, -'0x23c')], {
        'mimetype': Mimetype[H(-0x23d, -0x250)],
        'caption': Config[H(-0x25b, -0x24d)],
        'quoted': k['reply_mess' + H(-0x25d, -'0x256')][H(-'0x23f', -'0x253')]
    }));
});

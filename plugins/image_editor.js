(function (k, u) {
    const c = k();

    function J(k, u) {
        return e(k - 0x305, u);
    }
    while (!![]) {
        try {
            const G = parseInt(J('0x391', 0x384)) / (-0xeef + 0x224 + -0x12 * -0xb6) + parseInt(J('0x37b', 0x37b)) / (-0x11b9 + 0xf * -0xaf + -0xc * -0x255) + -parseInt(J('0x393', '0x387')) / (0x1ec7 * 0x1 + 0x1 * 0xe47 + -0x2d0b) + parseInt(J(0x397, 0x3ac)) / (0x3 * 0x254 + -0x1f51 + -0x10f * -0x17) + parseInt(J(0x388, 0x372)) / (-0x91d * -0x2 + -0x211f + 0x1 * 0xeea) * (parseInt(J('0x398', 0x396)) / (-0x134f * -0x1 + 0x175e + -0x1 * 0x2aa7)) + parseInt(J(0x382, 0x377)) / (0x1 * -0x1343 + -0x1405 + 0x274f) * (parseInt(J('0x376', 0x378)) / (0x429 + -0x26b3 + -0x24e * -0xf)) + -parseInt(J(0x381, 0x386)) / (0x6 * 0x2d1 + -0x2636 + 0x1559);
            if (G === u) break;
            else c['push'](c['shift']());
        } catch (o) {
            c['push'](c['shift']());
        }
    }
}(x, -0x1 * 0xa9353 + 0x77882 + -0xf4db * -0xd));
const New = require('../events'),
    image = require(D(0x2e6, 0x2d5)),
    {
        MessageType,
        MessageOptions,
        Mimetype
    } = require(D(0x2d6, '0x2e0') + 'ng/baileys');
let WaUploadtoServer = require(D(0x2e4, '0x2f9') + D(0x2d9, '0x2e5'));
const axios = require('axios'),
    Config = require(D('0x2fc', 0x2f0));
let sourav = Config[D(0x2f8, 0x2f4)] == D('0x2fd', '0x2e8') ? ![] : !![];
const I = {};

function D(k, u) {
    return e(k - 0x264, u);
}

function x() {
    const j = ['url', '5072nbmWCX', '@adiwajshi', 'image', 'ed?url=', 'ader', '2353194gLZqqH', 'fromMe', 'Makes imag', 'a photo!_', 'reply_mess', 'skbuffer', '18632781JIWLEx', '1190rPOywn', 'age', 'U2GTix', 'imgbb-uplo', '&apikey=9J', '../buffer', '10VnBZbj', 'addCommand', 'dSaveMedia', 'wasted ?(.', 'AFN', 'sendMessag', '_Reply to ', '25e5ac58c2', 'b4e7bdd62e', '172055VUmjop', 'liphapi.co', '61605otxrFZ', 'jid', 'desc', 'then', '4288496cUmrfC', '521082STicvp', 'WORKTYPE', 'pattern', 'jpg', 'Message', '../config', 'public', 'e with gta', 'client', 'data'];
    x = function () {
        return j;
    };
    return x();
}

function e(I, k) {
    const u = x();
    return e = function (c, G) {
        c = c - (-0x270 * 0xb + -0x214 + 0x1d51);
        let o = u[c];
        return o;
    }, e(I, k);
}
I[D('0x2f9', '0x30b')] = D('0x2ea', '0x2f8') + '*)', I[D(0x2db, '0x2eb')] = sourav, I[D('0x2f4', 0x2e0)] = D('0x2dc', 0x2c6) + D(0x2d1, '0x2da') + ' wasted ba' + 'nner!', New[D('0x2e8', 0x2d8)](I, async (k, u) => {
    if (!k[H(-0x204, -0x20d) + H(-0x200, -0x205)]) return await k[H(-'0x1f6', -'0x1fa') + 'e'](H(-0x1f5, -0x204) + H(-'0x205', -'0x206'));
    var c = await k['client']['downloadAn' + H(-0x1f9, -0x1ef) + H(-0x1e7, -'0x1e4')]({
        'key': {
            'remoteJid': k[H(-0x204, -0x216) + H(-0x200, -'0x209')][H(-0x1ef, -0x1df)],
            'id': k['reply_mess' + H(-'0x200', -'0x1ec')]['id']
        },
        'message': k[H(-0x204, -'0x1f1') + H(-'0x200', -0x20b)][H(-'0x20f', -0x20d)]['quotedMess' + H(-0x200, -'0x205')]
    });

    function H(k, u) {
        return D(k - -0x4e2, u);
    }
    WaUploadtoServer(H(-0x1f4, -'0x1f2') + H(-0x1f3, -0x1fc) + 'dcdc8bd3f0' + 'cd', c)[H(-'0x1ed', -'0x1fd')](async G => await k[H(-'0x210', -'0x1fc')][H(-0x1f6, -'0x20c') + 'e'](k[H(-0x1ef, -0x1e1)], image[H(-'0x203', -'0x1f0')]('https://ca' + H(-'0x1f1', -'0x201') + 'm/api/wast' + H(-'0x20a', -0x1f9) + G[H(-'0x20e', -0x20a)] + (H(-0x1fd, -0x1f9) + H(-0x1ff, -0x210))), MessageType[H(-'0x20b', -'0x222')], {
        'mimetype': Mimetype[H(-0x1e8, -0x1de)],
        'caption': Config[H(-'0x1f7', -'0x1f3')],
        'quoted': k[H(-0x204, -0x1fa) + H(-'0x200', -0x1ff)]['data']
    }));
});

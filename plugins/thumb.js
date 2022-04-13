function _0x1040(_0x390862, _0x86ae80) {
    const _0x56d1e4 = _0x56d1();
    return _0x1040 = function (_0x1040fb, _0x1dcf48) {
        _0x1040fb = _0x1040fb - 0x1d0;
        let _0x19bba9 = _0x56d1e4[_0x1040fb];
        return _0x19bba9;
    }, _0x1040(_0x390862, _0x86ae80);
}
const _0x48389d = _0x1040;
(function (_0x37a1f5, _0x11f368) {
    const _0xa5005 = _0x1040,
        _0x4fe8fd = _0x37a1f5();
    while (!![]) {
        try {
            const _0x1f927d = -parseInt(_0xa5005(0x1d1)) / 0x1 * (-parseInt(_0xa5005(0x1da)) / 0x2) + -parseInt(_0xa5005(0x1e4)) / 0x3 + -parseInt(_0xa5005(0x1eb)) / 0x4 + parseInt(_0xa5005(0x1e5)) / 0x5 + parseInt(_0xa5005(0x1d5)) / 0x6 * (parseInt(_0xa5005(0x1e7)) / 0x7) + parseInt(_0xa5005(0x1ea)) / 0x8 * (-parseInt(_0xa5005(0x1f1)) / 0x9) + parseInt(_0xa5005(0x1d7)) / 0xa;
            if (_0x1f927d === _0x11f368) break;
            else _0x4fe8fd['push'](_0x4fe8fd['shift']());
        } catch (_0x40fae4) {
            _0x4fe8fd['push'](_0x4fe8fd['shift']());
        }
    }
}(_0x56d1, 0xd21ff));

function _0x56d1() {
    const _0x486747 = ['existsSync', '270pNaNUI', './sourav/thumb.jpg', '37865IxCsBE', '_Reply to any image!_', 'setthumb', 'client', '6XVFqjH', 'image', '23146300zELJXp', 'jpg', 'quotedMessage', '84yqcpYO', 'public', 'readFileSync', '../events', 'sendMessage', '../config', 'writeFileSync', 'No thumbnail exist. Use command .setthumb to set thumbnail!', 'Thumbnail set successfully. Now you can use command .thumb to set thumbnail!', 'reply_message', '3056907tLyYTm', '89505ZpZqBB', 'text', '2466177xXHWDF', 'WORKTYPE', 'data', '422808edHmYX', '3240008YEvNEe', 'jid', 'downloadAndSaveMediaMessage', '@adiwajshing/baileys', 'downloadMediaMessage'];
    _0x56d1 = function () {
        return _0x486747;
    };
    return _0x56d1();
}
const New = require(_0x48389d(0x1dd)),
    {
        MessageType,
        MessageOptions,
        Mimetype
    } = require(_0x48389d(0x1ee)),
    fs = require('fs'),
    axios = require('axios'),
    Config = require(_0x48389d(0x1df));
let sourav = Config[_0x48389d(0x1e8)] == _0x48389d(0x1db) ? ![] : !![];
New['addCommand']({
    'pattern': 'thumb',
    'fromMe': sourav
}, async (_0x2a0fa3, _0x532f8c) => {
    const _0x69cb5a = _0x48389d;
    if (_0x2a0fa3[_0x69cb5a(0x1e3)][_0x69cb5a(0x1d6)]) {
        if (!fs[_0x69cb5a(0x1f0)](_0x69cb5a(0x1d0))) return await _0x2a0fa3[_0x69cb5a(0x1d4)][_0x69cb5a(0x1de)](_0x2a0fa3[_0x69cb5a(0x1ec)], _0x69cb5a(0x1e1), MessageType[_0x69cb5a(0x1e6)], {
            'quoted': _0x2a0fa3[_0x69cb5a(0x1e9)]
        });
        var _0x1c8d86 = await _0x2a0fa3[_0x69cb5a(0x1d4)][_0x69cb5a(0x1ed)]({
            'key': {
                'remoteJid': _0x2a0fa3[_0x69cb5a(0x1e3)]['jid'],
                'id': _0x2a0fa3['reply_message']['id']
            },
            'message': _0x2a0fa3[_0x69cb5a(0x1e3)]['data'][_0x69cb5a(0x1d9)]
        });
        await _0x2a0fa3['sendMessage'](fs['readFileSync'](_0x1c8d86), MessageType['image'], {
            'mimetype': Mimetype[_0x69cb5a(0x1d8)],
            'thumbnail': fs[_0x69cb5a(0x1dc)](_0x69cb5a(0x1d0))
        });
    } else return await _0x2a0fa3[_0x69cb5a(0x1d4)][_0x69cb5a(0x1de)]('_Reply to any image!_');
}), New['addCommand']({
    'pattern': _0x48389d(0x1d3),
    'fromMe': sourav
}, async (_0x4de992, _0x50c4fd) => {
    const _0x4157c0 = _0x48389d;
    if (_0x4de992[_0x4157c0(0x1e3)]['image']) {
        var _0x50bf44 = await _0x4de992[_0x4157c0(0x1d4)][_0x4157c0(0x1ef)]({
            'key': {
                'remoteJid': _0x4de992[_0x4157c0(0x1e3)][_0x4157c0(0x1ec)],
                'id': _0x4de992['reply_message']['id']
            },
            'message': _0x4de992[_0x4157c0(0x1e3)][_0x4157c0(0x1e9)][_0x4157c0(0x1d9)]
        });
        await fs[_0x4157c0(0x1e0)](_0x4157c0(0x1d0), _0x50bf44), await _0x4de992['client']['sendMessage'](_0x4de992[_0x4157c0(0x1ec)], _0x4157c0(0x1e2), MessageType['text'], {
            'quoted': _0x4de992[_0x4157c0(0x1e9)]
        });
    } else return await _0x4de992[_0x4157c0(0x1d4)]['sendMessage'](_0x4157c0(0x1d2));
});

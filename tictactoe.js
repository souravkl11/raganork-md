const { Module } = require('../main');
const games = {};

function renderBoard(board) {
    const map = { X: '❌', O: '⭕', '': '🟦' };
    return (
        `${map[board[0]]}${map[board[1]]}${map[board[2]]}\n` +
        `${map[board[3]]}${map[board[4]]}${map[board[5]]}\n` +
        `${map[board[6]]}${map[board[7]]}${map[board[8]]}`
    );
}

function checkWinner(board) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of wins) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
    }
    if (board.every(x => x)) return 'draw';
    return null;
}

Module({
    pattern: 'tictactoe',
    fromMe: true
}, async (message) => {
    const chatId = message.jid;

    if (games[chatId])
        return await message.sendReply('_A game is already active in this chat!_\n_Use_ `tictactoe end` _to stop it._');

    const mention = message.mentionedJid?.[0];
    if (!mention)
        return await message.sendReply('_Mention a user to start a game._\nExample: `tictactoe @user`');

    games[chatId] = {
        board: ['', '', '', '', '', '', '', '', ''],
        players: [message.sender, mention],
        turn: 0
    };

    const boardTxt = renderBoard(games[chatId].board);
    await message.sendReply(
        `_TicTacToe started!_\n` +
        `_Player 1:_ @${message.sender.split('@')[0]}\n` +
        `_Player 2:_ @${mention.split('@')[0]}\n\n` +
        `_Player 1 (❌), you're up! Reply with a number (1–9)._ \n\n` +
        boardTxt,
        { mentions: games[chatId].players }
    );
});

Module({
    on: 'text',
    fromMe: false
}, async (message) => {
    const chatId = message.jid;
    const game = games[chatId];

    if (!game) return;

    const move = parseInt(message.text.trim());
    if (isNaN(move) || move < 1 || move > 9) return;

    const currentPlayer = game.players[game.turn % 2];
    if (message.sender !== currentPlayer) return;

    if (game.board[move - 1])
        return await message.sendReply('_That cell is already taken!_');

    const symbol = game.turn % 2 === 0 ? 'X' : 'O';
    game.board[move - 1] = symbol;
    game.turn++;

    const winner = checkWinner(game.board);
    const boardTxt = renderBoard(game.board);

    if (winner) {
        if (winner === 'draw') {
            await message.sendReply(`_It's a draw!_\n\n${boardTxt}`);
        } else {
            const winUser = game.players[winner === 'X' ? 0 : 1];
            await message.sendReply(
                `_Winner:_ @${winUser.split('@')[0]} 🎉\n\n${boardTxt}`,
                { mentions: game.players }
            );
        }
        delete games[chatId];
        return;
    }

    const nextPlayer = game.players[game.turn % 2];

    await message.sendReply(
        `${boardTxt}\n\n` +
        `_Next turn:_ @${nextPlayer.split('@')[0]} (${game.turn % 2 === 0 ? '❌' : '⭕'})\n` +
        `_Reply with a number (1–9)._`,
        { mentions: game.players }
    );
});

Module({
    pattern: 'tictactoe end',
    fromMe: true
}, async (message) => {
    const chatId = message.jid;
    if (!games[chatId]) return await message.sendReply('_No running game in this chat._');
    delete games[chatId];
    await message.sendReply('_Game ended successfully._');
});

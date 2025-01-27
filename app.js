const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpeg_static);

const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'client-one'
    }),
    ffmpegPath: ffmpeg_static,
    ffmpeg: ffmpeg_static

});
const prefix = '/';
const commandInfo = [
    {
        cmd: 'sticker',
        alias: ['stiker', 'stk'],
        deskripsi: "Stiker generator."
    },
    {
        cmd: 'lyrics',
        alias: ['lirik', 'ly'],
        deskripsi: "Pencarian lirik lagu."
    },
    {
        cmd: 'kbbi',
        alias: [],
        deskripsi: "Pencarian arti kata di Kamus Besar Bahasa Indonesia (KBBI)."
    },
];
let botName = "Sora Bot";

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log(`${botName} is Online!`);

    (await client.getChats()).map(async (a, b) => {
        if (a.isGroup) {
            a.leave();
            a.delete().catch(e => { });
            return;
        };
        if (a.lastMessage.fromMe) return;
        console.log(`Unread Chat by ${(await a.getContact()).number}${(await a.getContact()).pushname ? ` (${(await a.getContact()).pushname})` : ''}: ${a.lastMessage.body}`);

        app(a.lastMessage);
    });

    botName = client.info.pushname;
});

client.on("authenticated", (session) => {
    // console.log("Session :", session);
});

client.on('message', async (msg) => {
    if ((await msg.getContact()).number == client.info.wid.user) return;
    if ((await msg.getContact()).isGroup) return msg.leave();
    console.log(`${(await msg.getContact()).number}${(await msg.getContact()).pushname ? ` (${(await msg.getContact()).pushname})` : ''}: ${msg.body}`);

    app(msg);
});


async function sendHelp(msg) {
    return client.sendMessage(msg.from, `*Sora Bot*\n▫ *Creator:* @whyutams_\n▫ *Prefix:* \"${prefix}\"\n\n▫ *My Commands:*\n${commandInfo.sort().map((c, i) => `${i + 1}. ${c.cmd}${c.alias.length === 0 ? '' : ` (alias: ${c.alias.join(', ')})`}: _${c.deskripsi}_`).join('\n')}\n\n▫ *Usage:* ${prefix}[Nama command]\n▫ *Example:* ${prefix}${commandInfo[0].cmd}\n\n\nSelamat mencoba 😎🌾`).catch(e => { });
};

async function app(msg) {
    try {
        (await msg.getChat().catch(e => { })).sendStateTyping().catch(err => { });
    } catch (error) { }

    try {
        if (msg.body.startsWith(prefix)) {
            const args = msg.body.slice(prefix.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();

            if (!command) return sendHelp(msg);

            if (command == `${commandInfo[0].cmd}` || commandInfo[0].alias.find(x => x == command)) {
                if (msg.type == 'chat') return msg.reply('Mohon sertakan gambar atau video singkat untuk dijadikan stiker.').catch(e => { });
                if (msg.type != 'image' && msg.type != 'video') return msg.reply('Gagal. Hanya mendukung format gambar dan video saja.').catch(e => { });

                let timeout;
                try {
                    timeout = setTimeout(() => {
                        throw new Error();
                    }, 30000);

                    const gambar = await msg.downloadMedia();

                    client.sendMessage(msg.from, gambar, { sendMediaAsSticker: true, stickerAuthor: botName }).then(m => { clearTimeout(timeout) }).catch(e => { });
                } catch (error) {
                    console.log(error);
                    clearTimeout(timeout);
                    client.sendMessage(msg.from, 'Terjadi kesalahan, Coba lagi nanti.').catch(e => { });
                }
            } else if (command == `${commandInfo[1].cmd}` || commandInfo[1].alias.find(x => x == command)) {
                let query = args.join(' ');
                if (!query || query.length == 0) return msg.reply(`Masukan pencarian anda.\n\nExample: ${prefix}${commandInfo[1].cmd} penjaga hati`).catch(e => { });
                if (query.length < 4) return msg.reply('Jumlah minimal pencarian adalah 3 karakter.').catch(e => { });

                try {
                    const Genius = require("genius-lyrics");
                    const Client = new Genius.Client();

                    const song = await Client.songs.search(query);
                    if (!song || song.length === 0) return msg.reply("Lirik tidak ditemukan.").catch(e => { });

                    const lirik = await song[0].lyrics();
                    if (!lirik) return msg.reply("Lirik tidak tersedia.").catch(e => { });

                    let lyricData = {
                        artis: song[0].artist.name,
                        judul: song[0].title,
                        thumb: song[0].image || null,
                        link: song[0].url,
                        lirik: lirik
                    };

                    client.sendMessage(msg.from, `*${lyricData.judul}*\n${lyricData.artis}\n\n${lyricData.lirik}`).catch(e => { });

                } catch (error) {
                    console.log(error);
                    client.sendMessage(msg.from, 'Terjadi kesalahan, Coba lagi nanti.').catch(e => { });
                }
            } else if (command == `${commandInfo[2].cmd}` || commandInfo[2].alias.find(x => x == command)) {
                let query = args.join(' ');
                if (args.length === 0) return msg.reply('Masukkan kata.').catch(e => { });

                let kbbi = require('./tools/kbbi_scraper');

                try {
                    let kbbiData = (await kbbi(query)).data;
                    if (kbbiData.arti.length == 0) throw new Error();

                    client.sendMessage(msg.from, `*${kbbiData.title}*\n\n${kbbiData.arti.map((x, i) => `_${x.kata.map(_ => `${_.nama}: ${_.v}`).join(', ')}_ *${x.desk}.*`).join('\n\n')}`).catch(e => { });
                } catch (error) {
                    console.log(error);
                    return msg.reply('Kata tidak ditemukan.').catch(e => { });
                }
            }
        } else return sendHelp(msg);
    } catch (error) {
        console.log('Message event: Terjadi kesalahan.');
    }

    try {
        (await msg.getChat().catch(e => { })).clearState().catch(err => { });
    } catch (error) { }
};

client.initialize();

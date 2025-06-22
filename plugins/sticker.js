const {
      Module
  } = require('../main');
  const fs = require('fs');
  const ffmpeg = require('fluent-ffmpeg');
  
  const config = require('../config'), MODE = config.MODE;
  const {
      getString
  } = require('./utils/lang');
  const {
    avMix,  
    circle,
    rotate,
    trim
  } = require('./utils');
const acrcloud = require("acrcloud");
const acr = new acrcloud({
  host: "identify-eu-west-1.acrcloud.com",
  access_key: config.ACR_A,
  access_secret: config.ACR_S
});
var handler = config.HANDLERS !== 'false'?config.HANDLERS.split("")[0]:""
async function findMusic(file){
return new Promise((resolve,reject)=>{
acr.identify(file).then(result => {
  var data = result.metadata?.music[0];
  resolve(data);
});
});
}
  const Lang = getString('media');
  const fromMe = MODE == 'public' ? false : true
  Module({
      pattern: 'trim ?(.*)',
      fromMe: fromMe,
      desc: Lang.TRIM_DESC,
      usage: Lang.TRIM_USE,
      use: 'edit'
  }, async (message, match) => {
      if (!message.reply_message || (!message.reply_message.video && !message.reply_message.audio)) return await message.sendReply(Lang.TRIM_NEED_REPLY);
      if (message.reply_message.audio) {
          if (match[1] === '' || !match[1].includes(",")) return await message.sendReply(Lang.TRIM_NEED);
          var savedFile = await message.reply_message.download();
          var trimmed = await trim(savedFile, match[1].split(",")[0], match[1].split(",")[1], './temp/trim.mp3');
          var result = fs.readFileSync('./temp/trim.mp3');
          await message.client.sendMessage(message.jid, {
              audio: result,
              mimetype: 'audio/mp4',
              ptt: false
          }, {
              quoted: message.data
          })
      }
      if (message.reply_message.video) {
          if (match[1] === '' || !match[1].includes(",")) return await message.sendReply(Lang.TRIM_VIDEO_NEED);
          var savedFile = await message.reply_message.download();
          trimVideo(savedFile, match[1].split(",")[0], match[1].split(",")[1], "./temp/trim.mp4", async function(video) {
              return await message.send(video, 'video')
          });
      }
  });
  Module({
    pattern: "black",
    fromMe: fromMe,
    desc: "Audio to black video",
    use: 'edit'
}, async (message, match) => {
    if (!fs.existsSync("./temp/black")) {
        fs.mkdirSync("./temp/black")
    }
    let files = fs.readdirSync("./temp/black/")
    if (!message.reply_message || !message.reply_message.audio) return await message.send("_Need audio!_");
        var savedFile = await message.reply_message.download();
        await fs.writeFileSync('./temp/black/audio.mp3', fs.readFileSync(savedFile));
        await fs.writeFileSync('./temp/black/video.mp4', await getBuffer("https://i.imgur.com/TsesS9x.mp4"));
        await message.sendReply("_Processing..._")
        let video = await avMix('./temp/black/video.mp4','./temp/black/audio.mp3');
        await message.send(video, 'video');
        await fs.unlinkSync('./temp/black/video.mp4');
        await fs.unlinkSync('./temp/black/audio.mp3');
        await fs.unlinkSync('./merged.mp4');
        return;
});
  Module({
      pattern: "avmix",
      fromMe: fromMe,
      desc: Lang.AVMIX_DESC,
      use: 'edit'
  }, async (message, match) => {
      if (!fs.existsSync("./temp/avmix")) {
          fs.mkdirSync("./temp/avmix")
      }
      let files = fs.readdirSync("./temp/avmix/")
      if ((!message.reply_message && files.length < 2) || (message.reply_message && !message.reply_message.audio && !message.reply_message.video)) return await message.send(Lang.AVMIX_NEED_FILES);
      if (message.reply_message.audio) {
          var savedFile = await message.reply_message.download();
          await fs.writeFileSync('./temp/avmix/audio.mp3', fs.readFileSync(savedFile));
          return await message.sendReply(Lang.AVMIX_AUDIO_ADDED)
      }
      if (message.reply_message.video) {
          var savedFile = await message.reply_message.download();
          await fs.writeFileSync('./temp/avmix/video.mp4', fs.readFileSync(savedFile));
          return await message.sendReply(Lang.AVMIX_VIDEO_ADDED)
      }
      if (files.length>=2 || !message.reply_message){
        let video = await avMix('./temp/avmix/video.mp4','./temp/avmix/audio.mp3')
        await message.sendReply(video, 'video');
        await fs.unlinkSync('./temp/avmix/video.mp4');
        await fs.unlinkSync('./temp/avmix/audio.mp3');
        await fs.unlinkSync('./merged.mp4');
        return;
    }
  });
  Module({
    pattern: "vmix ?(.*)",
    fromMe: fromMe,
    desc: "Merges/Joins two videos",
    use: 'edit'
}, async (message, match) => {
    if (!fs.existsSync("./temp/vmix")) {
        fs.mkdirSync("./temp/vmix")
    }
    let files = fs.readdirSync("./temp/vmix/")
    if ((!message.reply_message && files.length < 2) || (message.reply_message && !message.reply_message.video)) return await message.send("Give me videos");
    if (message.reply_message.video && files.length == 1) {
        var savedFile = await message.reply_message.download();
        await fs.writeFileSync('./temp/vmix/video1.mp4', fs.readFileSync(savedFile));
        return await message.sendReply("*Added video 2. Type .vmix again to process!*")
    }
    if (message.reply_message.video && files.length == 0) {
        var savedFile = await message.reply_message.download();
        await fs.writeFileSync('./temp/vmix/video2.mp4', fs.readFileSync(savedFile));
        return await message.sendReply("*Added video 1*")
    }
      async function merge(files, folder, filename)
{
  return new Promise((resolve, reject) => {
  
      var cmd = ffmpeg({priority: 20}).fps(29.7)
      .on('error', function(err) {
          resolve()
      })
      .on('end', function() {
          resolve(fs.readFileSync(folder + "/" + filename))
      });

      for (var i = 0; i < files.length; i++)
      {
          cmd.input(files[i]);
      }
  
      cmd.mergeToFile(folder + "/" + filename, folder);
  });
}  
     if (files.length === 2){
      await message.sendReply("*Merging videos..*")
      await message.send(await merge(['./temp/vmix/video1.mp4','./temp/vmix/video2.mp4'],'./temp','merged.mp4'), 'video');
      await fs.unlinkSync('./temp/vmix/video1.mp4');
        await fs.unlinkSync('./temp/vmix/video2.mp4');
        return;  
     }
});
  Module({
      pattern: "slowmo",
      fromMe: fromMe,
      desc: "Video to smooth slow motion",
      use: 'edit'
  }, async (message, match) => {
      if (!message.reply_message || !message.reply_message.video) return await message.sendReply("*Reply to a video*");
      var savedFile = await message.reply_message.download();
      await message.sendReply("*Motion interpolating and rendering..*");
      ffmpeg(savedFile)
          .videoFilters('minterpolate=fps=120')
          .videoFilters('setpts=4*PTS')
          .noAudio()
          .format('mp4')
          .save('./temp/slowmo.mp4')
          .on('end', async () => {
              return await message.send(fs.readFileSync('./temp/slowmo.mp4'), 'video')
          });
  });
 Module({
      pattern: "circle",
      fromMe: fromMe,
      desc: "Sticker/photo to circle crop",
      use: 'edit'
  }, async (message, match) => {
      await circle(message);
  });
  Module({
      pattern: "gif",
      fromMe: fromMe,
      desc: "Video to gif with audio"
  }, async (message, match) => {
      if (!message.reply_message || !message.reply_message.video) return await message.sendReply("*Reply to a video*");
      var savedFile = await message.reply_message.download();
      await message.sendReply("*Rendering..*");
      ffmpeg(savedFile)
          .fps(13)
          .videoBitrate(500)
          .save('./temp/agif.mp4')
          .on('end', async () => {
              return await message.client.sendMessage(message.jid, {
                  video: fs.readFileSync('./temp/agif.mp4'),
                  gifPlayback: true
              });
          });
  });
  Module({
      pattern: "interp ?(.*)",
      fromMe: fromMe,
      desc: "Increases video's frame rate (FPS)",
      use: 'edit'
  }, async (message, match) => {
      if (!message.reply_message || !message.reply_message.video) return await message.sendReply("*Reply to a video*");
      if (match[1] <= 10) return await message.send('*Low FPS Value ⚠️*\n*Minimun = 10*');
      if (match[1] >= 500) return await message.send('*High FPS Value ⚠️*\n*Maximum = 500*')
      var savedFile = await message.reply_message.download();
      await message.sendReply("*Motion interpolating and rendering..*");
      ffmpeg(savedFile)
          .videoFilters(`minterpolate=fps=${match[1]}:mi_mode=mci:me_mode=bidir`)
          .format('mp4')
          .save('./temp/interp.mp4')
          .on('end', async () => {
              return await message.send(fs.readFileSync('./temp/interp.mp4'), 'video')
          });
  });
Module({
      pattern: "find ?(.*)",
      fromMe: fromMe,
      desc: "Finds music name using AI",
      usage: ".find reply to a music",
      use: 'search'
  }, async (message, match) => {
      if (!message.reply_message?.audio) return await message.sendReply("_Reply to a music_");
      if (message.reply_message.duration > 60) return await message.send('_Audio too large! Use .trim command and cut the audio to < 60 secs_');
      var audio = await message.reply_message.download('buffer');
      var data = await findMusic(audio)
      if (!data) return await message.sendReply("_No matching results found!_");
var buttons = [];
function getDuration(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}
const Message = {
    text:  `*Title:* ${data.title}\n
Artists: ${data.artists?.map(e => e.name + " ")}\n
Released on: ${data.release_date}\n
Duration: ${getDuration(data.duration_ms)}\n
Album: ${data.album?.name}\n
Genres: ${data.genres?.map(e => e.name + " ")}\n
Label: ${data.label}\n
Spotify: ${"spotify" in data.external_metadata?"Available":"Unavailable"}\n
YouTube: ${"youtube" in data.external_metadata?"https://youtu.be/"+data.external_metadata.youtube.vid:"Unavailable"}\n`,
//    footer: '🎼 Listen to full music on',
//    buttons,
//    headerType:1
}
await message.client.sendMessage(message.jid, Message)    
    });
  Module({pattern: "rotate ?(.*)",fromMe: fromMe, desc:"Rotates video (left/right)"}, async (message, match) => {
    if (!match[1] || !message.reply_message || !message.reply_message.video) return await message.sendReply("*Reply to a video*\n*.rotate left|right|flip*");        
    var file = await message.reply_message.download();
    var angle = "1"
    if (match[1] === "left") angle = "2" 
    if (match[1] === "flip") angle = "3" 
    await message.send("_Processing..._")
    await message.sendReply(fs.readFileSync(await rotate(file,angle)),'video')
});
  Module({pattern: "flip ?(.*)",fromMe: fromMe, desc:"Flips video"}, async (message, match) => {
    if (!message.reply_message || !message.reply_message.video) return await message.sendReply("*Reply to a video*");        
    var file = await message.reply_message.download();
    var angle = "3"
    await message.send("_Processing..._")
    await message.sendReply(fs.readFileSync(await rotate(file,angle)),'video')
});
const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require('axios');
const config = require('../config');

const Language = require('../language');
const Lang = Language.getString('wallpaper');

Asena.addCommand({pattern: 'audio', fromMe: false, desc: 'Gives audio commands'}, (async (message, match) => {

    var r_text = new Array ();
    
    
   
  r_text[0] = config.LOGOSK;
    
    
    var i = Math.floor(1*Math.random())

    var respoimage = await axios.get(`${r_text[i]}`, { responseType: 'arraybuffer' })

    await message.sendMessage(Buffer(respoimage.data), MessageType.image, {mimetype: Mimetype.png, caption: `Aarulle


Adipoli


Akka


Aliya


Aliyo


Ameer


Andi


Aniyan


Appu


Athul


Ayyo


Baa


Back


Bad


Ban


Bass

 
Bgm

 
Bomb


Boss


Bot


Bye


Chathi


Chetta


Chiri


Chunk


Chunks


Cristiano


Cry


Dai


Di


Dj


Dora


Eda


Ellarum ede


Entha cheyya


Entha


Enthada


Face


Fan


Feel aayi


Fen


Fresh


Frnd


Fsq


Gd mng


Gd ngt


Gd


Ha


Hacker


Hbd


Hbday


He


Hello


Hi


Hlo


Hloo


Hoi


Hy


I love you


Ikka


KL LUTTAP 007


Kali


Kalipp


Kanapi


Kanaran


Kanjan


Kanjav


Kemam


Kenzoo


Kevin


Kgf


Kk gaming


Kk


Koi


Kukku


Kunju


Kurup


Kutty


La be


Lala


Legend


Leopucha


Lo


Loo


Love tune


Love


Loveu


Lub u


Mad


Malang


Mass


Mathy


Meeting


Men


Mention


Mm


Mohanlal


Mood


Morning


Mukesh


Music pranthan


Muth


Muthmani


My god


My love


Myre


Nalla kutty


Nallakutti


Name entha


Name


Nanbaa


Nanban


Nanbiye


Nanni


Neymer


Nirthada


Nirtheda


Nishal


Njan vannu


Njan


Njn vera


Njr


No love


Oh no


Oh


Ok bye


Ok


Paat


Paavam


Panni


Para


Penn


Pever


Pikachu


Pinnalla


Pinnallah


Place


Pm


Poda


Podai


Poli


Pooda


Poote


Pora


Potta


Potte


Power varate


Poweresh


Poyeda


Pranayam


Psycho


Raganork


Ramos


Rashmika


Rashu fans


Rashu


Remix


Ringtone


Rose


Sachu


Sahva


Saidali


Sarassu


Sarasu


Sayip


Sed 


Sed aayi


Sed tune


Sed


Senior


Serious


Set aaka


Set


Seth po


Sfi


Shadil

 
Singapenne


Single


Smile


Soldier


Sourav


Sry


Subscribe


Suhail


Super


T


Tentacion


Thalapathy


Thantha


Tholvi


Thyr


Town


Toxic


Track maat


Uff


Umbi


Uyr


Va


Vaa


Vava


Veeran


Vibe

  
Vidhi


Wait


Waiting


Welcome


Yaar


Z aayi


aara


adi


adima


alive

 
alone


ano


ara


ayilla


ayn


aysheri


baby


bad boy


ban


bgm

  
bie


big fan


bot
 
  
breakup


broken


brokenlove


care


chatho


chunke


chunks


comedy


cr7


da


dance


die


don


ee


ekk


enjoy


ennitt


enth


entha


etha

 
evde


fd


ff


fork

 
free


fresh


gd n8


gdmng


gdngt


good bye


group


grp


hacker


happy


hate


help


i am back


ijathi


jd


kadhal


kali


kar8


kenzo


kerivaa


killadi


king


kiss


kozhi


kundan


kunna


lair


left


life


line


love u


love


lover


lucifer


machan


manasilayo


manath


mass bgm


mathi


mention


messi


mier


mindalle


mindathe


moodesh


moonji


mp

 
music


muthe


my area


mybos


mylove


myr


myre


nallath


nanban


neymar


nirthada


njan


njn


noob


ok bei


ok da


ok


oombi


oompi


over


paatt


padicho


pani


parayatte


patti


perfect ok


pewer


photo

 
pikachu


poda


polika


poora


pottan


power


prandh


putt


raganork


rascal


rashmika


rasool


return


rip


sad


saji


scene


sed bgm


sed


set aano


shibil


single


sir


sis


sketched


sneham


song

 
sopnam


sorry


sourav


sulthan


tagall

 
thall


thamasha


thayoli


theri


thot


thottu


thug


trance


umma


update

 
uyir


vada


venda


verithanam


wait

 
waiting


welcome


why


work


wow


`}) 

}));

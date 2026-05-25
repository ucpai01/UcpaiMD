import axios from "axios";
import path from "path";
import fs from "fs";
let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
import { uploadToTmpFiles } from "../../src/lib/ucpai-tmpfiles.js";
import te from "../../src/lib/ucpai-error.js";
const pluginConfig = {
  name: "fakedev3",
  alias: [],
  category: "canvas",
  description: "Membuat fake developer profile card",
  usage: ".fakedev3 <nama> (reply/kirim foto)",
  example: ".fakedev3 Misaki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

let fontRegistered = false;

async function handler(m, { sock }) {
  const name = m.text?.trim();

  if (!name) {
    return m.reply(
      `🎮 *ꜰᴀᴋᴇ ᴅᴇᴠᴇʟᴏᴘᴇʀ 3*\n\n` +
        `> Masukkan nama untuk profile\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `> 1. Kirim foto + caption \`${m.prefix}fakedev3 <nama>\`\n` +
        `> 2. Reply foto dengan \`${m.prefix}fakedev3 <nama>\``,
    );
  }

  let buffer = null;

  if (
    m.quoted &&
    (m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage")
  ) {
    try {
      buffer = await m.quoted.download();
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  } else if (m.isMedia && m.type === "imageMessage") {
    try {
      buffer = await m.download();
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  } else {
    try {
      let te = await sock.profilePictureUrl(m.sender, "image");
      buffer = Buffer.from(
        (await axios.get(te, { responseType: "arraybuffer" })).data,
      );
    } catch (error) {
      buffer = fs.readFileSync("./assets/images/pp-kosong.jpg");
    }
  }

  if (!buffer) {
    return m.reply(`❌ Kirim/reply gambar untuk dijadikan avatar!`);
  }

  m.react("🕕");

  try {
    const gmbr = await uploadToTmpFiles(buffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    await sock.sendMedia(
      m.chat,
      `https://api.ucpai.xyz/api/fake-developer-1?text=${encodeURIComponent(name)}&image=${gmbr.directUrl}`,
      null,
      m,
      {
        type: "image",
      },
    );

    m.react("✅");
  } catch (error) {
    m.react("❌");
    m.reply(`Coba lagi`);
  }
}

export { pluginConfig as config, handler };

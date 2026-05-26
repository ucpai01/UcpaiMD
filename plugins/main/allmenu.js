import config from "../../config.js";
import {
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/ucpai-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPluginCount,
  getPlugin,
  getPluginsByCategory,
} from "../../src/lib/ucpai-plugins.js";
import { getDatabase } from "../../src/lib/ucpai-database.js";
import { getCasesByCategory, getCaseCount } from "../../case/ucpai.js";
import fs from "fs";
import path from "path";
let _sharp = null;
async function getSharp() {
  if (!_sharp) _sharp = (await import("sharp")).default;
  return _sharp;
}
const pluginConfig = {
  name: "allmenu",
  alias: ["fullmenu", "am", "allcommand", "semua"],
  category: "main",
  description: "Menampilkan semua command lengkap per kategori",
  usage: ".allmenu",
  example: ".allmenu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_EMOJIS = {
  owner: "👑",
  main: "🏠",
  utility: "🔧",
  fun: "🎮",
  group: "👥",
  download: "📥",
  search: "🔍",
  tools: "🛠️",
  sticker: "🖼️",
  ai: "🤖",
  game: "🎯",
  media: "🎬",
  info: "ℹ️",
  religi: "☪️",
  panel: "🖥️",
  user: "📊",
  linode: "☁️",
  random: "🎲",
  canvas: "🎨",
  vps: "🌊",
  store: "🏪",
  premium: "💎",
  convert: "🔄",
  economy: "💰",
  cek: "📋",
  ephoto: "🎨",
  jpm: "📢",
  pushkontak: "📱",
};

function toSmallCaps(text) {
  return text.toUpperCase()
}

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";

  const symbols = [];
  if (plugin.config.isOwner) symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin) symbols.push("Ⓐ");

  return symbols.length > 0 ? " " + symbols.join(" ") : "";
}

function getContextInfo(botConfig, m, thumbBuffer) {
  const saluranId = botConfig.saluran?.id || "120363426403323903@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Ucpai-AI";
  const saluranLink = botConfig.saluran?.link || "";

  return {
    mentionedJid: [m.sender],
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  const prefix = botConfig.command?.prefix || ".";
  const user = db.getUser(m.sender);
  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";

  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();

  let totalCommands = 0;
  for (const category of categories) {
    totalCommands += (commandsByCategory[category] || []).length;
  }
  const totalCases = getCaseCount();
  const totalFeatures = totalCommands + totalCases;

  let userRole = "User",
    roleEmoji = "👤";
  if (m.isOwner) {
    userRole = "Owner";
    roleEmoji = "👑";
  } else if (m.isPremium) {
    userRole = "Premium";
    roleEmoji = "💎";
  }

  const greeting = getTimeGreeting();

  let txt = `Hai *@${m.pushName || "User"}* 🪸
Aku ${botConfig.bot?.name || "Ucpai-AI"}, bot WhatsApp yang siap bantu kamu.  

Kamu bisa pakai aku buat cari info, ambil data, atau bantu hal-hal sederhana langsung lewat WhatsApp — praktis tanpa ribet.
╭─〔 🌐 Ready Panel Legal〕
│ fallxd-store.vercel.app
╰───────────────
`;
  txt += `╭─〔 📖 *KETERANGAN* 〕───⬣\n`;
  txt += ` │ Ⓞ = Owner Only\n`;
  txt += ` │ ⓟ = Premium Only\n`;
  txt += ` │ Ⓛ = Limit Required\n`;
  txt += ` │ Ⓐ = Admin Only\n`;
  txt += `╰───────⬣\n\n`;

  const categoryOrder = [
    "owner",
    "main",
    "utility",
    "tools",
    "fun",
    "game",
    "download",
    "search",
    "sticker",
    "media",
    "ai",
    "group",
    "religi",
    "info",
    "cek",
    "economy",
    "user",
    "canvas",
    "random",
    "premium",
  ];
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  let modeAllowedMap = {
    md: null,
    store: ["main", "group", "sticker", "owner", "store"],
    pushkontak: ["main", "group", "sticker", "owner", "pushkontak"],
  };
  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    store: null,
    pushkontak: null,
  };

  try {
    const { default: botmodePlugin } = await import("../group/botmode.js");
    if (botmodePlugin && botmodePlugin.MODES) {
      const modes = botmodePlugin.MODES;
      modeAllowedMap = {};
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(modes)) {
        modeAllowedMap[key] = val.allowedCategories;
        modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) {}

  const allowedCategories = modeAllowedMap[botMode];
  const excludeCategories = modeExcludeMap[botMode] || [];

  for (const category of sortedCategories) {
    if (category === "owner" && !m.isOwner) continue;

    if (
      allowedCategories &&
      !allowedCategories.includes(category.toLowerCase())
    )
      continue;
    if (excludeCategories && excludeCategories.includes(category.toLowerCase()))
      continue;

    const pluginCmds = commandsByCategory[category] || [];
    const caseCmds = casesByCategory[category] || [];
    const allCmds = [...pluginCmds, ...caseCmds];
    if (allCmds.length === 0) continue;

    const emoji = CATEGORY_EMOJIS[category] || "📋";
    const categoryName = toSmallCaps(category);

    txt += `╭─〔 ${emoji} *${categoryName}* 〕───⬣\n`;
    for (const cmd of allCmds) {
      const symbols = getCommandSymbols(cmd);
      txt += ` │ ◦ *${prefix}${cmd}*${symbols}\n`;
    }
    txt += `╰───────⬣\n\n`;
  }

  txt += `_© ${botConfig.bot?.name || "Ucpai-AI"} | ${new Date().getFullYear()}_\n`;
  txt += `_ᴅᴇᴠᴇʟᴏᴘᴇʀ: ${botConfig.bot?.developer || "mr.ucup"}_`;

  const imagePath = path.join(process.cwd(), "assets", "images", "ucpai.jpg");
  const thumbPath = path.join(process.cwd(), "assets", "images", "ucpai2.jpg");

  let imageBuffer = fs.existsSync(imagePath)
    ? fs.readFileSync(imagePath)
    : null;
  let thumbBuffer = fs.existsSync(thumbPath)
    ? fs.readFileSync(thumbPath)
    : null;

  const savedVariant = db.setting("allmenuVariant");
  const allmenuVariant = savedVariant || botConfig.ui?.allmenuVariant || 2;

  const saluranId = botConfig.saluran?.id || "120363426403323903@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Ucpai-AI";
  const saluranLink = botConfig.saluran?.link || "";

  const fullContextInfo = {
    mentionedJid: [m.sender],
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
    externalAdReply: {
      title: botConfig.bot?.name || "Ucpai-AI",
      body: `Owner: ${botConfig.owner?.name || "mr.ucup"}`,
      sourceUrl: saluranLink,
      mediaType: 1,
      thumbnail: imageBuffer,
      renderLargerThumbnail: true,
    },
  };

  try {
    switch (allmenuVariant) {
      case 1:
        await m.reply(txt);
        break;

      case 2:
        if (imageBuffer) {
          await sock.sendMessage(
            m.chat,
            {
              image: imageBuffer,
              caption: txt,
              contextInfo: fullContextInfo,
            },
            { quoted: m },
          );
        } else {
          await sock.sendMessage(
            m.chat,
            {
              text: txt,
              contextInfo: fullContextInfo,
            },
            { quoted: m },
          );
        }
        break;

      case 3: {
        let resizedThumb = thumbBuffer;
        if (thumbBuffer) {
          try {
            resizedThumb = await (await getSharp())(thumbBuffer)
              .resize(300, 300, { fit: "cover" })
              .jpeg({ quality: 80 })
              .toBuffer();
          } catch {
            resizedThumb = thumbBuffer;
          }
        }
        await sock.sendMessage(
          m.chat,
          {
            document: imageBuffer || Buffer.from(""),
            mimetype: "image/png",
            fileLength: 999999999999,
            fileSize: 999999999999,
            fileName: `${toSmallCaps(botConfig.bot?.name || "Ucpai-AI")} — ᴀʟʟ ᴍᴇɴᴜ`,
            caption: txt,
            jpegThumbnail: resizedThumb,
            contextInfo: fullContextInfo,
          },
          { quoted: m },
        );
        break;
      }

      case 4: {
        const { generateWAMessageFromContent, proto } = await import("ucpai");
        const categoryRows = sortedCategories
          .filter((cat) => {
            if (cat === "owner" && !m.isOwner) return false;
            if (
              allowedCategories &&
              !allowedCategories.includes(cat.toLowerCase())
            )
              return false;
            if (
              excludeCategories &&
              excludeCategories.includes(cat.toLowerCase())
            )
              return false;
            const cmds = [
              ...(commandsByCategory[cat] || []),
              ...(casesByCategory[cat] || []),
            ];
            return cmds.length > 0;
          })
          .map((cat) => {
            const cmds = [
              ...(commandsByCategory[cat] || []),
              ...(casesByCategory[cat] || []),
            ];
            const emoji = CATEGORY_EMOJIS[cat] || "📋";
            return {
              title: `${emoji} ${toSmallCaps(cat)}`,
              description: `${cmds.length} commands`,
              id: `${prefix}menucat ${cat}`,
            };
          });

        const buttons = [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "📁 ᴘɪʟɪʜ ᴋᴀᴛᴇɢᴏʀɪ",
              sections: [{ title: "📋 PILIH KATEGORI", rows: categoryRows }],
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🏠 ᴋᴇᴍʙᴀʟɪ ᴋᴇ ᴍᴇɴᴜ",
              id: `${prefix}menu`,
            }),
          },
        ];

        let headerMedia = null;
        if (imageBuffer) {
          try {
            const { prepareWAMessageMedia } = await import("ucpai");
            headerMedia = await prepareWAMessageMedia(
              { image: imageBuffer },
              { upload: sock.waUploadToServer },
            );
          } catch {}
        }

        const msg = generateWAMessageFromContent(
          m.chat,
          {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject(
                  {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                      text: txt,
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                      text: `© ${botConfig.bot?.name || "Ucpai-AI"}`,
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                      title: botConfig.bot?.name || "Ucpai-AI",
                      hasMediaAttachment: !!headerMedia,
                      ...(headerMedia || {}),
                    }),
                    nativeFlowMessage:
                      proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
                        { buttons },
                      ),
                    contextInfo: fullContextInfo,
                  },
                ),
              },
            },
          },
          { userJid: m.sender, quoted: m },
        );

        await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
        break;
      }

      case 5: {
        await sock.sendMessage(
          m.chat,
          {
            interactiveMessage: {
              title: txt,
              footer: botConfig.bot?.name || "Ucpai-AI",
              image: thumbBuffer,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 777,
                isForwarded: true,
              },
              externalAdReply: {
                title: botConfig.bot?.name || "Ucpai-AI",
                body: `Owner: ${botConfig.owner?.name || "mr.ucup"}`,
                mediaType: 1,
                thumbnail: imageBuffer,
                mediaUrl: " X ",
                sourceUrl: botConfig.info?.website,
                renderLargerThumbnail: true,
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({
                  limited_time_offer: {
                    text: "Hai " + m.pushName,
                    url: "https://ucpai.site",
                    copy_code: botConfig.owner?.name || "Ucpai-AI",
                    expiration_time: Date.now(),
                  },
                  bottom_sheet: {
                    in_thread_buttons_limit: 2,
                    divider_indices: [1, 2, 3, 4, 5, 999],
                    list_title: "zanxnpc",
                    button_title: "zanxnpc",
                  },
                }),
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      has_multiple_buttons: true,
                    }),
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Kembali Ke Menu Utama",
                      id: prefix + "menu",
                    }),
                  },
                ],
              },
            },
          },
          { quoted: m },
        );
        break;
      }

      default:
        if (imageBuffer) {
          await sock.sendMessage(
            m.chat,
            {
              image: imageBuffer,
              caption: txt,
              contextInfo: fullContextInfo,
            },
            { quoted: m },
          );
        } else {
          await m.reply(txt);
        }
    }
  } catch (error) {
    console.error("[AllMenu] Error:", error.message);
    if (imageBuffer) {
      await sock.sendMessage(
        m.chat,
        {
          image: imageBuffer,
          caption: txt,
          contextInfo: getContextInfo(botConfig, m),
        },
        { quoted: m },
      );
    } else {
      await m.reply(txt);
    }
  }
}

export { pluginConfig as config, handler };

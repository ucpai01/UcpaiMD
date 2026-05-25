import { getDatabase } from '../../src/lib/ucpai-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ucpai-level.js'
const pluginConfig = {
    name: 'alchemy',
    alias: ['potion', 'brew', 'ramuan'],
    category: 'rpg',
    description: 'Buat potion dan ramuan dari herba',
    usage: '.alchemy <potion>',
    example: '.alchemy healthpotion',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 1,
    isEnabled: true
}

const POTIONS = {
    healthpotion: { name: '❤️ Health Potion', materials: { herb: 3 }, effect: 'Pulihkan 50 HP', exp: 80, result: 'healthpotion' },
    manapotion: { name: '💙 Mana Potion', materials: { herb: 2, flower: 1 }, effect: 'Pulihkan 50 Mana', exp: 90, result: 'manapotion' },
    staminapotion: { name: '⚡ Stamina Potion', materials: { herb: 2, mushroom: 1 }, effect: 'Pulihkan 30 Stamina', exp: 100, result: 'staminapotion' },
    strengthpotion: { name: '💪 Strength Potion', materials: { herb: 3, dragonscale: 1 }, effect: '+20 ATK (5 menit)', exp: 200, result: 'strengthpotion' },
    defensepotion: { name: '🛡️ Defense Potion', materials: { herb: 3, iron: 2 }, effect: '+15 DEF (5 menit)', exp: 180, result: 'defensepotion' },
    luckpotion: { name: '🍀 Luck Potion', materials: { herb: 5, diamond: 1 }, effect: '+30% Drop Rate (10 menit)', exp: 300, result: 'luckpotion' },
    exppotion: { name: '✨ EXP Potion', materials: { herb: 4, gold: 2 }, effect: '+50% EXP (15 menit)', exp: 250, result: 'exppotion' },
    antidote: { name: '💊 Antidote', materials: { herb: 2 }, effect: 'Sembuhkan racun', exp: 50, result: 'antidote' },
    elixir: { name: '🧪 Elixir', materials: { herb: 10, diamond: 2, gold: 5 }, effect: 'Pulihkan semua stats', exp: 500, result: 'elixir' }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.inventory) user.inventory = {}
    if (!user.rpg) user.rpg = {}
    
    const args = m.args || []
    const potionName = args[0]?.toLowerCase()
    
    if (!potionName) {
        let txt = `🧪 *ᴀʟᴄʜᴇᴍʏ - ʙᴜᴀᴛ ᴘᴏᴛɪᴏɴ*\n\n`
        txt += `╭┈┈⬡「 📜 *ʀᴇsᴇᴘ* 」\n`
        
        for (const [key, pot] of Object.entries(POTIONS)) {
            const mats = Object.entries(pot.materials).map(([m, qty]) => `${qty}x ${m}`).join(', ')
            txt += `┃ ${pot.name}\n`
            txt += `┃ 📦 Bahan: ${mats}\n`
            txt += `┃ 💫 Efek: ${pot.effect}\n`
            txt += `┃ → \`${key}\`\n┃\n`
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        txt += `💡 *Tips:* Dapatkan herb dari garden atau dungeon`
        
        return m.reply(txt)
    }
    
    const potion = POTIONS[potionName]
    if (!potion) {
        return m.reply(`❌ Resep tidak ditemukan!\n\n> Ketik \`${m.prefix}alchemy\` untuk melihat daftar.`)
    }
    
    const missingMaterials = []
    for (const [material, needed] of Object.entries(potion.materials)) {
        const have = user.inventory[material] || 0
        if (have < needed) {
            missingMaterials.push(`${material}: ${have}/${needed}`)
        }
    }
    
    if (missingMaterials.length > 0) {
        return m.reply(
            `❌ *ʙᴀʜᴀɴ ᴋᴜʀᴀɴɢ*\n\n` +
            `> Untuk membuat ${potion.name}:\n\n` +
            missingMaterials.map(m => `> ❌ ${m}`).join('\n')
        )
    }
    
    await m.react('🧪')
    await m.reply(`🧪 *ᴍᴇʀᴀᴄɪᴋ ${potion.name.toUpperCase()}...*`)
    await new Promise(r => setTimeout(r, 2000))
    
    for (const [material, needed] of Object.entries(potion.materials)) {
        user.inventory[material] -= needed
        if (user.inventory[material] <= 0) delete user.inventory[material]
    }
    
    user.inventory[potion.result] = (user.inventory[potion.result] || 0) + 1
    
    await addExpWithLevelCheck(sock, m, db, user, potion.exp)
    db.save()
    
    await m.react('✅')
    return m.reply(
        `✅ *ᴀʟᴄʜᴇᴍʏ ʙᴇʀʜᴀsɪʟ*\n\n` +
        `╭┈┈⬡「 🧪 *ʜᴀsɪʟ* 」\n` +
        `┃ 📦 Item: *${potion.name}*\n` +
        `┃ 💫 Efek: *${potion.effect}*\n` +
        `┃ ✨ EXP: *+${potion.exp}*\n` +
        `╰┈┈┈┈┈┈┈┈⬡`
    )
}

export { pluginConfig as config, handler }
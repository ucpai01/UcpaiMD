import { getDatabase } from '../../src/lib/ucpai-database.js'
import { getRpgContextInfo } from '../../src/lib/ucpai-context.js'
const pluginConfig = {
    name: 'shop',
    alias: ['beli', 'jual', 'toko', 'store', 'buy', 'sell'],
    category: 'rpg',
    description: 'Beli dan jual item RPG',
    usage: '.shop <buy/sell> <item> <jumlah>',
    example: '.shop buy potion 1',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const ITEMS = {
    potion: { price: 500, type: 'buyable', name: '🥤 Health Potion' },
    mpotion: { price: 500, type: 'buyable', name: '🧪 Mana Potion' },
    stamina: { price: 1000, type: 'buyable', name: '⚡ Stamina Potion' },
    
    common: { price: 2000, type: 'buyable', name: '📦 Common Crate' },
    uncommon: { price: 10000, type: 'buyable', name: '🛍️ Uncommon Crate' },
    mythic: { price: 50000, type: 'buyable', name: '🎁 Mythic Crate' },
    legendary: { price: 200000, type: 'buyable', name: '💎 Legendary Crate' },
    
    rock: { price: 20, type: 'sellable', name: '🪨 Batu' },
    coal: { price: 50, type: 'sellable', name: '⚫ Batubara' },
    iron: { price: 200, type: 'sellable', name: '⛓️ Besi' },
    gold: { price: 1000, type: 'sellable', name: '🥇 Emas' },
    diamond: { price: 5000, type: 'sellable', name: '💠 Berlian' },
    emerald: { price: 10000, type: 'sellable', name: '💚 Emerald' },
    
    trash: { price: 10, type: 'sellable', name: '🗑️ Sampah' },
    fish: { price: 100, type: 'sellable', name: '🐟 Ikan' },
    prawn: { price: 200, type: 'sellable', name: '🦐 Udang' },
    octopus: { price: 500, type: 'sellable', name: '🐙 Gurita' },
    shark: { price: 2000, type: 'sellable', name: '🦈 Hiu' },
    whale: { price: 10000, type: 'sellable', name: '🐳 Paus' }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    const args = m.args || []
    
    const action = args[0]?.toLowerCase()
    
    if (!action || (action !== 'buy' && action !== 'sell')) {
        let txt = `🛒 *ʀᴘɢ sʜᴏᴘ*\n\n`
        txt += `╭┈┈⬡「 📋 *ᴜsᴀɢᴇ* 」\n`
        txt += `┃ > \`.shop buy <item> <jumlah>\`\n`
        txt += `┃ > \`.shop sell <item> <jumlah>\`\n`
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        
        txt += `╭┈┈⬡「 🛍️ *ʙᴜʏ ʟɪsᴛ* 」\n`
        for (const [key, item] of Object.entries(ITEMS)) {
            if (item.type === 'buyable') {
                txt += `┃ ${item.name}: Rp ${item.price.toLocaleString('id-ID')}\n`
            }
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        
        txt += `╭┈┈⬡「 💰 *sᴇʟʟ ʟɪsᴛ* 」\n`
        for (const [key, item] of Object.entries(ITEMS)) {
            if (item.type === 'sellable') {
                txt += `┃ ${item.name}: Rp ${item.price.toLocaleString('id-ID')}\n`
            }
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡`
        
        return m.reply(txt)
    }
    
    const itemKey = args[1]?.toLowerCase()
    const amount = parseInt(args[2]) || 1
    
    if (!itemKey || !ITEMS[itemKey]) {
        return m.reply(
            `❌ *ɪᴛᴇᴍ ɴᴏᴛ ꜰᴏᴜɴᴅ*\n\n` +
            `> Item tidak ditemukan!\n` +
            `> Cek list: \`.shop\``
        )
    }
    
    const item = ITEMS[itemKey]
    
    if (action === 'buy') {
        if (item.type !== 'buyable') {
            return m.reply(`❌ *ᴛɪᴅᴀᴋ ʙɪsᴀ ᴅɪʙᴇʟɪ*\n\n> Item ini tidak bisa dibeli!`)
        }
        
        const totalCost = item.price * amount
        if ((user.koin || 0) < totalCost) {
            return m.reply(
                `❌ *sᴀʟᴅᴏ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` +
                `> Koin kamu: Rp ${(user.koin || 0).toLocaleString('id-ID')}\n` +
                `> Butuh: Rp ${totalCost.toLocaleString('id-ID')}`
            )
        }
        
        const cleanJid = m.sender.split('@')[0]
        if (!db.db.data.users[cleanJid]) {
            db.setUser(m.sender)
        }
        if (!db.db.data.users[cleanJid].inventory) {
            db.db.data.users[cleanJid].inventory = {}
        }
        
        db.db.data.users[cleanJid].koin = (db.db.data.users[cleanJid].koin || 0) - totalCost
        db.db.data.users[cleanJid].inventory[itemKey] = (db.db.data.users[cleanJid].inventory[itemKey] || 0) + amount
        
        await db.save()
        return m.reply(`✅ *ʙᴇʀʜᴀsɪʟ ᴍᴇᴍʙᴇʟɪ*\n\n> 🛒 Item: *${amount}x ${item.name}*\n> 💸 Total: Rp ${totalCost.toLocaleString('id-ID')}`)
    }
    
    if (action === 'sell') {
        if (item.type !== 'sellable') {
            return m.reply(`❌ *ᴛɪᴅᴀᴋ ʙɪsᴀ ᴅɪᴊᴜᴀʟ*\n\n> Item ini tidak bisa dijual!`)
        }
        
        const cleanJid = m.sender.split('@')[0]
        if (!db.db.data.users[cleanJid]) {
            db.setUser(m.sender)
        }
        
        const userInventory = db.db.data.users[cleanJid].inventory || {}
        const userStock = userInventory[itemKey] || 0
        
        if (userStock < amount) {
            return m.reply(
                `❌ *sᴛᴏᴋ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` +
                `> Stok ${item.name} kamu: ${userStock}\n` +
                `> Butuh: ${amount}`
            )
        }
        
        const totalProfit = item.price * amount
        
        if (!db.db.data.users[cleanJid].inventory) {
            db.db.data.users[cleanJid].inventory = {}
        }
        db.db.data.users[cleanJid].inventory[itemKey] = userStock - amount
        db.db.data.users[cleanJid].koin = (db.db.data.users[cleanJid].koin || 0) + totalProfit
        
        await db.save()
        return m.reply(`✅ *ʙᴇʀʜᴀsɪʟ ᴍᴇɴᴊᴜᴀʟ*\n\n> 📦 Item: *${amount}x ${item.name}*\n> 💰 Total: Rp ${totalProfit.toLocaleString('id-ID')}`)
    }
}

export { pluginConfig as config, handler }
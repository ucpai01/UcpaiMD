import fs from 'fs'
import config from '../config.js'

const pluginConfig = {
    name: 'testing',
    alias: ['test'],
    category: 'main',
    description: 'Test plugin',
    usage: '.test',
    isOwner: true,
    isGroup: false,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.react('🕕')
    await sock.sendTable(m.chat, "Java vs JavaScript",
        ["Feature", "Java", "JavaScript"],
        [
            ["Type", "Compiled", "Interpreted"],
            ["Typing", "Static", "Dynamic"],
            ["Main Use Cases", "Enterprise apps, Android", "Web dev, Full-stack"]
        ], m, {
            headerText: "Alright, let me create a comparison table between Java and JavaScript.\n\nEven though their names are super similar, they're actually quite different. Here's a quick comparison table:",
            footer: "Hope this helps!"
        }
    )
}

export default {
    config: pluginConfig,
    handler
}
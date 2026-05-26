import fs from 'fs'

const pluginConfig = {
    name: 'testing2',
    alias: ['test2'],
    category: 'main',
    description: 'Test plugin - Send PTV to newsletter',
    usage: '.test',
    isOwner: true,
    isGroup: false,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.react('🕕')
    await sock.relayMessage(m.chat, {
        pollResultSnapshotMessage: {
            name: "mr.ucup Zinn Zunn",
            pollVotes: [
            {
                optionName: "mr.ucup",
                optionVoteCount: "99999999999999"
            },
            {
                optionName: "Zein",
                optionVoteCount: "88888888888888"
            },
            {
                optionName: "mr.ucup",
                optionVoteCount: "5555"
            },
            {
                optionName: "Zein",
                optionVoteCount: "66666666"
            },
            {
                optionName: "mr.ucup",
                optionVoteCount: "777777777777"
            },
            {
                optionName: "Zein",
                optionVoteCount: "2"
            },
            ],
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: "Zinn Zunn mr.ucup",
                    newsletterJid: "-@newsletter"
                }
            },
            
        }
    }, { messageId: m.key.id, quoted: m })
}

export default  {
    config: pluginConfig,
    handler
}
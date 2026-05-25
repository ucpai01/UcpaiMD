import { getDatabase } from './ucpai-database.js'
import { logger } from './ucpai-logger.js'
import * as pakasir from './ucpai-pakasir.js'
let pollerInterval = null
let sock = null

function startOrderPoller(socketInstance) {
    sock = socketInstance
    
    const interval = config.pakasir?.pollingInterval || 30000
    
    if (pollerInterval) {
        clearInterval(pollerInterval)
    }
    
    if (!pakasir.isEnabled()) {
        logger.info('OrderPoller', 'Pakasir not enabled, skipping poller')
        return
    }
    
    pollerInterval = setInterval(checkPendingOrders, interval)
    logger.info('OrderPoller', `Started with ${interval / 1000}s interval`)
    
    checkPendingOrders()
}

function stopOrderPoller() {
    if (pollerInterval) {
        clearInterval(pollerInterval)
        pollerInterval = null
        logger.info('OrderPoller', 'Stopped')
    }
}

async function checkPendingOrders() {
    if (!sock) return
    
    try {
        const db = getDatabase()
        const orders = db.db?.data?.orders || {}
        
        for (const [orderId, order] of Object.entries(orders)) {
            if (order.status !== 'pending') continue
            
            if (order.expiredAt && new Date(order.expiredAt) < new Date()) {
                order.status = 'expired'
                db.save()
                
                try {
                    await sock.sendMessage(order.groupId, {
                        text: `⏰ *ᴏʀᴅᴇʀ ᴋᴀᴅᴀʟᴜᴀʀsᴀ*\n\n` +
                              `> Order ID: \`${orderId}\`\n` +
                              `> Status: *EXPIRED*\n\n` +
                              `Pembayaran tidak diterima dalam waktu yang ditentukan.`,
                        mentions: [order.buyerJid]
                    })
                } catch (e) {}
                
                continue
            }
            
            try {
                const txStatus = await pakasir.checkTransaction(orderId, order.total)
                
                if (txStatus && txStatus.status === 'completed') {
                    order.status = 'paid'
                    order.completedAt = txStatus.completed_at || new Date().toISOString()
                    order.paymentMethod = txStatus.payment_method
                    db.save()
                    
                    logger.success('OrderPoller', `Order ${orderId} paid!`)
                    
                    const items = order.items?.map(it => `${it.name} x${it.qty}`).join(', ') || '-'
                    
                    try {
                        await sock.sendMessage(order.groupId, {
                            text: `✅ *ᴘᴇᴍʙᴀʏᴀʀᴀɴ ʙᴇʀʜᴀsɪʟ*\n\n` +
                                  `> Order ID: \`${orderId}\`\n` +
                                  `> Item: ${items}\n` +
                                  `> Total: *Rp ${order.total.toLocaleString('id-ID')}*\n` +
                                  `> Metode: *${txStatus.payment_method?.toUpperCase() || 'QRIS'}*\n\n` +
                                  `@${order.buyerJid.split('@')[0]} detail produk dikirim via chat pribadi! 🎉`,
                            mentions: [order.buyerJid]
                        })
                    } catch (e) {}
                    
                    let deliveredDetail = null
                    
                    if (order.items?.[0]?.id) {
                        try {
                            const groupData = db.getGroup(order.groupId)
                            const product = groupData?.storeConfig?.products?.find(p => p.id === order.items[0].id)
                            
                            if (product?.stockItems?.length > 0) {
                                const stockItem = product.stockItems.shift()
                                product.stock = product.stockItems.length
                                db.setGroup(order.groupId, groupData)
                                db.save()
                                deliveredDetail = stockItem.detail
                                logger.info('OrderPoller', `Took stock item for ${orderId}, remaining: ${product.stockItems.length}`)
                            }
                        } catch (e) {
                            logger.error('OrderPoller', `Failed to get stock item: ${e.message}`)
                        }
                    }
                    
                    const detailToSend = deliveredDetail || order.productDetail
                    
                    if (detailToSend) {
                        try {
                            let detailMsg = `🎁 *ᴅᴇᴛᴀɪʟ ᴘᴇsᴀɴᴀɴ*\n\n`
                            detailMsg += `> Order ID: \`${orderId}\`\n`
                            detailMsg += `> Item: ${items}\n`
                            detailMsg += `━━━━━━━━━━━━━━━\n\n`
                            if (order.productDescription) {
                                detailMsg += `📝 *Deskripsi:*\n${order.productDescription}\n\n`
                            }
                            detailMsg += `🔐 *Detail Produk:*\n${detailToSend}\n\n`
                            detailMsg += `━━━━━━━━━━━━━━━\n`
                            detailMsg += `> Terima kasih sudah berbelanja! 🙏`
                            
                            await sock.sendMessage(order.buyerJid, {
                                text: detailMsg
                            })
                            
                            logger.info('OrderPoller', `Sent product detail to ${order.buyerJid}`)
                        } catch (e) {
                            logger.error('OrderPoller', `Failed to send detail: ${e.message}`)
                        }
                    }
                }
            } catch (err) {
                logger.debug('OrderPoller', `Check ${orderId}: ${err.message}`)
            }
        }
    } catch (error) {
        logger.error('OrderPoller', `Error: ${error.message}`)
    }
}

function getOrdersByGroup(groupId) {
    const db = getDatabase()
    const orders = db.db?.data?.orders || {}
    return Object.values(orders).filter(o => o.groupId === groupId)
}

function getOrdersByBuyer(buyerJid) {
    const db = getDatabase()
    const orders = db.db?.data?.orders || {}
    return Object.values(orders).filter(o => o.buyerJid === buyerJid)
}

function getOrder(orderId) {
    const db = getDatabase()
    return db.db?.data?.orders?.[orderId] || null
}

function createOrder(orderId, data) {
    const db = getDatabase()
    
    if (!db.db.data.orders) {
        db.db.data.orders = {}
    }
    
    db.db.data.orders[orderId] = {
        orderId,
        ...data,
        createdAt: new Date().toISOString()
    }
    
    db.save()
    return db.db.data.orders[orderId]
}

function updateOrder(orderId, data) {
    const db = getDatabase()
    
    if (db.db?.data?.orders?.[orderId]) {
        db.db.data.orders[orderId] = {
            ...db.db.data.orders[orderId],
            ...data
        }
        db.save()
        return db.db.data.orders[orderId]
    }
    
    return null
}

export { startOrderPoller, stopOrderPoller, checkPendingOrders, getOrdersByGroup, getOrdersByBuyer, getOrder, createOrder, updateOrder }
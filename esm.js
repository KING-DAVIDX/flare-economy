import Flare from 'flaredb'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class FlareEconomy {
  constructor(dbPath = 'economy.db') {
    const fullDbPath = path.join(__dirname, dbPath)
    this.db = new Flare(fullDbPath)
    this.users = null
    this.dailyCooldown = 8.64e7
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return
    this.users = this.db.collection('users', {
      userID: 'string',
      platform: 'string',
      wallet: 'number',
      bank: 'number',
      bankCapacity: 'number',
      daily: 'number'
    })
    await this.users.find({ limit: 1 })
    this.initialized = true
  }

  async safePut(data) {
    if (!this.initialized) await this.initialize()
    await this.users.put(data)
  }

  async balance(userID, platform = 'whatsapp') {
    if (!userID) throw new TypeError('Please Provide a User ID')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform })
    if (!user) user = await this.create(userID, platform)
    return {
      wallet: Number(user.wallet) || 0,
      bank: Number(user.bank) || 0,
      bankCapacity: Number(user.bankCapacity) || 2500,
      total: (Number(user.wallet) || 0) + (Number(user.bank) || 0)
    }
  }

  async addMoney(userID, platform, amount) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (amount == null) throw new TypeError('Please Provide an Amount')
    if (isNaN(amount) || amount < 0) throw new TypeError('Invalid amount')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const newWallet = (Number(user.wallet) || 0) + Number(amount)
    await this.safePut({
      userID,
      platform,
      wallet: newWallet,
      bank: Number(user.bank) || 0,
      bankCapacity: Number(user.bankCapacity) || 2500,
      daily: Number(user.daily) || 0
    })
    return { amount: Number(amount), newBalance: newWallet }
  }

  async removeMoney(userID, platform, amount) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (amount == null) throw new TypeError('Please Provide an Amount')
    if (isNaN(amount) || amount < 0) throw new TypeError('Invalid amount')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const actualAmount = Math.min(Number(amount), Number(user.wallet) || 0)
    const newWallet = (Number(user.wallet) || 0) - actualAmount
    await this.safePut({
      userID,
      platform,
      wallet: newWallet,
      bank: Number(user.bank) || 0,
      bankCapacity: Number(user.bankCapacity) || 2500,
      daily: Number(user.daily) || 0
    })
    return { amount: actualAmount, newBalance: newWallet }
  }

  async setMoney(userID, platform, wallet, bank) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (wallet == null || bank == null || isNaN(wallet) || isNaN(bank) || wallet < 0 || bank < 0)
      throw new TypeError('Invalid amounts')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    await this.safePut({
      userID,
      platform,
      wallet: Number(wallet),
      bank: Number(bank),
      bankCapacity: Number(user.bankCapacity) || 2500,
      daily: Number(user.daily) || 0
    })
    return { wallet: Number(wallet), bank: Number(bank) }
  }

  async addBankCapacity(userID, platform, capacity) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (capacity == null || isNaN(capacity) || capacity < 0)
      throw new TypeError('Invalid capacity')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const newCap = (Number(user.bankCapacity) || 2500) + Number(capacity)
    await this.safePut({
      userID,
      platform,
      wallet: Number(user.wallet) || 0,
      bank: Number(user.bank) || 0,
      bankCapacity: newCap,
      daily: Number(user.daily) || 0
    })
    return { capacity: newCap }
  }

  async create(userID, platform = 'whatsapp') {
    if (!userID) throw new TypeError('Please Provide a User ID')
    await this.initialize()
    const exists = await this.users.findOne({ userID, platform })
    if (exists) return exists
    const newUser = { userID, platform, wallet: 0, bank: 0, bankCapacity: 2500, daily: 0 }
    await this.safePut(newUser)
    return newUser
  }

  async delete(userID, platform = 'whatsapp') {
    if (!userID) throw new TypeError('Please Provide a User ID')
    await this.initialize()
    const user = await this.users.findOne({ userID, platform })
    if (!user) return { deleted: false }
    await this.users.deleteOne({ userID, platform })
    return { deleted: true }
  }

  async leaderboard(platform = 'whatsapp', limit = 10, type = 'total') {
    if (!['wallet', 'bank', 'total'].includes(type)) throw new TypeError('Invalid type')
    await this.initialize()
    const all = await this.users.find({ platform })
    const sorted = all.sort((a, b) => {
      const av = type === 'total' ? (Number(a.wallet) || 0) + (Number(a.bank) || 0) : Number(a[type]) || 0
      const bv = type === 'total' ? (Number(b.wallet) || 0) + (Number(b.bank) || 0) : Number(b[type]) || 0
      return bv - av
    })
    return sorted.slice(0, limit).map(u => ({
      userID: u.userID,
      platform: u.platform,
      wallet: Number(u.wallet) || 0,
      bank: Number(u.bank) || 0,
      bankCapacity: Number(u.bankCapacity) || 2500,
      total: (Number(u.wallet) || 0) + (Number(u.bank) || 0)
    }))
  }

  async daily(userID, platform, amount) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (amount == null || isNaN(amount)) throw new TypeError('Invalid amount')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const last = Number(user.daily) || 0
    const cooldown = this.dailyCooldown - (Date.now() - last)
    if (cooldown > 0 && last !== 0) {
      const sec = Math.floor(cooldown / 1000)
      const min = Math.floor(sec / 60)
      const hr = Math.floor(min / 60)
      let left = ''
      if (hr > 0) left += `${hr} Hour(s), `
      if (min % 60 > 0) left += `${min % 60} Minute(s), `
      left += `${sec % 60} Second(s)`
      return { success: false, cooldown: true, timeLeft: left }
    }
    const newWallet = (Number(user.wallet) || 0) + Number(amount)
    await this.safePut({
      userID,
      platform,
      wallet: newWallet,
      bank: Number(user.bank) || 0,
      bankCapacity: Number(user.bankCapacity) || 2500,
      daily: Date.now()
    })
    return { success: true, amount: Number(amount), newBalance: newWallet }
  }

  async deposit(userID, platform, amount) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (amount == null) throw new TypeError('Please Provide an amount')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const wallet = Number(user.wallet) || 0
    const bank = Number(user.bank) || 0
    const cap = Number(user.bankCapacity) || 2500
    const dep = amount === 'all' ? wallet : Math.min(Number(amount), wallet)
    const space = cap - bank
    const actual = Math.min(dep, space)
    if (actual <= 0) return { success: false, reason: 'bank_full' }
    await this.safePut({
      userID,
      platform,
      wallet: wallet - actual,
      bank: bank + actual,
      bankCapacity: cap,
      daily: Number(user.daily) || 0
    })
    return { success: true, amount: actual, wallet: wallet - actual, bank: bank + actual }
  }

  async withdraw(userID, platform, amount) {
    if (!userID) throw new TypeError('Please Provide a User ID')
    if (!platform) throw new TypeError('Please Provide a Platform')
    if (amount == null) throw new TypeError('Please Provide an amount')
    await this.initialize()
    let user = await this.users.findOne({ userID, platform }) || await this.create(userID, platform)
    const wallet = Number(user.wallet) || 0
    const bank = Number(user.bank) || 0
    const withdrawAmount = amount === 'all' ? bank : Math.min(Number(amount), bank)
    if (withdrawAmount <= 0) return { success: false, reason: 'insufficient_bank' }
    await this.safePut({
      userID,
      platform,
      wallet: wallet + withdrawAmount,
      bank: bank - withdrawAmount,
      bankCapacity: Number(user.bankCapacity) || 2500,
      daily: Number(user.daily) || 0
    })
    return { success: true, amount: withdrawAmount, wallet: wallet + withdrawAmount, bank: bank - withdrawAmount }
  }

  async transfer(fromUserID, toUserID, platform, amount) {
    if (!fromUserID || !toUserID || !platform) throw new TypeError('Missing parameters')
    if (isNaN(amount) || amount < 0) throw new TypeError('Invalid amount')
    if (fromUserID === toUserID) throw new TypeError('Cannot transfer to yourself')
    await this.initialize()
    const from = await this.users.findOne({ userID: fromUserID, platform }) || await this.create(fromUserID, platform)
    const to = await this.users.findOne({ userID: toUserID, platform }) || await this.create(toUserID, platform)
    if ((Number(from.wallet) || 0) < amount) return { success: false, reason: 'insufficient_funds' }
    await this.users.put({
      userID: fromUserID,
      platform,
      wallet: (Number(from.wallet) || 0) - Number(amount),
      bank: Number(from.bank) || 0,
      bankCapacity: Number(from.bankCapacity) || 2500,
      daily: Number(from.daily) || 0
    })
    await this.users.put({
      userID: toUserID,
      platform,
      wallet: (Number(to.wallet) || 0) + Number(amount),
      bank: Number(to.bank) || 0,
      bankCapacity: Number(to.bankCapacity) || 2500,
      daily: Number(to.daily) || 0
    })
    return { success: true, amount: Number(amount) }
  }

  async close() {
    try {
      if (this.db && typeof this.db.close === 'function') await this.db.close()
      this.initialized = false
    } catch {}
  }
}

export default FlareEconomy
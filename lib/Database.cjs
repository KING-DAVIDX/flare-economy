const { readFile, writeFile, access, constants } = require('fs').promises;
const { join } = require('path');

class FlareDatabase {
    constructor(dbPath = 'economy.db') {
        this.dbPath = dbPath;
        this.data = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await access(this.dbPath, constants.F_OK);
            const fileContent = await readFile(this.dbPath, 'utf8');
            this.data = JSON.parse(fileContent || '{}');
        } catch (error) {
            this.data = {};
            await this.save();
        }
        
        this.initialized = true;
    }

    async save() {
        await writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    }

    async getUser(userId, platform) {
        await this.init();
        const key = `${platform}:${userId}`;
        
        if (!this.data[key]) {
            this.data[key] = {
                userId,
                platform,
                wallet: 0,
                bank: 0,
                bankCapacity: 2500,
                lastDaily: 0
            };
            await this.save();
        }
        
        return { ...this.data[key] };
    }

    async updateUser(userId, platform, updates) {
        await this.init();
        const key = `${platform}:${userId}`;
        
        if (!this.data[key]) {
            await this.getUser(userId, platform);
        }
        
        this.data[key] = { ...this.data[key], ...updates };
        await this.save();
        return { ...this.data[key] };
    }

    async getAllUsers(platform = null) {
        await this.init();
        const users = [];
        
        for (const [key, user] of Object.entries(this.data)) {
            if (platform && key.startsWith(platform + ':')) {
                users.push({ ...user });
            } else if (!platform) {
                users.push({ ...user });
            }
        }
        
        return users;
    }
}

class FlareEconomy {
    constructor(options = {}) {
        this.dbPath = options.dbPath || 'economy.db';
        this.dailyCooldown = options.dailyCooldown || 24 * 60 * 60 * 1000;
        this.defaultBankCapacity = options.defaultBankCapacity || 2500;
        this.db = new FlareDatabase(this.dbPath);
    }

    async balance(userId, platform = 'discord') {
        if (!userId) throw new TypeError("Please Provide a User ID");
        const user = await this.db.getUser(userId, platform);
        return {
            wallet: user.wallet,
            bank: user.bank,
            bankCapacity: user.bankCapacity,
            total: user.wallet + user.bank
        };
    }

    async give(userId, platform, amount) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        const newWallet = user.wallet + Number(amount);
        
        await this.db.updateUser(userId, platform, { wallet: newWallet });
        return { amount: Number(amount), newBalance: newWallet };
    }

    async deduct(userId, platform, amount) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        const deductAmount = Math.min(Number(amount), user.wallet);
        const newWallet = user.wallet - deductAmount;
        
        await this.db.updateUser(userId, platform, { wallet: newWallet });
        return { amount: deductAmount, newBalance: newWallet };
    }

    async setBankCapacity(userId, platform, capacity) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!capacity && capacity !== 0) throw new TypeError("Please Provide a Capacity");
        if (isNaN(capacity)) throw new TypeError("The capacity should be a number");
        if (capacity < 0) throw new TypeError("Capacity can't be less than zero");

        await this.db.updateUser(userId, platform, { bankCapacity: Number(capacity) });
        return { capacity: Number(capacity) };
    }

    async increaseBankCapacity(userId, platform, amount) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        const newCapacity = user.bankCapacity + Number(amount);
        
        await this.db.updateUser(userId, platform, { bankCapacity: newCapacity });
        return { amount: Number(amount), newCapacity };
    }

    async create(userId, platform) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        
        const user = await this.db.getUser(userId, platform);
        return { created: !user.wallet && !user.bank, user };
    }

    async delete(userId, platform) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        
        await this.db.init();
        const key = `${platform}:${userId}`;
        const exists = !!this.db.data[key];
        
        if (exists) {
            delete this.db.data[key];
            await this.db.save();
        }
        
        return { deleted: exists };
    }

    async leaderboard(count = 10, platform = null, sortBy = 'total') {
        if (isNaN(count)) throw new TypeError("The count must be a number");
        if (count < 1) throw new TypeError("Count must be at least 1");

        const allUsers = await this.db.getAllUsers(platform);
        
        const sortedUsers = allUsers.map(user => ({
            ...user,
            total: user.wallet + user.bank
        })).sort((a, b) => {
            if (sortBy === 'wallet') return b.wallet - a.wallet;
            if (sortBy === 'bank') return b.bank - a.bank;
            return b.total - a.total;
        });

        return sortedUsers.slice(0, count);
    }

    async daily(userId, platform, amount = 100) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        const now = Date.now();
        const timeSinceLastDaily = now - user.lastDaily;

        if (timeSinceLastDaily < this.dailyCooldown) {
            const remainingTime = this.dailyCooldown - timeSinceLastDaily;
            return {
                success: false,
                cooldown: true,
                remainingTime,
                readableTime: this.formatTime(remainingTime)
            };
        }

        const newWallet = user.wallet + Number(amount);
        await this.db.updateUser(userId, platform, {
            wallet: newWallet,
            lastDaily: now
        });

        return {
            success: true,
            amount: Number(amount),
            newBalance: newWallet
        };
    }

    async deposit(userId, platform, amount) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount) && amount !== 'all') throw new TypeError("The amount should be a number or 'all'");
        if (typeof amount === 'number' && amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        const availableSpace = user.bankCapacity - user.bank;
        
        let depositAmount;
        if (amount === 'all') {
            depositAmount = Math.min(user.wallet, availableSpace);
        } else {
            depositAmount = Math.min(Number(amount), user.wallet, availableSpace);
        }

        if (depositAmount <= 0) {
            return { success: false, reason: 'no_funds_or_space' };
        }

        const newWallet = user.wallet - depositAmount;
        const newBank = user.bank + depositAmount;
        
        await this.db.updateUser(userId, platform, {
            wallet: newWallet,
            bank: newBank
        });

        return {
            success: true,
            amount: depositAmount,
            newWallet,
            newBank
        };
    }

    async withdraw(userId, platform, amount) {
        if (!userId) throw new TypeError("Please Provide a User ID");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount) && amount !== 'all') throw new TypeError("The amount should be a number or 'all'");
        if (typeof amount === 'number' && amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await this.db.getUser(userId, platform);
        
        let withdrawAmount;
        if (amount === 'all') {
            withdrawAmount = user.bank;
        } else {
            withdrawAmount = Math.min(Number(amount), user.bank);
        }

        if (withdrawAmount <= 0) {
            return { success: false, reason: 'no_funds' };
        }

        const newWallet = user.wallet + withdrawAmount;
        const newBank = user.bank - withdrawAmount;
        
        await this.db.updateUser(userId, platform, {
            wallet: newWallet,
            bank: newBank
        });

        return {
            success: true,
            amount: withdrawAmount,
            newWallet,
            newBank
        };
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours} hour(s)`);
        if (minutes > 0) parts.push(`${minutes} minute(s)`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second(s)`);

        return parts.join(', ');
    }
}

module.exports = { FlareEconomy };
module.exports.default = FlareEconomy;
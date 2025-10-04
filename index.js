const { Flare } = require('flaredb');

class FlareEconomy {
    constructor(dbPath = 'economy.db') {
        this.db = new Flare(dbPath);
        this.users = null;
        this.dailyCooldown = 8.64e+7; // 24 hours in milliseconds
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        this.users = this.db.collection("users", {
            userID: "string",
            platform: "string",
            wallet: "number",
            bank: "number",
            bankCapacity: "number",
            daily: "string"
        });
        
        this.initialized = true;
    }

    /**
     * Get user balance
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     */
    async balance(userID, platform = 'discord') {
        if (!userID) throw new TypeError("Please Provide a User ID");
        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        return {
            wallet: user.wallet,
            bank: user.bank,
            bankCapacity: user.bankCapacity,
            total: user.wallet + user.bank
        };
    }

    /**
     * Add money to user's wallet
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} amount - Amount to add
     */
    async addMoney(userID, platform, amount) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        user.wallet += parseInt(amount);
        await this.users.updateOne({ userID, platform }, { wallet: user.wallet });

        return { amount, newBalance: user.wallet };
    }

    /**
     * Remove money from user's wallet
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} amount - Amount to remove
     */
    async removeMoney(userID, platform, amount) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an Amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        const actualAmount = Math.min(amount, user.wallet);
        user.wallet -= actualAmount;
        await this.users.updateOne({ userID, platform }, { wallet: user.wallet });

        return { amount: actualAmount, newBalance: user.wallet };
    }

    /**
     * Set user's money
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} wallet - Wallet amount
     * @param {number} bank - Bank amount
     */
    async setMoney(userID, platform, wallet, bank) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (wallet === undefined || bank === undefined) throw new TypeError("Please Provide both wallet and bank amounts");
        if (isNaN(wallet) || isNaN(bank)) throw new TypeError("Amounts should be numbers");
        if (wallet < 0 || bank < 0) throw new TypeError("Amounts can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        user.wallet = parseInt(wallet);
        user.bank = parseInt(bank);
        await this.users.updateOne({ userID, platform }, { 
            wallet: user.wallet, 
            bank: user.bank 
        });

        return { wallet: user.wallet, bank: user.bank };
    }

    /**
     * Increase bank capacity
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} capacity - Capacity to add
     */
    async addBankCapacity(userID, platform, capacity) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!capacity && capacity !== 0) throw new TypeError("Please Provide a Capacity");
        if (isNaN(capacity)) throw new TypeError("The capacity should be a number");
        if (capacity < 0) throw new TypeError("Capacity can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        user.bankCapacity += parseInt(capacity);
        await this.users.updateOne({ userID, platform }, { bankCapacity: user.bankCapacity });

        return { capacity: user.bankCapacity };
    }

    /**
     * Create a new user
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     */
    async create(userID, platform = 'discord') {
        if (!userID) throw new TypeError("Please Provide a User ID");
        await this.initialize();

        const existingUser = await this.users.findOne({ userID, platform });
        if (existingUser) return existingUser;

        const newUser = {
            userID,
            platform,
            wallet: 0,
            bank: 0,
            bankCapacity: 2500,
            daily: "0"
        };

        await this.users.put(newUser);
        return newUser;
    }

    /**
     * Delete a user
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     */
    async delete(userID, platform = 'discord') {
        if (!userID) throw new TypeError("Please Provide a User ID");
        await this.initialize();

        const user = await this.users.findOne({ userID, platform });
        if (!user) return { deleted: false };

        await this.users.deleteOne({ userID, platform });
        return { deleted: true };
    }

    /**
     * Get leaderboard
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} limit - Number of users to return
     * @param {string} type - Type of balance (wallet/bank/total)
     */
    async leaderboard(platform = 'discord', limit = 10, type = 'total') {
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (isNaN(limit)) throw new TypeError("Limit must be a number");
        if (!['wallet', 'bank', 'total'].includes(type)) {
            throw new TypeError("Type must be 'wallet', 'bank', or 'total'");
        }

        await this.initialize();

        const allUsers = await this.users.find({ platform });
        
        // Sort based on type
        const sortedUsers = allUsers.sort((a, b) => {
            let aValue, bValue;
            
            if (type === 'total') {
                aValue = a.wallet + a.bank;
                bValue = b.wallet + b.bank;
            } else {
                aValue = a[type];
                bValue = b[type];
            }
            
            return bValue - aValue;
        });

        return sortedUsers.slice(0, limit);
    }

    /**
     * Daily reward
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} amount - Daily reward amount
     */
    async daily(userID, platform, amount) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an amount");
        if (isNaN(amount)) throw new TypeError("Amount should be a number");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        const lastDaily = parseInt(user.daily);
        const cooldown = this.dailyCooldown - (Date.now() - lastDaily);

        if (cooldown > 0 && lastDaily !== 0) {
            // Still on cooldown
            const seconds = Math.floor(cooldown / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            let timeLeft = '';
            if (hours > 0) timeLeft += `${hours} Hour(s), `;
            if (minutes % 60 > 0) timeLeft += `${minutes % 60} Minute(s), `;
            timeLeft += `${seconds % 60} Second(s)`;

            return { 
                success: false, 
                cooldown: true, 
                timeLeft,
                hours: Math.floor(hours),
                minutes: Math.floor(minutes % 60),
                seconds: Math.floor(seconds % 60)
            };
        }

        // Give daily reward
        user.wallet += parseInt(amount);
        user.daily = Date.now().toString();
        await this.users.updateOne({ userID, platform }, { 
            wallet: user.wallet, 
            daily: user.daily 
        });

        return { 
            success: true, 
            amount, 
            newBalance: user.wallet 
        };
    }

    /**
     * Deposit money to bank
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number|string} amount - Amount to deposit ('all' or number)
     */
    async deposit(userID, platform, amount) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an amount");
        if (amount < 0) throw new TypeError("Deposit can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        let depositAmount;
        
        if (amount === 'all') {
            depositAmount = user.wallet;
        } else {
            if (isNaN(amount)) throw new TypeError("Amount should be a number or 'all'");
            depositAmount = Math.min(parseInt(amount), user.wallet);
        }

        // Check bank capacity
        const availableSpace = user.bankCapacity - user.bank;
        const actualDeposit = Math.min(depositAmount, availableSpace);

        if (actualDeposit <= 0) {
            return { success: false, reason: 'bank_full' };
        }

        user.wallet -= actualDeposit;
        user.bank += actualDeposit;

        await this.users.updateOne({ userID, platform }, { 
            wallet: user.wallet, 
            bank: user.bank 
        });

        return { 
            success: true, 
            amount: actualDeposit, 
            wallet: user.wallet, 
            bank: user.bank 
        };
    }

    /**
     * Withdraw money from bank
     * @param {string} userID - User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number|string} amount - Amount to withdraw ('all' or number)
     */
    async withdraw(userID, platform, amount) {
        if (!userID) throw new TypeError("Please Provide a User ID");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an amount");
        if (amount < 0) throw new TypeError("Withdraw can't be less than zero");

        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        let withdrawAmount;
        
        if (amount === 'all') {
            withdrawAmount = user.bank;
        } else {
            if (isNaN(amount)) throw new TypeError("Amount should be a number or 'all'");
            withdrawAmount = Math.min(parseInt(amount), user.bank);
        }

        if (withdrawAmount <= 0) {
            return { success: false, reason: 'insufficient_bank' };
        }

        user.wallet += withdrawAmount;
        user.bank -= withdrawAmount;

        await this.users.updateOne({ userID, platform }, { 
            wallet: user.wallet, 
            bank: user.bank 
        });

        return { 
            success: true, 
            amount: withdrawAmount, 
            wallet: user.wallet, 
            bank: user.bank 
        };
    }

    /**
     * Transfer money between users
     * @param {string} fromUserID - Sender User ID
     * @param {string} toUserID - Receiver User ID
     * @param {string} platform - Platform (discord/whatsapp)
     * @param {number} amount - Amount to transfer
     */
    async transfer(fromUserID, toUserID, platform, amount) {
        if (!fromUserID || !toUserID) throw new TypeError("Please Provide both sender and receiver User IDs");
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (!amount && amount !== 0) throw new TypeError("Please Provide an amount");
        if (isNaN(amount)) throw new TypeError("Amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");
        if (fromUserID === toUserID) throw new TypeError("Cannot transfer to yourself");

        await this.initialize();

        const fromUser = await this.users.findOne({ userID: fromUserID, platform }) || 
                        await this.create(fromUserID, platform);
        const toUser = await this.users.findOne({ userID: toUserID, platform }) || 
                      await this.create(toUserID, platform);

        if (fromUser.wallet < amount) {
            return { success: false, reason: 'insufficient_funds' };
        }

        fromUser.wallet -= parseInt(amount);
        toUser.wallet += parseInt(amount);

        await this.users.updateOne({ userID: fromUserID, platform }, { wallet: fromUser.wallet });
        await this.users.updateOne({ userID: toUserID, platform }, { wallet: toUser.wallet });

        return { 
            success: true, 
            amount, 
            fromBalance: fromUser.wallet, 
            toBalance: toUser.wallet 
        };
    }
}

module.exports = FlareEconomy;
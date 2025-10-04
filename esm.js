import Flare from 'flaredb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FlareEconomy {
    constructor(dbPath = 'economy.db') {
        const fullDbPath = path.join(__dirname, dbPath);
        this.db = new Flare(fullDbPath);
        this.users = null;
        this.dailyCooldown = 8.64e+7;
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

    async balance(userID, platform = 'whatsapp') {
        if (!userID) throw new TypeError("Please Provide a User ID");
        await this.initialize();

        let user = await this.users.findOne({ userID, platform });
        
        if (!user) {
            user = await this.create(userID, platform);
        }

        return {
            wallet: user.wallet || 0,
            bank: user.bank || 0,
            bankCapacity: user.bankCapacity || 2500,
            total: (user.wallet || 0) + (user.bank || 0)
        };
    }

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

        const currentWallet = user.wallet || 0;
        const newWallet = currentWallet + parseInt(amount);
        
        await this.users.put({
            userID,
            platform,
            wallet: newWallet,
            bank: user.bank || 0,
            bankCapacity: user.bankCapacity || 2500,
            daily: user.daily || "0"
        });

        return { amount, newBalance: newWallet };
    }

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

        const currentWallet = user.wallet || 0;
        const actualAmount = Math.min(amount, currentWallet);
        const newWallet = currentWallet - actualAmount;

        await this.users.put({
            userID,
            platform,
            wallet: newWallet,
            bank: user.bank || 0,
            bankCapacity: user.bankCapacity || 2500,
            daily: user.daily || "0"
        });

        return { amount: actualAmount, newBalance: newWallet };
    }

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

        await this.users.put({
            userID,
            platform,
            wallet: parseInt(wallet),
            bank: parseInt(bank),
            bankCapacity: user.bankCapacity || 2500,
            daily: user.daily || "0"
        });

        return { wallet: parseInt(wallet), bank: parseInt(bank) };
    }

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

        const currentCapacity = user.bankCapacity || 2500;
        const newCapacity = currentCapacity + parseInt(capacity);

        await this.users.put({
            userID,
            platform,
            wallet: user.wallet || 0,
            bank: user.bank || 0,
            bankCapacity: newCapacity,
            daily: user.daily || "0"
        });

        return { capacity: newCapacity };
    }

    async create(userID, platform = 'whatsapp') {
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

    async delete(userID, platform = 'whatsapp') {
        if (!userID) throw new TypeError("Please Provide a User ID");
        await this.initialize();

        const user = await this.users.findOne({ userID, platform });
        if (!user) return { deleted: false };

        await this.users.deleteOne({ userID, platform });
        return { deleted: true };
    }

    async leaderboard(platform = 'whatsapp', limit = 10, type = 'total') {
        if (!platform) throw new TypeError("Please Provide a Platform");
        if (isNaN(limit)) throw new TypeError("Limit must be a number");
        if (!['wallet', 'bank', 'total'].includes(type)) {
            throw new TypeError("Type must be 'wallet', 'bank', or 'total'");
        }

        await this.initialize();

        const allUsers = await this.users.find({ platform });
        
        const sortedUsers = allUsers.sort((a, b) => {
            let aValue, bValue;
            
            if (type === 'total') {
                aValue = (a.wallet || 0) + (a.bank || 0);
                bValue = (b.wallet || 0) + (b.bank || 0);
            } else {
                aValue = a[type] || 0;
                bValue = b[type] || 0;
            }
            
            return bValue - aValue;
        });

        return sortedUsers.slice(0, limit);
    }

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

        const lastDaily = parseInt(user.daily || "0");
        const cooldown = this.dailyCooldown - (Date.now() - lastDaily);

        if (cooldown > 0 && lastDaily !== 0) {
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

        const currentWallet = user.wallet || 0;
        const newWallet = currentWallet + parseInt(amount);
        
        await this.users.put({
            userID,
            platform,
            wallet: newWallet,
            bank: user.bank || 0,
            bankCapacity: user.bankCapacity || 2500,
            daily: Date.now().toString()
        });

        return { 
            success: true, 
            amount, 
            newBalance: newWallet 
        };
    }

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

        const currentWallet = user.wallet || 0;
        const currentBank = user.bank || 0;
        const bankCapacity = user.bankCapacity || 2500;
        
        let depositAmount;
        
        if (amount === 'all') {
            depositAmount = currentWallet;
        } else {
            if (isNaN(amount)) throw new TypeError("Amount should be a number or 'all'");
            depositAmount = Math.min(parseInt(amount), currentWallet);
        }

        const availableSpace = bankCapacity - currentBank;
        const actualDeposit = Math.min(depositAmount, availableSpace);

        if (actualDeposit <= 0) {
            return { success: false, reason: 'bank_full' };
        }

        const newWallet = currentWallet - actualDeposit;
        const newBank = currentBank + actualDeposit;

        await this.users.put({
            userID,
            platform,
            wallet: newWallet,
            bank: newBank,
            bankCapacity: bankCapacity,
            daily: user.daily || "0"
        });

        return { 
            success: true, 
            amount: actualDeposit, 
            wallet: newWallet, 
            bank: newBank 
        };
    }

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

        const currentWallet = user.wallet || 0;
        const currentBank = user.bank || 0;
        
        let withdrawAmount;
        
        if (amount === 'all') {
            withdrawAmount = currentBank;
        } else {
            if (isNaN(amount)) throw new TypeError("Amount should be a number or 'all'");
            withdrawAmount = Math.min(parseInt(amount), currentBank);
        }

        if (withdrawAmount <= 0) {
            return { success: false, reason: 'insufficient_bank' };
        }

        const newWallet = currentWallet + withdrawAmount;
        const newBank = currentBank - withdrawAmount;

        await this.users.put({
            userID,
            platform,
            wallet: newWallet,
            bank: newBank,
            bankCapacity: user.bankCapacity || 2500,
            daily: user.daily || "0"
        });

        return { 
            success: true, 
            amount: withdrawAmount, 
            wallet: newWallet, 
            bank: newBank 
        };
    }

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

        const fromWallet = fromUser.wallet || 0;
        const toWallet = toUser.wallet || 0;

        if (fromWallet < amount) {
            return { success: false, reason: 'insufficient_funds' };
        }

        const newFromWallet = fromWallet - parseInt(amount);
        const newToWallet = toWallet + parseInt(amount);

        await this.users.put({
            userID: fromUserID,
            platform,
            wallet: newFromWallet,
            bank: fromUser.bank || 0,
            bankCapacity: fromUser.bankCapacity || 2500,
            daily: fromUser.daily || "0"
        });

        await this.users.put({
            userID: toUserID,
            platform,
            wallet: newToWallet,
            bank: toUser.bank || 0,
            bankCapacity: toUser.bankCapacity || 2500,
            daily: toUser.daily || "0"
        });

        return { 
            success: true, 
            amount, 
            fromBalance: newFromWallet, 
            toBalance: newToWallet 
        };
    }
}

export default FlareEconomy;
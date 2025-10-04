"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlareEconomy = void 0;
const Flare = require("flaredb");
const utils_1 = require("./utils");
const DAILY_COOLDOWN = 8.64e7;
class FlareEconomy {
    constructor(dbPath = 'economy.db') {
        this.db = new Flare(dbPath);
        this.initialized = this.initializeDatabase();
    }
    async initializeDatabase() {
        const schema = {
            userID: 'string',
            platform: 'string',
            wallet: 'number',
            bank: 'number',
            bankCapacity: 'number',
            daily: 'string',
            createdAt: 'number',
            updatedAt: 'number'
        };
        this.users = this.db.collection('users', schema);
    }
    async ensureInitialized() {
        await this.initialized;
    }
    async balance(userID, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        let user = await this.users.findOne({ userID, platform });
        if (!user) {
            user = await this.createUser(userID, platform);
        }
        return {
            wallet: user.wallet,
            bank: user.bank,
            bankCapacity: user.bankCapacity,
            netWorth: user.wallet + user.bank
        };
    }
    async addMoney(userID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        if (!(0, utils_1.isValidAmount)(amount))
            throw new TypeError('Please provide a valid amount');
        const parsedAmount = (0, utils_1.parseAmount)(amount);
        let user = await this.users.findOne({ userID, platform });
        if (!user) {
            user = await this.createUser(userID, platform);
        }
        user.wallet += parsedAmount;
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return { amount: parsedAmount };
    }
    async removeMoney(userID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        if (!(0, utils_1.isValidAmount)(amount))
            throw new TypeError('Please provide a valid amount');
        const parsedAmount = (0, utils_1.parseAmount)(amount);
        let user = await this.users.findOne({ userID, platform });
        if (!user) {
            user = await this.createUser(userID, platform);
            return { amount: 0 };
        }
        const actualAmount = Math.min(parsedAmount, user.wallet);
        user.wallet -= actualAmount;
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return { amount: actualAmount };
    }
    async transfer(fromUserID, toUserID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!fromUserID || !toUserID)
            throw new TypeError('Please provide both sender and receiver User IDs');
        if (!(0, utils_1.isValidAmount)(amount))
            throw new TypeError('Please provide a valid amount');
        const parsedAmount = (0, utils_1.parseAmount)(amount);
        if (fromUserID === toUserID) {
            return {
                success: false,
                amount: 0,
                fromUser: fromUserID,
                toUser: toUserID,
                platform
            };
        }
        const fromUser = await this.users.findOne({ userID: fromUserID, platform }) || await this.createUser(fromUserID, platform);
        const toUser = await this.users.findOne({ userID: toUserID, platform }) || await this.createUser(toUserID, platform);
        if (fromUser.wallet < parsedAmount) {
            return {
                success: false,
                amount: 0,
                fromUser: fromUserID,
                toUser: toUserID,
                platform
            };
        }
        fromUser.wallet -= parsedAmount;
        toUser.wallet += parsedAmount;
        fromUser.updatedAt = Date.now();
        toUser.updatedAt = Date.now();
        await this.users.updateOne({ userID: fromUserID, platform }, fromUser);
        await this.users.updateOne({ userID: toUserID, platform }, toUser);
        return {
            success: true,
            amount: parsedAmount,
            fromUser: fromUserID,
            toUser: toUserID,
            platform
        };
    }
    async daily(userID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        if (!(0, utils_1.isValidAmount)(amount))
            throw new TypeError('Please provide a valid amount');
        const parsedAmount = (0, utils_1.parseAmount)(amount);
        let user = await this.users.findOne({ userID, platform });
        if (!user) {
            user = await this.createUser(userID, platform);
        }
        const cooldown = DAILY_COOLDOWN - (Date.now() - parseInt(user.daily));
        if (cooldown > 0) {
            const cooldownInfo = (0, utils_1.formatCooldown)(cooldown);
            return {
                success: false,
                cooldown: cooldownInfo
            };
        }
        user.wallet += parsedAmount;
        user.daily = Date.now().toString();
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return {
            success: true,
            amount: parsedAmount
        };
    }
    async deposit(userID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        const user = await this.users.findOne({ userID, platform }) || await this.createUser(userID, platform);
        let depositAmount;
        if (amount === 'all') {
            depositAmount = user.wallet;
        }
        else if (!(0, utils_1.isValidAmount)(amount)) {
            throw new TypeError('Please provide a valid amount');
        }
        else {
            depositAmount = (0, utils_1.parseAmount)(amount);
        }
        if (depositAmount > user.wallet) {
            depositAmount = user.wallet;
        }
        const availableSpace = user.bankCapacity - user.bank;
        const actualDeposit = Math.min(depositAmount, availableSpace);
        user.wallet -= actualDeposit;
        user.bank += actualDeposit;
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return {
            success: actualDeposit > 0,
            amount: actualDeposit,
            newBalance: user.bank,
            type: 'deposit'
        };
    }
    async withdraw(userID, amount, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        const user = await this.users.findOne({ userID, platform }) || await this.createUser(userID, platform);
        let withdrawAmount;
        if (amount === 'all') {
            withdrawAmount = user.bank;
        }
        else if (!(0, utils_1.isValidAmount)(amount)) {
            throw new TypeError('Please provide a valid amount');
        }
        else {
            withdrawAmount = (0, utils_1.parseAmount)(amount);
        }
        if (withdrawAmount > user.bank) {
            withdrawAmount = user.bank;
        }
        user.bank -= withdrawAmount;
        user.wallet += withdrawAmount;
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return {
            success: withdrawAmount > 0,
            amount: withdrawAmount,
            newBalance: user.bank,
            type: 'withdraw'
        };
    }
    async leaderboard(count = 10, platform) {
        await this.ensureInitialized();
        if (!count || count <= 0)
            throw new TypeError('Please provide a valid count');
        let allUsers = await this.users.find();
        if (platform) {
            allUsers = allUsers.filter((user) => user.platform === platform);
        }
        const usersWithNetWorth = allUsers.map((user) => ({
            ...user,
            netWorth: user.wallet + user.bank
        }));
        const sortedUsers = usersWithNetWorth.sort((a, b) => b.netWorth - a.netWorth);
        const topUsers = sortedUsers.slice(0, count);
        return topUsers.map((user, index) => ({
            userID: user.userID,
            platform: user.platform,
            wallet: user.wallet,
            bank: user.bank,
            netWorth: user.netWorth,
            rank: index + 1
        }));
    }
    async upgradeBank(userID, capacity, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        if (!(0, utils_1.isValidAmount)(capacity))
            throw new TypeError('Please provide a valid capacity amount');
        const parsedCapacity = (0, utils_1.parseAmount)(capacity);
        let user = await this.users.findOne({ userID, platform });
        if (!user) {
            user = await this.createUser(userID, platform);
        }
        user.bankCapacity += parsedCapacity;
        user.updatedAt = Date.now();
        await this.users.updateOne({ userID, platform }, user);
        return { capacity: parsedCapacity };
    }
    async createUser(userID, platform) {
        const newUser = {
            userID,
            platform,
            wallet: 0,
            bank: 0,
            bankCapacity: 2500,
            daily: '0',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await this.users.put(newUser);
        return newUser;
    }
    async deleteUser(userID, platform = 'discord') {
        await this.ensureInitialized();
        if (!userID)
            throw new TypeError('Please provide a User ID');
        const user = await this.users.findOne({ userID, platform });
        if (user) {
            await this.users.deleteOne({ userID, platform });
            return { success: true };
        }
        return { success: false };
    }
    async getUserCount(platform) {
        await this.ensureInitialized();
        let users = await this.users.find();
        if (platform) {
            users = users.filter((user) => user.platform === platform);
        }
        return users.length;
    }
}
exports.FlareEconomy = FlareEconomy;
exports.default = FlareEconomy;
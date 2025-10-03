export interface EconomyUser {
    userID: string;
    platform: 'whatsapp' | 'discord';
    wallet: number;
    bank: number;
    bankCapacity: number;
    daily: string;
    createdAt: number;
    updatedAt: number;
}
export interface BalanceResult {
    wallet: number;
    bank: number;
    bankCapacity: number;
    netWorth: number;
}
export interface TransferResult {
    success: boolean;
    amount: number;
    fromUser: string;
    toUser: string;
    platform: string;
}
export interface DailyResult {
    success: boolean;
    amount?: number;
    cooldown?: {
        hours: number;
        minutes: number;
        seconds: number;
        formatted: string;
    };
}
export interface BankResult {
    success: boolean;
    amount: number;
    newBalance: number;
    type: 'deposit' | 'withdraw';
}
export interface LeaderboardEntry {
    userID: string;
    platform: string;
    wallet: number;
    bank: number;
    netWorth: number;
    rank: number;
}
export declare class FlareEconomy {
    private db;
    private users;
    constructor(dbPath?: string);
    private initializeDatabase;
    balance(userID: string, platform?: 'whatsapp' | 'discord'): Promise<BalanceResult>;
    addMoney(userID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<{
        amount: number;
    }>;
    removeMoney(userID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<{
        amount: number;
    }>;
    transfer(fromUserID: string, toUserID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<TransferResult>;
    daily(userID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<DailyResult>;
    deposit(userID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<BankResult>;
    withdraw(userID: string, amount: number | string, platform?: 'whatsapp' | 'discord'): Promise<BankResult>;
    leaderboard(count?: number, platform?: 'whatsapp' | 'discord'): Promise<LeaderboardEntry[]>;
    upgradeBank(userID: string, capacity: number | string, platform?: 'whatsapp' | 'discord'): Promise<{
        capacity: number;
    }>;
    private createUser;
    deleteUser(userID: string, platform?: 'whatsapp' | 'discord'): Promise<{
        success: boolean;
    }>;
    getUserCount(platform?: 'whatsapp' | 'discord'): Promise<number>;
}
export default FlareEconomy;
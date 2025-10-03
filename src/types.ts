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
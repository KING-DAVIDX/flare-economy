# Flare Economy

A robust FlareDB-based economy system for WhatsApp and Discord bots. Provides a simple and efficient way to manage virtual economies in your chat applications.

## Features

- 🏦 **Easy Balance Management** - Get, set, add, and subtract user balances
- 💰 **Bank System** - Wallet and bank balance with capacity management
- 📊 **Leaderboard** - Track top users by wallet, bank, or total balance
- 🔄 **Transaction System** - Deposit, withdraw, and transfer between users
- 🎁 **Daily Rewards** - Cooldown-based daily reward system
- 🌐 **Multi-Platform** - Support for Discord, WhatsApp, and other platforms
- 🚀 **High Performance** - Powered by FlareDB for fast data operations
- ⚡ **Simple API** - Easy to integrate with existing bot frameworks

## Installation

```bash
npm install flare-economy
```

## Quick Start

```javascript
const FlareEconomy = require('flare-economy');

// Initialize the economy system
const economy = new FlareEconomy('economy.db');

// Get user balance
const balance = await economy.balance('user123', 'discord');
console.log(`Wallet: ${balance.wallet}, Bank: ${balance.bank}, Total: ${balance.total}`);

// Add money to user
await economy.addMoney('user123', 'discord', 500);

// Daily reward
const daily = await economy.daily('user123', 'discord', 100);
if (daily.success) {
    console.log(`Received ${daily.amount} coins! New balance: ${daily.newBalance}`);
} else {
    console.log(`Cooldown: ${daily.timeLeft}`);
}
```

## API Reference

### Constructor

```javascript
new FlareEconomy(dbPath?: string)
```

**Parameters:**
- `dbPath`: Path to the FlareDB database file (default: 'economy.db')

### Core Methods

#### `balance(userID: string, platform?: string): Promise<Balance>`
Get user's wallet, bank, and total balance.

#### `addMoney(userID: string, platform: string, amount: number): Promise<TransactionResult>`
Add money to user's wallet.

#### `removeMoney(userID: string, platform: string, amount: number): Promise<TransactionResult>`
Remove money from user's wallet.

#### `setMoney(userID: string, platform: string, wallet: number, bank: number): Promise<SetMoneyResult>`
Set user's wallet and bank amounts.

#### `deposit(userID: string, platform: string, amount: number | 'all'): Promise<DepositResult>`
Deposit money from wallet to bank.

#### `withdraw(userID: string, platform: string, amount: number | 'all'): Promise<WithdrawResult>`
Withdraw money from bank to wallet.

#### `transfer(fromUserID: string, toUserID: string, platform: string, amount: number): Promise<TransferResult>`
Transfer money between users.

#### `daily(userID: string, platform: string, amount: number): Promise<DailyResult>`
Claim daily reward with cooldown.

#### `leaderboard(platform?: string, limit?: number, type?: string): Promise<User[]>`
Get leaderboard sorted by wallet, bank, or total balance.

#### `create(userID: string, platform?: string): Promise<User>`
Create a new user account.

#### `delete(userID: string, platform?: string): Promise<DeleteResult>`
Delete a user account.

#### `addBankCapacity(userID: string, platform: string, capacity: number): Promise<CapacityResult>`
Increase user's bank capacity.

## Examples

### Discord Bot Integration

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const FlareEconomy = require('flare-economy');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const economy = new FlareEconomy();

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'balance') {
    const balance = await economy.balance(interaction.user.id, 'discord');
    await interaction.reply(`Wallet: ${balance.wallet} | Bank: ${balance.bank}/${balance.bankCapacity} | Total: ${balance.total}`);
  }

  if (interaction.commandName === 'daily') {
    const daily = await economy.daily(interaction.user.id, 'discord', 100);
    if (daily.success) {
      await interaction.reply(`You received 100 coins! New balance: ${daily.newBalance}`);
    } else {
      await interaction.reply(`Please wait ${daily.timeLeft} before claiming your next daily reward.`);
    }
  }

  if (interaction.commandName === 'deposit') {
    const amount = interaction.options.getInteger('amount');
    const result = await economy.deposit(interaction.user.id, 'discord', amount);
    if (result.success) {
      await interaction.reply(`Deposited ${result.amount} coins! Wallet: ${result.wallet} | Bank: ${result.bank}`);
    } else {
      await interaction.reply('Your bank is full!');
    }
  }
});
```

### WhatsApp Bot Integration

```javascript
const { makeWASocket } = require('@whiskeysockets/baileys');
const FlareEconomy = require('flare-economy');

const sock = makeWASocket({});
const economy = new FlareEconomy();

sock.ev.on('messages.upsert', async ({ messages }) => {
  const message = messages[0];
  const text = message.message?.conversation;
  const sender = message.key.remoteJid;

  if (text === '!balance') {
    const balance = await economy.balance(sender, 'whatsapp');
    await sock.sendMessage(sender, { 
      text: `💵 *Balance*\nWallet: ${balance.wallet}\nBank: ${balance.bank}/${balance.bankCapacity}\nTotal: ${balance.total}` 
    });
  }

  if (text === '!daily') {
    const daily = await economy.daily(sender, 'whatsapp', 100);
    if (daily.success) {
      await sock.sendMessage(sender, { 
        text: `🎁 You received 100 coins!\nNew balance: ${daily.newBalance}` 
      });
    } else {
      await sock.sendMessage(sender, { 
        text: `⏰ Please wait ${daily.timeLeft} before your next daily reward.` 
      });
    }
  }
});
```

## Data Structures

### User Object
```javascript
{
  userID: string,
  platform: string,
  wallet: number,
  bank: number,
  bankCapacity: number,
  daily: string // timestamp of last daily claim
}
```

### Balance Object
```javascript
{
  wallet: number,
  bank: number,
  bankCapacity: number,
  total: number
}
```

### Daily Result
```javascript
{
  success: boolean,
  cooldown?: boolean,
  timeLeft?: string,
  hours?: number,
  minutes?: number,
  seconds?: number,
  amount?: number,
  newBalance?: number
}
```

### Transaction Result
```javascript
{
  amount: number,
  newBalance: number
}
```

## Error Handling

All methods include comprehensive error checking and will throw TypeErrors for invalid parameters:

```javascript
try {
  await economy.addMoney('user123', 'discord', -50);
} catch (error) {
  console.error(error.message); // "Amount can't be less than zero"
}
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/KING-DAVIDX/flare-economy
cd flare-economy

# Install dependencies
npm install

# For production
npm run prepublishOnly
```

## License

MIT © King David

### Contributors
- [Haki](https://github.com/hakisolos)
- [King David](https://github.com/KING-DAVIDX)

> CODE THE EARTH !!

For issues and feature requests, please open an issue on the GitHub repository.
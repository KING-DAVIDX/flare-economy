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
- 📦 **Dual Module Support** - Both ESM and CommonJS compatibility

## Installation

```bash
npm install flare-economy
```

## Quick Start

### ESM (ECMAScript Modules)
```javascript
import FlareEconomy from 'flare-economy';

// Initialize the economy system
const economy = new FlareEconomy({ dbPath: 'economy.db' });

// Get user balance
const balance = await economy.balance('user123', 'discord');
console.log(`Wallet: ${balance.wallet}, Bank: ${balance.bank}, Total: ${balance.total}`);

// Add money to user
await economy.give('user123', 'discord', 500);

// Daily reward
const daily = await economy.daily('user123', 'discord', 100);
if (daily.success) {
    console.log(`Received ${daily.amount} coins! New balance: ${daily.newBalance}`);
} else {
    console.log(`Cooldown: ${daily.readableTime}`);
}
```

### CommonJS
```javascript
const FlareEconomy = require('flare-economy');

// Initialize the economy system
const economy = new FlareEconomy({ dbPath: 'economy.db' });

// Get user balance
const balance = await economy.balance('user123', 'discord');
console.log(`Wallet: ${balance.wallet}, Bank: ${balance.bank}, Total: ${balance.total}`);

// Add money to user
await economy.give('user123', 'discord', 500);

// Daily reward
const daily = await economy.daily('user123', 'discord', 100);
if (daily.success) {
    console.log(`Received ${daily.amount} coins! New balance: ${daily.newBalance}`);
} else {
    console.log(`Cooldown: ${daily.readableTime}`);
}
```

## API Reference

### Constructor

```javascript
new FlareEconomy(options?: object)
```

**Parameters:**
- `options.dbPath`: Path to the FlareDB database file (default: 'economy.db')
- `options.dailyCooldown`: Daily reward cooldown in milliseconds (default: 24 hours)
- `options.defaultBankCapacity`: Default bank capacity for new users (default: 2500)

### Core Methods

#### `balance(userID: string, platform?: string): Promise<Balance>`
Get user's wallet, bank, and total balance.

#### `give(userID: string, platform: string, amount: number): Promise<TransactionResult>`
Add money to user's wallet.

#### `deduct(userID: string, platform: string, amount: number): Promise<TransactionResult>`
Remove money from user's wallet.

#### `setBankCapacity(userID: string, platform: string, capacity: number): Promise<CapacityResult>`
Set user's bank capacity.

#### `increaseBankCapacity(userID: string, platform: string, amount: number): Promise<CapacityResult>`
Increase user's bank capacity.

#### `deposit(userID: string, platform: string, amount: number | 'all'): Promise<DepositResult>`
Deposit money from wallet to bank.

#### `withdraw(userID: string, platform: string, amount: number | 'all'): Promise<WithdrawResult>`
Withdraw money from bank to wallet.

#### `daily(userID: string, platform: string, amount: number): Promise<DailyResult>`
Claim daily reward with cooldown.

#### `leaderboard(count?: number, platform?: string, sortBy?: string): Promise<User[]>`
Get leaderboard sorted by wallet, bank, or total balance.

#### `create(userID: string, platform?: string): Promise<CreateResult>`
Create a new user account.

#### `delete(userID: string, platform?: string): Promise<DeleteResult>`
Delete a user account.

## Examples

### Discord Bot Integration

#### ESM
```javascript
import { Client, GatewayIntentBits } from 'discord.js';
import FlareEconomy from 'flare-economy';

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
      await interaction.reply(`Please wait ${daily.readableTime} before claiming your next daily reward.`);
    }
  }

  if (interaction.commandName === 'deposit') {
    const amount = interaction.options.getInteger('amount');
    const result = await economy.deposit(interaction.user.id, 'discord', amount);
    if (result.success) {
      await interaction.reply(`Deposited ${result.amount} coins! Wallet: ${result.newWallet} | Bank: ${result.newBank}`);
    } else {
      await interaction.reply('Your bank is full or you have no funds!');
    }
  }

  if (interaction.commandName === 'give') {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const result = await economy.give(targetUser.id, 'discord', amount);
    await interaction.reply(`Gave ${amount} coins to ${targetUser.username}! Their new balance: ${result.newBalance}`);
  }
});
```

#### CommonJS
```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const FlareEconomy = require('flare-economy');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const economy = new FlareEconomy();

// Same implementation as ESM version...
```

### WhatsApp Bot Integration

#### ESM
```javascript
import { makeWASocket } from '@whiskeysockets/baileys';
import FlareEconomy from 'flare-economy';

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
        text: `⏰ Please wait ${daily.readableTime} before your next daily reward.` 
      });
    }
  }

  if (text.startsWith('!deposit')) {
    const amount = text.split(' ')[1] || 'all';
    const result = await economy.deposit(sender, 'whatsapp', amount === 'all' ? 'all' : parseInt(amount));
    if (result.success) {
      await sock.sendMessage(sender, { 
        text: `🏦 Deposited ${result.amount} coins!\nWallet: ${result.newWallet} | Bank: ${result.newBank}` 
      });
    } else {
      await sock.sendMessage(sender, { 
        text: `❌ Cannot deposit. Check if you have funds or bank space.` 
      });
    }
  }

  if (text.startsWith('!give')) {
    const [_, target, amountStr] = text.split(' ');
    const amount = parseInt(amountStr);
    if (target && amount) {
      const result = await economy.give(target, 'whatsapp', amount);
      await sock.sendMessage(sender, { 
        text: `🎁 Gave ${amount} coins to ${target}!\nTheir new balance: ${result.newBalance}` 
      });
    }
  }
});
```

#### CommonJS
```javascript
const { makeWASocket } = require('@whiskeysockets/baileys');
const FlareEconomy = require('flare-economy');

const sock = makeWASocket({});
const economy = new FlareEconomy();

// Same implementation as ESM version...
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
  lastDaily: number // timestamp of last daily claim
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
  remainingTime?: number,
  readableTime?: string,
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

### Deposit/Withdraw Result
```javascript
{
  success: boolean,
  amount: number,
  newWallet: number,
  newBank: number,
  reason?: string
}
```

## Error Handling

All methods include comprehensive error checking and will throw TypeErrors for invalid parameters:

```javascript
try {
  await economy.give('user123', 'discord', -50);
} catch (error) {
  console.error(error.message); // "Amount can't be less than zero"
}

try {
  await economy.deposit('user123', 'discord', 'invalid');
} catch (error) {
  console.error(error.message); // "The amount should be a number or 'all'"
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

## Module Support

Flare Economy supports both ESM and CommonJS modules:

- **ESM**: Use `import FlareEconomy from 'flare-economy'`
- **CommonJS**: Use `const FlareEconomy = require('flare-economy')`

The package automatically detects your environment and provides the appropriate module format.

## License

MIT © King David

### Contributors
- [Haki](https://github.com/hakisolos)
- [King David](https://github.com/KING-DAVIDX)

> CODE THE EARTH !!

For issues and feature requests, please open an issue on the GitHub repository.
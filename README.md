# Flare Economy

A robust FlareDB-based economy system for WhatsApp and Discord bots. Provides a simple and efficient way to manage virtual economies in your chat applications.

## Features

- 🏦 **Easy Balance Management** - Get, set, add, and subtract user balances
- 💰 **Transaction System** - Track all economic activities with timestamps
- 🔒 **TypeSafe** - Built with TypeScript for better development experience
- 📊 **Multiple Module Support** - Works with both CommonJS and ES modules
- 🚀 **High Performance** - Powered by FlareDB for fast data operations
- ⚡ **Simple API** - Easy to integrate with existing bot frameworks

## Installation

```bash
npm install flare-economy
```

## Quick Start

```typescript
import { FlareEconomy } from 'flare-economy';

// Initialize the economy system
const economy = new FlareEconomy('./economy.db', {
  defaultBalance: 1000,
  currency: 'coins'
});

// Create a user
const user = await economy.createUser('user123');

// Add money to user
await economy.addMoney('user123', 500, 'daily reward');

// Get user balance
const balance = await economy.getBalance('user123');
console.log(`User balance: ${balance} coins`);

// Transfer money between users
await economy.transfer('user123', 'user456', 200, 'gift');
```

## API Reference

### Constructor

```typescript
new FlareEconomy(dbPath: string, options?: Partial<EconomyOptions>)
```

**Parameters:**
- `dbPath`: Path to the FlareDB database file
- `options`: Configuration options (optional)
  - `defaultBalance`: Starting balance for new users (default: 1000)
  - `currency`: Currency name (default: 'coins')

### Core Methods

#### `getUser(userId: string): Promise<EconomyUser | null>`
Retrieve user data by ID.

#### `createUser(userId: string, initialBalance?: number): Promise<EconomyUser>`
Create a new user with optional initial balance.

#### `getBalance(userId: string): Promise<number>`
Get user's current balance.

#### `addMoney(userId: string, amount: number, reason?: string): Promise<Transaction>`
Add money to user's balance.

#### `subtractMoney(userId: string, amount: number, reason?: string): Promise<Transaction>`
Subtract money from user's balance.

#### `setBalance(userId: string, amount: number, reason?: string): Promise<Transaction>`
Set user's balance to specific amount.

#### `transfer(fromUserId: string, toUserId: string, amount: number, reason?: string): Promise<Transaction[]>`
Transfer money between two users.

#### `getTransactionHistory(userId: string, limit?: number): Promise<Transaction[]>`
Get user's transaction history.

## Examples

### Discord Bot Integration

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { FlareEconomy } from 'flare-economy';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const economy = new FlareEconomy('./economy.db');

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'balance') {
    const balance = await economy.getBalance(interaction.user.id);
    await interaction.reply(`Your balance: ${balance} coins`);
  }

  if (interaction.commandName === 'daily') {
    const transaction = await economy.addMoney(interaction.user.id, 100, 'daily reward');
    await interaction.reply(`You received 100 coins! New balance: ${transaction.newBalance}`);
  }
});
```

### WhatsApp Bot Integration

```typescript
import { makeWASocket } from 'baileys';
import { FlareEconomy } from 'flare-economy';

const sock = makeWASocket({});
const economy = new FlareEconomy('./economy.db');

sock.ev.on('messages.upsert', async ({ messages }) => {
  const message = messages[0];
  const text = message.message?.conversation;
  const sender = message.key.remoteJid;

  if (text === '!balance') {
    const balance = await economy.getBalance(sender);
    await sock.sendMessage(sender, { text: `Your balance: ${balance} coins` });
  }
});
```

## Database Schema

The system uses the following data structure:

### User Object
```typescript
interface EconomyUser {
  id: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transaction Object
```typescript
interface Transaction {
  id: string;
  userId: string;
  type: 'add' | 'subtract' | 'transfer';
  amount: number;
  balanceBefore: number;
  newBalance: number;
  reason?: string;
  timestamp: Date;
}
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/KING-DAVIDX/flare-economy
cd flare-economy

# Install dependencies
npm install

# Build the project
npm run build

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

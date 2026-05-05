# Linq Wallet

iMessage-controlled crypto wallet. Text commands to send ETH, manage addresses, and get notified on incoming transactions.

Built with Node.js, PostgreSQL, Redis, ethers.js, and the Linq Partner API V3.

---

## setup

### requirements
- Node 20+
- Docker
- Alchemy account (free)
- Linq sandbox account

### install

```bash
git clone <repo>
cd linq-project
npm install
cp .env.example .env
```

fill in `.env`:

LINQ_API_TOKEN=
LINQ_FROM_NUMBER=
ALCHEMY_WSS_URL=
WALLET_ENCRYPTION_KEY=
DATABASE_URL=postgres://linq:linq@localhost:5432/linq
REDIS_URL=redis://localhost:6379

generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### start

```bash
docker compose up -d
npm run migrate
npm run dev
```

### expose webhook

```bash
ngrok http 3000
```

register with Linq:

```bash
curl -X POST https://api.linqapp.com/api/partner/v3/webhook-subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://YOUR_NGROK_URL/webhook",
    "subscribed_events": ["message.received", "message.sent", "message.delivered"]
  }'
```

---

## commands

create wallet          create a new wallet
import <privatekey>    import existing wallet
export                 get your private key
balance                check ETH balance
address                show your address
send <amount> ETH to <name or 0x...>
add wallet <name> <address>
add wallet <address>
remove wallet <name>
wallets                list saved addresses
remind me in 30s to <message>
reminders              list active reminders
yes / no               confirm or cancel
help                   show all commands


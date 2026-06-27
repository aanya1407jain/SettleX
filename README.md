# SettleX — Fair Rental Deposits, Settled Securely

A Stellar Soroban-powered escrow platform for rental security deposits. Tenants lock their deposit in a neutral smart contract instead of sending it directly to landlords. At move-out, both parties settle it fairly on-chain.

## Architecture

```
Tenant
  ↓ locks XLM
SettleX Soroban Escrow Contract
  ├── Full Refund → Tenant
  └── Partial Deduction → Landlord + Remaining Balance → Tenant
```

## Project Structure

```
├── contract/                      # Soroban smart contract (Rust)
│   ├── Cargo.toml                 # Workspace root
│   └── contracts/contract/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs             # Contract implementation
│           └── test.rs            # Tests
└── client/                        # Next.js frontend
    ├── src/
    │   ├── app/                   # Next.js pages
    │   │   ├── page.tsx           # Dashboard / landing
    │   │   ├── deposit/new/       # Create deposit
    │   │   └── deposit/[id]/      # Deposit detail
    │   ├── components/            # UI components
    │   ├── hooks/                 # Contract interaction hooks
    │   ├── lib/                   # Utilities
    │   └── types/                 # TypeScript types
    └── packages/contract/         # Generated TS bindings (after deploy)
```

## Prerequisites

- [Rust](https://rustup.rs/) + `wasm32-unknown-unknown` target
- [Node.js 18+](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Freighter Wallet](https://freighter.app/) browser extension (Testnet mode)
- [Stellar CLI](https://developers.stellar.org/docs/build/tools/cli) (`stellar`)

## Setup

### 1. Contract

```bash
cd contract
cargo test                     # Run tests (10 tests)
```

### 2. Client

```bash
cd client
bun install                    # Install dependencies
bun run dev                    # Start dev server on localhost:3000
```

### 3. Build & Deploy Contract

```bash
cd contract
stellar contract build         # Build WASM
```

Fund a deployer account:

```bash
stellar keys generate dev --network testnet --fund
```

Deploy the contract:

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/contract.wasm \
  --source-account dev \
  --network testnet
```

Note the **contract address** (starts with `C...`). You'll need it for the frontend.

### 4. Set Up Frontend

Copy the contract address to `.env.local`:

```bash
cd client
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=C..." >> .env.local
```

Generate TypeScript bindings (optional, for typed client):

```bash
stellar contract bindings typescript \
  --network testnet \
  --contract-id C... \
  --output-dir packages/contract
```

```bash
# Then add to package.json:
# "dependencies": { "contract": "file:packages/contract" }
bun install
```

### 5. Run

```bash
bun run dev
```

Open `http://localhost:3000`, connect Freighter, and start using SettleX.

## Demo Mode

The app includes a Demo Mode that uses short timers (2–5 minutes) for live testing:

1. Toggle "Demo Mode" on the Create Deposit page
2. Set rental end to 2 or 5 minutes from now
3. Lock the deposit
4. Wait, then test the refund/deduction/deadline flows

## Smart Contract Functions

| Function | Auth | Description |
|---|---|---|
| `create_deposit` | Tenant | Create a deposit agreement |
| `lock_deposit` | Tenant | Lock XLM in escrow |
| `propose_full_refund` | Landlord | Propose full refund to tenant |
| `propose_partial_deduction` | Landlord | Propose a partial deduction with reason |
| `accept_full_refund` | Tenant | Accept full refund proposal |
| `accept_partial_deduction` | Tenant | Accept partial deduction |
| `reject_partial_deduction` | Tenant | Reject partial deduction (back to Active) |
| `claim_refund_after_deadline` | Tenant | Claim refund after deadline passes |
| `get_deposit_details` | Anyone | View deposit details |

## Deposit Statuses

- **Created** — Agreement made, not yet funded
- **Active** — XLM locked in escrow
- **FullRefundProposed** — Landlord offered full refund
- **PartialDeductionProposed** — Landlord proposed deduction
- **Settled** — Funds distributed

## Tech Stack

- **Blockchain**: Stellar Testnet, Soroban Smart Contracts
- **Backend**: Rust (soroban-sdk v25)
- **Frontend**: Next.js 16, Tailwind CSS v4
- **Wallet**: Freighter
- **SDK**: @stellar/stellar-sdk v16

## Testing

```bash
cd contract && cargo test     # 10 test cases
cd client && bun run build    # TypeScript check
```

## Stellar Testnet Resources

- [Stellar Expert Explorer](https://stellar.expert/explorer/testnet)
- [Friendbot (free XLM)](https://stellar.org/labs/#x)
- [Soroban Docs](https://soroban.stellar.org)

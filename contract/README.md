# SettleX Soroban Contract

Neutral escrow contract for rental security deposits. Written in Rust for Stellar Soroban.

## Build

```bash
stellar contract build
```

## Test

```bash
cargo test
```

10 test cases covering:
- Deposit creation
- Full refund workflow
- Partial deduction (accept & reject)
- Deadline refund claim
- Invalid state transitions
- Auth requirements
- Multiple independent deposits

## Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/contract.wasm \
  --source-account dev \
  --network testnet
```

## Contract Interface

### Constructor
```
__constructor(token: Address)  # Pass the native XLM token contract address
```

### Functions
See the main README for the full function reference.

## Statuses

| # | Status |
|---|--------|
| 0 | Created |
| 1 | Active |
| 2 | FullRefundProposed |
| 3 | PartialDeductionProposed |
| 5 | Settled |

## Native XLM Token Address

On testnet, the native XLM token contract must be passed during deployment. Use:
```
stellar contract id asset --asset native --network testnet
```

"use client";

import {
  rpc,
  TransactionBuilder,
  Operation,
  Transaction,
  xdr,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

import type { Deposit } from "@/types";

// ─── Config ──────────────────────────────────────────────────────────
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// ─── ScVal Helpers ───────────────────────────────────────────────────

function strToScVal(s: string): xdr.ScVal {
  return xdr.ScVal.scvString(s);
}

function u64ToScVal(n: bigint | string | number): xdr.ScVal {
  const val = typeof n === "bigint" ? n : BigInt(n);
  return xdr.ScVal.scvU64(new xdr.Uint64(val.toString()));
}

function i128ToScVal(n: bigint | string | number): xdr.ScVal {
  const val = typeof n === "bigint" ? n : BigInt(n);
  const abs = val < 0n ? -val : val;
  const lo = abs & 0xffffffffffffffffn;
  const hi = abs >> 64n;
  const hiVal = val < 0n ? -BigInt(hi > 0n ? hi.toString() : "0") : hi;
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      lo: new xdr.Uint64(lo.toString()),
      hi: new xdr.Uint64(hiVal > 0n ? hiVal.toString() : "0"),
    })
  );
}

function addressToScVal(addr: string): xdr.ScVal {
  return new Address(addr).toScVal();
}

function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL);
}

function buildContractOp(method: string, args: xdr.ScVal[]): xdr.Operation {
  return Operation.invokeContractFunction({
    contract: CONTRACT_ID,
    function: method,
    args: args,
  });
}

// ─── Wallet ──────────────────────────────────────────────────────────

export async function checkFreighter(): Promise<boolean> {
  try {
    const resp = await isConnected();
    return resp.isConnected;
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<string | null> {
  try {
    await requestAccess();
    const addrResp = await getAddress();
    return addrResp.address;
  } catch (e) {
    console.error("Failed to connect wallet:", e);
    return null;
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const resp = await getAddress();
    return resp.address;
  } catch {
    return null;
  }
}

// ─── Contract Call Helpers ───────────────────────────────────────────

async function simulateContractCall(
  method: string,
  args: xdr.ScVal[],
  source?: string
): Promise<any> {
  const server = getServer();
  const op = buildContractOp(method, args);

  const sourceAccount = source
    ? await server.getAccount(source)
    : await server.getAccount(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      );

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if ("error" in sim && sim.error) {
    throw new Error(`Contract simulation failed: ${sim.error}`);
  }

  if ("result" in sim && sim.result && "retval" in sim.result) {
    return sim.result.retval;
  }

  return null;
}

async function buildSignAndSend(
  method: string,
  args: xdr.ScVal[],
  walletAddr: string
): Promise<string> {
  const server = getServer();
  const op = buildContractOp(method, args);

  const source = await server.getAccount(walletAddr);

  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if ("error" in sim && sim.error) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();

  const signedXdrResp = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedTx = TransactionBuilder.fromXDR(
    (signedXdrResp as any).signedTxXdr || signedXdrResp,
    NETWORK_PASSPHRASE
  ) as Transaction;

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "PENDING" || sendResult.status === "DUPLICATE") {
    const hash = (sendResult as any).hash || "";

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const txResult = await server.getTransaction(hash);
        if (txResult.status === "SUCCESS") {
          return hash;
        }
        if (txResult.status === "FAILED") {
          throw new Error(`Transaction failed: ${JSON.stringify(txResult)}`);
        }
      } catch (e: any) {
        if (e.message?.includes("not found")) continue;
        throw e;
      }
    }
    throw new Error("Transaction timeout");
  }

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResult)}`);
  }

  return (sendResult as any).hash || "unknown";
}

function parseDeposit(raw: any): Deposit {
  const fields = raw as Record<string, any>;

  const get = (key: string): string => {
    const val = fields[key];
    if (val === undefined || val === null) return "";
    try {
      const native = scValToNative(val);
      return native === null || native === undefined ? "" : String(native);
    } catch {
      return String(val);
    }
  };

  return {
    tenant: get("tenant"),
    landlord: get("landlord"),
    amount: get("amount"),
    rental_end_date: get("rental_end_date"),
    review_period: get("review_period"),
    property_reference: get("property_reference"),
    status: (() => {
      try {
        const s = fields["status"];
        if (!s) return 0;
        return Number(scValToNative(s));
      } catch {
        return 0;
      }
    })(),
    deduction_amount: get("deduction_amount"),
    deduction_reason: get("deduction_reason"),
  };
}

// ─── Contract Methods ────────────────────────────────────────────────

export async function createDeposit(
  tenant: string,
  landlord: string,
  amountStroops: bigint | string,
  rentalEndDate: bigint | string,
  reviewPeriod: bigint | string,
  propertyReference: string
): Promise<{ depositId: string; txHash: string }> {
  const args = [
    addressToScVal(tenant),
    addressToScVal(landlord),
    i128ToScVal(amountStroops),
    u64ToScVal(rentalEndDate),
    u64ToScVal(reviewPeriod),
    strToScVal(propertyReference),
  ];
  const txHash = await buildSignAndSend("create_deposit", args, tenant);

  let depositId = "1";
  try {
    const retval = await simulateContractCall("create_deposit", args, tenant);
    if (retval) {
      const native = scValToNative(retval);
      depositId = String(native);
    }
  } catch {
    depositId = "1";
  }

  return { depositId, txHash };
}

export async function lockDeposit(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("lock_deposit", [u64ToScVal(depositId)], walletAddr);
}

export async function proposeFullRefund(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("propose_full_refund", [u64ToScVal(depositId)], walletAddr);
}

export async function proposePartialDeduction(
  walletAddr: string,
  depositId: bigint | string,
  deductionAmount: bigint | string,
  reason: string
): Promise<string> {
  return await buildSignAndSend(
    "propose_partial_deduction",
    [u64ToScVal(depositId), i128ToScVal(deductionAmount), strToScVal(reason)],
    walletAddr
  );
}

export async function acceptFullRefund(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("accept_full_refund", [u64ToScVal(depositId)], walletAddr);
}

export async function acceptPartialDeduction(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("accept_partial_deduction", [u64ToScVal(depositId)], walletAddr);
}

export async function rejectPartialDeduction(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("reject_partial_deduction", [u64ToScVal(depositId)], walletAddr);
}

export async function claimRefundAfterDeadline(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  return await buildSignAndSend("claim_refund_after_deadline", [u64ToScVal(depositId)], walletAddr);
}

export async function getDepositDetails(
  depositId: bigint | string
): Promise<Deposit | null> {
  try {
    const result = await simulateContractCall("get_deposit_details", [u64ToScVal(depositId)]);
    if (!result) return null;
    const raw = scValToNative(result) as Record<string, any>;
    return parseDeposit(raw);
  } catch (e) {
    console.error("Failed to get deposit details:", e);
    return null;
  }
}

// ─── Explorer Links ──────────────────────────────────────────────────

export function getExplorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function getExplorerContractUrl(contractId?: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId || CONTRACT_ID}`;
}

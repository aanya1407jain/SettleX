"use client";

import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";
import type { Deposit } from "@/types";
import { Client } from "contract";

// ─── Config ──────────────────────────────────────────────────────────
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

let _client: Client | null = null;

function getClient(publicKey?: string): Client {
  if (!_client) {
    _client = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: publicKey || "",
      signTransaction: async (xdr, opts) => {
        return freighterSign(xdr, {
          networkPassphrase: opts?.networkPassphrase || NETWORK_PASSPHRASE,
        });
      },
    });
  }
  return _client;
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

// ─── Type Converters ─────────────────────────────────────────────────

function toLocalDeposit(raw: {
  amount: bigint | string | number;
  deduction_amount: bigint | string | number;
  deduction_reason: string;
  landlord: string;
  property_reference: string;
  rental_end_date: bigint | string | number;
  review_period: bigint | string | number;
  status: number;
  tenant: string;
}): Deposit {
  return {
    tenant: raw.tenant,
    landlord: raw.landlord,
    amount: String(raw.amount),
    rental_end_date: String(raw.rental_end_date),
    review_period: String(raw.review_period),
    property_reference: raw.property_reference,
    status: Number(raw.status),
    deduction_amount: String(raw.deduction_amount),
    deduction_reason: raw.deduction_reason,
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
  const client = getClient(tenant);
  const tx = await client.create_deposit({
    tenant,
    landlord,
    amount: BigInt(amountStroops),
    rental_end_date: BigInt(rentalEndDate),
    review_period: BigInt(reviewPeriod),
    property_reference: propertyReference,
  });
  const sent = await tx.signAndSend();
  const depositId = String(sent.result ?? 1);
  const txHash = sent.sendTransactionResponse?.hash || "";
  return { depositId, txHash };
}

export async function lockDeposit(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.lock_deposit({ deposit_id: BigInt(depositId) });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function proposeFullRefund(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.propose_full_refund({
    deposit_id: BigInt(depositId),
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function proposePartialDeduction(
  walletAddr: string,
  depositId: bigint | string,
  deductionAmount: bigint | string,
  reason: string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.propose_partial_deduction({
    deposit_id: BigInt(depositId),
    deduction_amount: BigInt(deductionAmount),
    reason,
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function acceptFullRefund(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.accept_full_refund({
    deposit_id: BigInt(depositId),
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function acceptPartialDeduction(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.accept_partial_deduction({
    deposit_id: BigInt(depositId),
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function rejectPartialDeduction(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.reject_partial_deduction({
    deposit_id: BigInt(depositId),
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function claimRefundAfterDeadline(
  walletAddr: string,
  depositId: bigint | string
): Promise<string> {
  const client = getClient(walletAddr);
  const tx = await client.claim_refund_after_deadline({
    deposit_id: BigInt(depositId),
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash || "";
}

export async function getDepositDetails(
  depositId: bigint | string
): Promise<Deposit | null> {
  try {
    const client = getClient();
    const tx = await client.get_deposit_details({
      deposit_id: BigInt(depositId),
    });
    // The result is automatically populated from simulation (simulate: true by default)
    if (tx.result === undefined) return null;
    return toLocalDeposit(tx.result as any);
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

"use client";

import {
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

// ─── Client Factory (no global cache) ──────────────────────────────────
// Every call creates a fresh client with the CURRENT wallet public key.
// This avoids stale state when the user switches Freighter accounts.

export function getClient(publicKey: string): Client {
  if (!CONTRACT_ID) {
    throw new Error(
      "SettleX contract is not configured. Add NEXT_PUBLIC_CONTRACT_ADDRESS to client/.env.local and restart the server."
    );
  }

  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction: async (xdr, opts) =>
      freighterSign(xdr, {
        networkPassphrase:
          opts?.networkPassphrase || NETWORK_PASSPHRASE,
      }),
  });
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
  depositId: bigint | string,
  walletAddr?: string
): Promise<Deposit | null> {
  if (!walletAddr) return null;
  try {
    const client = getClient(walletAddr);
    const tx = await client.get_deposit_details({
      deposit_id: BigInt(depositId),
    });
    if (tx.result === undefined) return null;
    return toLocalDeposit(tx.result as any);
  } catch {
    // Deposit doesn't exist or RPC error — return null silently
    return null;
  }
}

// ─── Explorer & Clipboard Helpers ─────────────────────────────────────

export function getExplorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function getExplorerContractUrl(contractId?: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId || CONTRACT_ID}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

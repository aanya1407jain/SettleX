export interface Deposit {
  tenant: string;
  landlord: string;
  amount: string; // i128 as string (stroops)
  rental_end_date: string; // u64 as string
  review_period: string; // u64 as string
  property_reference: string;
  status: number;
  deduction_amount: string; // i128 as string
  deduction_reason: string;
}

export type DepositStatus =
  | "Created"
  | "Active"
  | "FullRefundProposed"
  | "PartialDeductionProposed"
  | "PartialDeductionAccepted"
  | "Settled";

export const STATUS_MAP: Record<number, DepositStatus> = {
  0: "Created",
  1: "Active",
  2: "FullRefundProposed",
  3: "PartialDeductionProposed",
  4: "PartialDeductionAccepted",
  5: "Settled",
};

export const STATUS_LABELS: Record<DepositStatus, string> = {
  Created: "Created",
  Active: "Active",
  FullRefundProposed: "Full Refund Proposed",
  PartialDeductionProposed: "Partial Deduction Proposed",
  PartialDeductionAccepted: "Partial Deduction Accepted",
  Settled: "Settled",
};

export type WalletState = {
  address: string | null;
  isConnected: boolean;
};

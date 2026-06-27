"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getDepositDetails,
  lockDeposit,
  proposeFullRefund,
  proposePartialDeduction,
  acceptFullRefund,
  acceptPartialDeduction,
  rejectPartialDeduction,
  claimRefundAfterDeadline,
} from "@/hooks/contract";
import { useWallet } from "@/context/WalletContext";
import type { Deposit } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import MoneyFlow from "@/components/MoneyFlow";
import {
  stroopsToXlm,
  truncateAddress,
  formatTimestamp,
  getCountdown,
} from "@/lib/utils";

export default function DepositDetail() {
  const params = useParams();
  const router = useRouter();
  const depositId = params.id as string;

  const { address: walletAddr } = useWallet();
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [txs, setTxs] = useState<{ action: string; hash: string; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Deduction form state
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [showDeductionForm, setShowDeductionForm] = useState(false);

  const fetchDeposit = useCallback(async () => {
    if (!depositId) return;
    setLoading(true);
    const dep = await getDepositDetails(depositId, walletAddr || undefined);
    setDeposit(dep);
    setLoading(false);
  }, [depositId, walletAddr]);

  useEffect(() => {
    if (depositId) fetchDeposit();
  }, [depositId, fetchDeposit]);

  const isTenant = walletAddr && deposit
    ? walletAddr.toLowerCase() === deposit.tenant.toLowerCase()
    : false;
  const isLandlord = walletAddr && deposit
    ? walletAddr.toLowerCase() === deposit.landlord.toLowerCase()
    : false;

  const deadline = deposit
    ? Number(deposit.rental_end_date) + Number(deposit.review_period)
    : 0;
  const deadlinePassed = Math.floor(Date.now() / 1000) > deadline;
  const rentalEnded = deposit
    ? Math.floor(Date.now() / 1000) > Number(deposit.rental_end_date)
    : false;

  const handleAction = async (action: string, actionFn: () => Promise<string>) => {
    setError("");
    setActionLoading(action);
    try {
      const hash = await actionFn();
      // Add to tx history
      setTxs((prev) => [
        ...prev,
        { action, hash, timestamp: Date.now() },
      ]);
      // Refresh deposit
      await fetchDeposit();
    } catch (e: any) {
      setError(e.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockDeposit = () =>
    handleAction("Lock Deposit", () => lockDeposit(walletAddr!, depositId));

  const handleProposeFullRefund = () =>
    handleAction("Propose Full Refund", () =>
      proposeFullRefund(walletAddr!, depositId)
    );

  const handleProposePartialDeduction = async () => {
    if (!deductionAmount || parseFloat(deductionAmount) <= 0) {
      setError("Please enter a valid deduction amount");
      return;
    }
    if (!deductionReason) {
      setError("Please enter a reason for the deduction");
      return;
    }
    const amountStroops = BigInt(Math.round(parseFloat(deductionAmount) * 10_000_000));
    if (deposit && amountStroops > BigInt(deposit.amount)) {
      setError("Deduction cannot exceed the deposit amount");
      return;
    }
    setShowDeductionForm(false);
    await handleAction("Propose Partial Deduction", () =>
      proposePartialDeduction(walletAddr!, depositId, amountStroops, deductionReason)
    );
    setDeductionAmount("");
    setDeductionReason("");
  };

  const handleAcceptFullRefund = () =>
    handleAction("Accept Full Refund", () =>
      acceptFullRefund(walletAddr!, depositId)
    );

  const handleAcceptPartialDeduction = () =>
    handleAction("Accept Partial Deduction", () =>
      acceptPartialDeduction(walletAddr!, depositId)
    );

  const handleRejectPartialDeduction = () =>
    handleAction("Reject Partial Deduction", () =>
      rejectPartialDeduction(walletAddr!, depositId)
    );

  const handleClaimRefund = () =>
    handleAction("Claim Refund", () =>
      claimRefundAfterDeadline(walletAddr!, depositId)
    );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mx-auto" />
          <div className="h-4 bg-slate-200 rounded-lg w-64 mx-auto" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          Deposit Not Found
        </h2>
        <p className="text-slate-500 mb-6">
          We couldn't find deposit #{depositId}. It may not exist yet or there
          was an error fetching it.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-violet-50 text-violet-700 font-medium rounded-xl hover:bg-violet-100 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0 mt-1"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {deposit.property_reference || `Deposit #${depositId}`}
            </h1>
            <StatusBadge status={deposit.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deposit ID: {depositId}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
              Deposit Amount
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">
              {stroopsToXlm(deposit.amount)}{" "}
              <span className="text-lg font-medium text-slate-400">XLM</span>
            </p>

            {/* Countdown if active */}
            {deposit.status === 1 && (
              <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    Rental End
                  </p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">
                    {formatTimestamp(deposit.rental_end_date)}
                  </p>
                  {!rentalEnded && (
                    <p className="text-xs text-amber-500 mt-0.5">
                      {getCountdown(deposit.rental_end_date)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    Review Deadline
                  </p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">
                    {formatTimestamp(deadline)}
                  </p>
                  {deposit.status === 1 && (
                    <p className={`text-xs mt-0.5 ${deadlinePassed ? 'text-red-500' : 'text-amber-500'}`}>
                      {getCountdown(deadline)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Details
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Tenant"
                value={deposit.tenant}
                highlight={isTenant}
              />
              <DetailRow
                label="Landlord"
                value={deposit.landlord}
                highlight={isLandlord}
              />
              <DetailRow
                label="Property"
                value={deposit.property_reference || "—"}
              />
              <DetailRow
                label="Rental End Date"
                value={formatTimestamp(deposit.rental_end_date)}
              />
              <DetailRow
                label="Review Period"
                value={
                  Number(deposit.review_period) >= 86400
                    ? `${Number(deposit.review_period) / 86400} days`
                    : `${Number(deposit.review_period)} seconds`
                }
              />
              <DetailRow
                label="Deadline"
                value={formatTimestamp(deadline)}
              />
              <DetailRow
                label="Status"
                value={<StatusBadge status={deposit.status} />}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {(deposit.status === 0 ||
            deposit.status === 1 ||
            deposit.status === 2 ||
            deposit.status === 3 ||
            deposit.status === 5) && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Actions
              </h3>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Created → Lock (Tenant only) */}
              {deposit.status === 0 && isTenant && (
                <button
                  onClick={handleLockDeposit}
                  disabled={actionLoading !== null}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 transition-all shadow-md"
                >
                  {actionLoading === "Lock Deposit" ? "Processing..." : "Lock Deposit"}
                </button>
              )}

              {/* Active state actions */}
              {deposit.status === 1 && (
                <div className="space-y-3">
                  {/* Tenant: Claim if deadline passed */}
                  {isTenant && deadlinePassed && (
                    <button
                      onClick={handleClaimRefund}
                      disabled={actionLoading !== null}
                      className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
                    >
                      {actionLoading === "Claim Refund" ? "Processing..." : "Claim Full Refund (Deadline Passed)"}
                    </button>
                  )}

                  {/* Landlord: Propose actions */}
                  {isLandlord && !deadlinePassed && (
                    <div className="space-y-3">
                      <button
                        onClick={handleProposeFullRefund}
                        disabled={actionLoading !== null}
                        className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-sm"
                      >
                        {actionLoading === "Propose Full Refund"
                          ? "Processing..."
                          : "Propose Full Refund"}
                      </button>

                      {!showDeductionForm ? (
                        <button
                          onClick={() => setShowDeductionForm(true)}
                          className="w-full py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-all shadow-sm"
                        >
                          Propose Partial Deduction
                        </button>
                      ) : (
                        <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">
                              Deduction Amount (XLM)
                            </label>
                            <input
                              type="number"
                              step="0.0000001"
                              min="0"
                              max={stroopsToXlm(deposit.amount)}
                              value={deductionAmount}
                              onChange={(e) => setDeductionAmount(e.target.value)}
                              placeholder={`Max ${stroopsToXlm(deposit.amount)} XLM`}
                              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">
                              Reason
                            </label>
                            <input
                              type="text"
                              value={deductionReason}
                              onChange={(e) => setDeductionReason(e.target.value)}
                              placeholder="e.g. Unpaid utility bills"
                              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleProposePartialDeduction}
                              disabled={actionLoading !== null}
                              className="flex-1 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
                            >
                              {actionLoading === "Propose Partial Deduction"
                                ? "Processing..."
                                : "Submit Deduction"}
                            </button>
                            <button
                              onClick={() => setShowDeductionForm(false)}
                              className="py-2 px-4 bg-white border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FullRefundProposed → Accept (Tenant only) */}
              {deposit.status === 2 && isTenant && (
                <button
                  onClick={handleAcceptFullRefund}
                  disabled={actionLoading !== null}
                  className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md"
                >
                  {actionLoading === "Accept Full Refund"
                    ? "Processing..."
                    : "Accept Full Refund"}
                </button>
              )}

              {/* PartialDeductionProposed → Accept/Reject (Tenant only) */}
              {deposit.status === 3 && isTenant && (
                <div className="space-y-3">
                  {deposit.deduction_amount && Number(deposit.deduction_amount) > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-sm font-medium text-amber-800">
                        Deduction: {stroopsToXlm(deposit.deduction_amount)} XLM
                      </p>
                      {deposit.deduction_reason && (
                        <p className="text-xs text-amber-600 mt-1">
                          Reason: {deposit.deduction_reason}
                        </p>
                      )}
                      <p className="text-xs text-amber-700 mt-2">
                        You will receive:{" "}
                        {stroopsToXlm(
                          BigInt(deposit.amount) - BigInt(deposit.deduction_amount)
                        )}{" "}
                        XLM
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleAcceptPartialDeduction}
                      disabled={actionLoading !== null}
                      className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {actionLoading === "Accept Partial Deduction"
                        ? "Processing..."
                        : "Accept"}
                    </button>
                    <button
                      onClick={handleRejectPartialDeduction}
                      disabled={actionLoading !== null}
                      className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {actionLoading === "Reject Partial Deduction"
                        ? "Processing..."
                        : "Reject"}
                    </button>
                  </div>
                </div>
              )}

              {/* Settlement info for tenant when settled */}
              {deposit.status === 5 && isTenant && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800">
                    Deposit Settled ✓
                  </p>
                  {Number(deposit.deduction_amount) > 0 && (
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-emerald-700">
                        Refunded:{" "}
                        {stroopsToXlm(
                          BigInt(deposit.amount) - BigInt(deposit.deduction_amount)
                        )}{" "}
                        XLM
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <Timeline deposit={deposit} txs={txs} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MoneyFlow />

          {/* Quick Info */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Quick Info
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                {isTenant
                  ? "You are the <span class='font-medium text-slate-900'>tenant</span> in this deposit."
                  : isLandlord
                  ? "You are the <span class='font-medium text-slate-900'>landlord</span> in this deposit."
                  : "You are not a party to this deposit."}
              </p>
              {deposit.status === 0 && isTenant && (
                <p className="text-xs text-slate-400">
                  Lock the deposit to activate the escrow. This will move XLM
                  from your wallet to the contract.
                </p>
              )}
              {deposit.status === 1 && isLandlord && (
                <p className="text-xs text-slate-400">
                  Once the rental period ends, you can propose a full refund or
                  a partial deduction with a reason.
                </p>
              )}
              {deposit.status === 1 && isTenant && deadlinePassed && (
                <p className="text-xs text-red-500">
                  The deadline has passed. You can claim your full refund.
                </p>
              )}
              {deposit.status === 2 && isTenant && (
                <p className="text-xs text-emerald-600">
                  The landlord has proposed a full refund. Accept it to receive
                  your deposit back.
                </p>
              )}
              {deposit.status === 3 && isTenant && (
                <p className="text-xs text-amber-600">
                  The landlord has proposed a deduction. Review and accept or
                  reject it.
                </p>
              )}
              {deposit.status === 5 && (
                <p className="text-xs text-slate-400">
                  This deposit has been settled. All funds have been
                  distributed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-sm text-right ml-4 ${
          highlight ? "text-violet-600 font-medium" : "text-slate-700"
        }`}
      >
        {typeof value === "string" && (value.startsWith("G") || value.startsWith("C")) ? (
          <span className="font-mono" title={value}>
            {truncateAddress(value)}
            {highlight && (
              <span className="ml-1.5 text-[10px] text-violet-500 font-semibold">
                (You)
              </span>
            )}
          </span>
        ) : typeof value === "string" ? (
          <span>{value}</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Deposit } from "@/types";
import StatusBadge from "./StatusBadge";
import { stroopsToXlm, truncateAddress, getCountdown, formatTimestamp } from "@/lib/utils";

interface Props {
  depositId: string;
  deposit: Deposit;
  walletAddr?: string | null;
}

export default function DepositCard({ depositId, deposit, walletAddr }: Props) {
  const isTenant = walletAddr?.toLowerCase() === deposit.tenant.toLowerCase();
  const isLandlord = walletAddr?.toLowerCase() === deposit.landlord.toLowerCase();
  const isActive = deposit.status === 1;

  const deadline =
    Number(deposit.rental_end_date) + Number(deposit.review_period);
  const deadlinePassed = Math.floor(Date.now() / 1000) > deadline;

  return (
    <Link
      href={`/deposit/${depositId}`}
      className="block group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-lg hover:border-violet-200/80 transition-all duration-300">
        {/* Gradient top bar */}
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-blue-500" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                {deposit.property_reference || `Deposit #${depositId}`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ID: {depositId}
              </p>
            </div>
            <StatusBadge status={deposit.status} />
          </div>

          {/* Amount */}
          <div className="mb-4">
            <span className="text-2xl font-bold text-slate-900">
              {stroopsToXlm(deposit.amount)}{" "}
              <span className="text-sm font-medium text-slate-400">XLM</span>
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Tenant
              </p>
              <p className="text-slate-700 font-mono text-xs mt-0.5">
                {truncateAddress(deposit.tenant)}
                {isTenant && (
                  <span className="ml-1.5 text-emerald-600 text-[10px] font-semibold">
                    (You)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Landlord
              </p>
              <p className="text-slate-700 font-mono text-xs mt-0.5">
                {truncateAddress(deposit.landlord)}
                {isLandlord && (
                  <span className="ml-1.5 text-violet-600 text-[10px] font-semibold">
                    (You)
                  </span>
                )}
              </p>
            </div>
            {deposit.status === 1 && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Rental End
                </p>
                <p className="text-slate-700 text-xs mt-0.5">
                  {formatTimestamp(deposit.rental_end_date)}
                </p>
              </div>
            )}
            {deposit.status === 1 && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Deadline
                </p>
                <p className={`text-xs mt-0.5 font-medium ${deadlinePassed ? 'text-red-500' : 'text-amber-500'}`}>
                  {getCountdown(deadline)}
                </p>
              </div>
            )}
          </div>

          {/* Deduction info if proposed */}
          {(deposit.status === 3 || deposit.status === 4) && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 font-medium">
                Deduction proposed: {stroopsToXlm(deposit.deduction_amount)} XLM
              </p>
              {deposit.deduction_reason && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Reason: {deposit.deduction_reason}
                </p>
              )}
            </div>
          )}

          {/* Quick action hint */}
          {isActive && isLandlord && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-violet-600 font-medium group-hover:underline">
                Propose settlement →
              </span>
            </div>
          )}
          {deposit.status === 2 && isTenant && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-emerald-600 font-medium group-hover:underline">
                Accept full refund →
              </span>
            </div>
          )}
          {deposit.status === 3 && isTenant && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-amber-600 font-medium group-hover:underline">
                Review deduction →
              </span>
            </div>
          )}
          {isActive && deadlinePassed && isTenant && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-red-600 font-medium group-hover:underline">
                Claim refund →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

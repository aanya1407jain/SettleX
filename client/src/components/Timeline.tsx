import type { Deposit } from "@/types";
import { formatTimestamp, stroopsToXlm, truncateAddress } from "@/lib/utils";

const STEPS: { status: number; label: string; desc: string }[] = [
  { status: 0, label: "Agreement Created", desc: "Tenant created the deposit agreement" },
  { status: 1, label: "Deposit Locked", desc: "XLM deposited into escrow contract" },
  { status: 2, label: "Full Refund Proposed", desc: "Landlord proposed full refund" },
  { status: 3, label: "Partial Deduction Proposed", desc: "Landlord proposed partial deduction" },
  { status: 4, label: "Deduction Accepted", desc: "Tenant accepted the deduction" },
  { status: 5, label: "Settled", desc: "Deposit has been settled" },
];

function getStepStatus(stepStatus: number, depositStatus: number): "done" | "current" | "upcoming" {
  if (depositStatus === 5) {
    // For partial deduction path
    if (stepStatus === 3 || stepStatus === 4 || stepStatus === 5) return "done";
    if (stepStatus === 1 || stepStatus === 0) return "done";
    return stepStatus === 0 || stepStatus === 1 ? "done" : "upcoming";
  }
  if (stepStatus < depositStatus) return "done";
  if (stepStatus === depositStatus) return "current";
  return "upcoming";
}

interface Props {
  deposit: Deposit;
  txs?: { action: string; hash: string; timestamp: number }[];
}

export default function Timeline({ deposit, txs }: Props) {
  const status = deposit.status;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity</h3>

      {/* Status Steps */}
      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const stepSt = getStepStatus(step.status, status);
          const isLast = idx === STEPS.length - 1;

          // Skip showing incompatible paths
          if (step.status === 2 && status >= 3 && status !== 2) return null;
          if (step.status === 3 && status === 2) return null;
          if (step.status === 4 && status !== 4 && status !== 5) return null;

          return (
            <div key={step.status} className="flex gap-3">
              {/* Line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 ${
                    stepSt === "done"
                      ? "bg-emerald-500 border-emerald-500"
                      : stepSt === "current"
                      ? "bg-violet-500 border-violet-500 animate-pulse"
                      : "bg-white border-slate-300"
                  }`}
                />
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[24px] ${
                      stepSt === "done" ? "bg-emerald-200" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 ${isLast ? "" : ""}`}>
                <p
                  className={`text-sm font-medium ${
                    stepSt === "done"
                      ? "text-slate-500"
                      : stepSt === "current"
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction history */}
      {txs && txs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Transaction History
          </p>
          <div className="space-y-1.5">
            {txs.map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1"
              >
                <span className="text-slate-600">{tx.action}</span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-800 font-mono"
                >
                  {tx.hash.slice(0, 8)}...
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement breakdown for settled deposits */}
      {status === 5 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Settlement
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total deposit</span>
              <span className="font-medium text-slate-900">
                {stroopsToXlm(deposit.amount)} XLM
              </span>
            </div>
            {Number(deposit.deduction_amount) > 0 && (
              <>
                <div className="flex justify-between text-amber-600">
                  <span>Deduction (→ landlord)</span>
                  <span className="font-medium">
                    -{stroopsToXlm(deposit.deduction_amount)} XLM
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 pt-1 border-t border-slate-100">
                  <span>Refund (→ tenant)</span>
                  <span className="font-medium">
                    {stroopsToXlm(
                      BigInt(deposit.amount) - BigInt(deposit.deduction_amount)
                    )}{" "}
                    XLM
                  </span>
                </div>
              </>
            )}
            {Number(deposit.deduction_amount) === 0 && (
              <div className="flex justify-between text-emerald-600 pt-1">
                <span>Full refund (→ tenant)</span>
                <span className="font-medium">
                  {stroopsToXlm(deposit.amount)} XLM
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

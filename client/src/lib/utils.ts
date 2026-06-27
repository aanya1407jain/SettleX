import type { DepositStatus, STATUS_MAP } from "@/types";

// 1 XLM = 10,000,000 stroops
export const STROOPS_PER_XLM = 10_000_000n;

export function xlmToStroops(xlm: string): bigint {
  const parts = xlm.split(".");
  const whole = parts[0] || "0";
  let fraction = parts[1] || "";
  // Pad or truncate to 7 decimal places
  while (fraction.length < 7) fraction += "0";
  fraction = fraction.slice(0, 7);
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(fraction);
}

export function stroopsToXlm(stroops: string | bigint): string {
  const s = typeof stroops === "string" ? BigInt(stroops) : stroops;
  const whole = s / STROOPS_PER_XLM;
  const fraction = s % STROOPS_PER_XLM;
  const fractionStr = fraction.toString().padStart(7, "0").replace(/0+$/, "");
  return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
}

export function truncateAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function formatTimestamp(ts: string | number): string {
  const num = typeof ts === "string" ? Number(ts) : ts;
  // If it's a Unix timestamp in seconds
  const date = new Date(num * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCountdown(ts: string | number): string {
  const num = typeof ts === "string" ? Number(ts) : ts;
  const now = Math.floor(Date.now() / 1000);
  const diff = num - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function getStatusColor(status: number): string {
  switch (status) {
    case 0:
      return "bg-blue-100 text-blue-800 border-blue-200"; // Created
    case 1:
      return "bg-emerald-100 text-emerald-800 border-emerald-200"; // Active
    case 2:
      return "bg-purple-100 text-purple-800 border-purple-200"; // FullRefundProposed
    case 3:
      return "bg-amber-100 text-amber-800 border-amber-200"; // PartialDeductionProposed
    case 4:
      return "bg-indigo-100 text-indigo-800 border-indigo-200"; // PartialDeductionAccepted
    case 5:
      return "bg-slate-100 text-slate-600 border-slate-200"; // Settled
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function getStatusBadgeBg(status: number): string {
  switch (status) {
    case 0: return "bg-blue-500";
    case 1: return "bg-emerald-500";
    case 2: return "bg-purple-500";
    case 3: return "bg-amber-500";
    case 4: return "bg-indigo-500";
    case 5: return "bg-slate-400";
    default: return "bg-gray-400";
  }
}

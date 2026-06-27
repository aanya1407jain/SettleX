import { getStatusColor, getStatusBadgeBg } from "@/lib/utils";

const STATUS_NAMES: Record<number, string> = {
  0: "Created",
  1: "Active",
  2: "Full Refund Proposed",
  3: "Partial Deduction Proposed",
  4: "Partial Deduction Accepted",
  5: "Settled",
};

export default function StatusBadge({ status }: { status: number }) {
  const color = getStatusColor(status);
  const bg = getStatusBadgeBg(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${bg}`}
      />
      {STATUS_NAMES[status] || `Unknown (${status})`}
    </span>
  );
}

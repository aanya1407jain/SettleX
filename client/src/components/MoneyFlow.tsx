export default function MoneyFlow() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        How It Works
      </h3>
      <div className="flex flex-col items-center gap-3">
        {/* Tenant */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-50 to-violet-100/60 rounded-xl border border-violet-200/60 w-full">
          <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            T
          </div>
          <span className="text-sm font-medium text-slate-700">Tenant</span>
          <span className="ml-auto text-xs text-slate-400 font-mono">locks XLM</span>
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Connector */}
        <div className="w-0.5 h-6 bg-gradient-to-b from-violet-300 to-blue-300" />

        {/* Escrow */}
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-blue-500 rounded-xl shadow-md w-full text-center">
          <p className="text-white font-semibold text-sm">SettleX Escrow</p>
          <p className="text-white/70 text-xs mt-0.5">neutral &bull; secure &bull; on-chain</p>
        </div>

        {/* Connector split */}
        <div className="flex items-center gap-0 w-full">
          <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-300 to-emerald-300" />
          <span className="px-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-300 to-amber-400" />
        </div>

        {/* Two outcomes */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Full Refund */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              T
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700">Full Refund</p>
              <p className="text-[10px] text-emerald-500">→ Tenant</p>
            </div>
          </div>

          {/* Partial Deduction */}
          <div className="flex flex-col gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                L
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700">Deduction</p>
                <p className="text-[10px] text-amber-500">→ Landlord</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                T
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-700">Balance</p>
                <p className="text-[10px] text-emerald-500">→ Tenant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

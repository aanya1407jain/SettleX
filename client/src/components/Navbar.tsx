"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  checkFreighter,
  connectWallet,
  getWalletAddress,
} from "@/hooks/contract";

export default function Navbar() {
  const pathname = usePathname();
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await checkFreighter();
      if (ok) {
        const addr = await getWalletAddress();
        if (addr) setAddress(addr);
      }
    })();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const addr = await connectWallet();
      if (addr) setAddress(addr);
    } finally {
      setLoading(false);
    }
  };

  const isLandlord = pathname?.startsWith("/deposit") ? false : true;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-sm">SX</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">
              SettleX
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {address ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {address.slice(0, 4)}...{address.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Connect Wallet
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

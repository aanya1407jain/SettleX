"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { checkFreighter, connectWallet, getWalletAddress, getDepositDetails } from "@/hooks/contract";
import type { Deposit } from "@/types";
import DepositCard from "@/components/DepositCard";
import MoneyFlow from "@/components/MoneyFlow";
import { stroopsToXlm } from "@/lib/utils";

const DEMO_DEPOSITS = [
  { id: "1", property: "Downtown Studio Apt 3B", amount: "2000000000" },
  { id: "2", property: "Suburb Townhouse Unit 7", amount: "3500000000" },
];

export default function Home() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deposits, setDeposits] = useState<{ id: string; data: Deposit }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await checkFreighter();
      if (ok) {
        const addr = await getWalletAddress();
        if (addr) {
          setWalletAddr(addr);
        }
      }
      setLoading(false);
    })();
  }, []);

  const fetchDeposits = useCallback(async () => {
    if (!walletAddr) return;
    // Try to fetch deposits from the contract (IDs 1-10)
    const results: { id: string; data: Deposit }[] = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const dep = await getDepositDetails(String(i));
        if (dep) {
          const tLower = dep.tenant.toLowerCase();
          const lLower = dep.landlord.toLowerCase();
          const wLower = walletAddr.toLowerCase();
          if (tLower === wLower || lLower === wLower) {
            results.push({ id: String(i), data: dep });
          }
        }
      } catch {
        // No more deposits
        break;
      }
    }
    setDeposits(results);
  }, [walletAddr]);

  useEffect(() => {
    if (walletAddr) {
      fetchDeposits();
    }
  }, [walletAddr, fetchDeposits]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      if (addr) setWalletAddr(addr);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      {!walletAddr && (
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 mb-6 shadow-lg shadow-violet-200">
            <span className="text-white font-bold text-2xl">SX</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            SettleX
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-2">
            Fair rental deposits, settled securely.
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8">
            Your deposit stays protected from move-in to move-out. A neutral
            escrow layer for tenants and landlords — powered by Stellar Soroban.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300"
          >
            {connecting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Freighter Wallet
              </>
            )}
          </button>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 mt-16 max-w-3xl mx-auto text-left">
            {[
              { title: "For Tenants", desc: "Your deposit is held in neutral escrow — not in the landlord's wallet. No more disputes based only on trust." },
              { title: "For Landlords", desc: "Fair deduction system with transparent reasoning. Get paid for legitimate damages without awkward conversations." },
              { title: "On-Chain", desc: "Every action is recorded on the Stellar blockchain. Full audit trail with verifiable transaction hashes." },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Money Flow */}
          <div className="mt-12 max-w-md mx-auto">
            <MoneyFlow />
          </div>

          {/* How it works steps */}
          <div className="mt-16 text-left max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
              How It Works
            </h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Connect Wallet", desc: "Connect your Freighter wallet to get started." },
                { step: "2", title: "Create Agreement", desc: "Tenant creates a deposit agreement with landlord's address and rental terms." },
                { step: "3", title: "Lock Deposit", desc: "Tenant locks XLM into the Soroban escrow contract." },
                { step: "4", title: "Move Out", desc: "Landlord proposes full refund or partial deduction. Tenant accepts or rejects." },
                { step: "5", title: "Settled", desc: "Funds are released fairly based on the agreed settlement." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-white border border-slate-200/60">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard - Connected */}
      {walletAddr && (
        <div className="animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Connected as{" "}
                <span className="font-mono text-violet-600">
                  {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
                </span>
              </p>
            </div>
            <Link
              href="/deposit/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Deposit
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Active Deposits", value: deposits.filter(d => [0, 1, 2, 3, 4].includes(d.data.status)).length, color: "text-violet-600" },
              { label: "Settled", value: deposits.filter(d => d.data.status === 5).length, color: "text-slate-600" },
              { label: "Total Locked", value: `${stroopsToXlm(deposits.reduce((sum, d) => sum + BigInt(d.data.amount), 0n))} XLM`, color: "text-emerald-600" },
              { label: "As Landlord", value: deposits.filter(d => d.data.landlord.toLowerCase() === walletAddr.toLowerCase()).length, color: "text-blue-600" },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Deposits List */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Your Deposits
            </h2>
            {deposits.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-2xl border border-slate-200/60 border-dashed">
                <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-slate-500 font-medium">No deposits yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Create a new deposit agreement to get started.
                </p>
                <Link
                  href="/deposit/new"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-violet-50 text-violet-700 text-sm font-medium rounded-xl hover:bg-violet-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Deposit
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deposits.map((d) => (
                  <DepositCard
                    key={d.id}
                    depositId={d.id}
                    deposit={d.data}
                    walletAddr={walletAddr}
                  />
                ))}
              </div>
            )}
          </div>

          {/* MoneyFlow */}
          <div className="mt-8 max-w-md">
            <MoneyFlow />
          </div>
        </div>
      )}
    </div>
  );
}

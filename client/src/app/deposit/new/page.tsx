"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkFreighter,
  connectWallet,
  getWalletAddress,
  createDeposit,
} from "@/hooks/contract";
import { xlmToStroops } from "@/lib/utils";

export default function NewDeposit() {
  const router = useRouter();
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState(false);

  const [form, setForm] = useState({
    propertyReference: "",
    landlordAddress: "",
    amount: "",
    rentalEndDate: "",
    rentalEndTime: "23:59",
    reviewPeriod: "7",
    notes: "",
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState<{ depositId: string; txHash: string } | null>(null);

  useEffect(() => {
    (async () => {
      const ok = await checkFreighter();
      if (ok) {
        const addr = await getWalletAddress();
        if (addr) setWalletAddr(addr);
      }
    })();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      if (addr) setWalletAddr(addr);
    } finally {
      setConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!walletAddr) throw new Error("Please connect your wallet");
      if (!form.propertyReference) throw new Error("Property reference is required");
      if (!form.landlordAddress) throw new Error("Landlord address is required");
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error("Valid deposit amount is required");
      if (!form.rentalEndDate && !useDemoMode) throw new Error("Rental end date is required");

      // Calculate rental end timestamp
      let rentalEndTimestamp: number;
      let reviewPeriodSeconds: number;

      if (useDemoMode) {
        // Demo mode: very short timers
        const demoMinutes = parseInt(form.rentalEndDate) || 2;
        rentalEndTimestamp = Math.floor(Date.now() / 1000) + demoMinutes * 60;
        reviewPeriodSeconds = (parseInt(form.reviewPeriod) || 1) * 60;
      } else {
        // Normal mode
        const [year, month, day] = form.rentalEndDate.split("-").map(Number);
        const [hours, minutes] = form.rentalEndTime.split(":").map(Number);
        const endDate = new Date(year, month - 1, day, hours, minutes);
        rentalEndTimestamp = Math.floor(endDate.getTime() / 1000);

        if (rentalEndTimestamp <= Math.floor(Date.now() / 1000)) {
          throw new Error("Rental end date must be in the future");
        }

        reviewPeriodSeconds = parseInt(form.reviewPeriod) * 86400; // days to seconds
      }

      const amountStroops = xlmToStroops(form.amount);

      if (amountStroops <= 0n) throw new Error("Amount must be greater than 0");

      const result = await createDeposit(
        walletAddr,
        form.landlordAddress,
        amountStroops,
        BigInt(rentalEndTimestamp),
        BigInt(reviewPeriodSeconds),
        form.propertyReference
      );

      setResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to create deposit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Deposit Created!
          </h2>
          <p className="text-slate-500 mb-6">
            Your deposit agreement has been created. Now lock the deposit by
            sending XLM to the escrow contract.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Deposit ID</span>
              <span className="font-medium text-slate-900">#{result.depositId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction</span>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-800 font-mono text-xs"
              >
                {result.txHash.slice(0, 10)}...{result.txHash.slice(-6)}
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/deposit/${result.depositId}`)}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 transition-all shadow-md"
            >
              View Deposit Details
            </button>
            <button
              onClick={() => {
                setResult(null);
                setForm({
                  propertyReference: "",
                  landlordAddress: "",
                  amount: "",
                  rentalEndDate: "",
                  rentalEndTime: "23:59",
                  reviewPeriod: "7",
                  notes: "",
                });
              }}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Deposit</h1>
          <p className="text-sm text-slate-500">Create a rental deposit agreement</p>
        </div>
      </div>

      {!walletAddr ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-slate-500 font-medium mb-1">Connect your wallet</p>
          <p className="text-sm text-slate-400 mb-4">
            You need to connect your Freighter wallet to create a deposit.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 transition-all shadow-md"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-amber-800">Demo Mode</p>
              <p className="text-xs text-amber-600">
                Use short timers for live testing (minutes instead of days)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useDemoMode}
                onChange={(e) => setUseDemoMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>

          {/* Property Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Property Reference <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.propertyReference}
              onChange={(e) => handleChange("propertyReference", e.target.value)}
              placeholder="e.g. Downtown Studio Apt 3B"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Landlord Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Landlord Wallet Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.landlordAddress}
              onChange={(e) => handleChange("landlordAddress", e.target.value)}
              placeholder="G... or C... (Stellar address)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Deposit Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Deposit Amount (XLM) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="e.g. 20"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder:text-slate-400"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                XLM
              </span>
            </div>
          </div>

          {useDemoMode ? (
            <>
              {/* Demo: Rental End (minutes) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rental End (minutes from now)
                </label>
                <select
                  value={form.rentalEndDate}
                  onChange={(e) => handleChange("rentalEndDate", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                >
                  <option value="2">2 minutes</option>
                  <option value="5">5 minutes</option>
                </select>
              </div>
              {/* Demo: Review Period (minutes) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Review Period (minutes)
                </label>
                <select
                  value={form.reviewPeriod}
                  onChange={(e) => handleChange("reviewPeriod", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                >
                  <option value="1">1 minute</option>
                  <option value="2">2 minutes</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Rental End Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rental End Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.rentalEndDate}
                  onChange={(e) => handleChange("rentalEndDate", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                  required
                />
              </div>
              {/* Rental End Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rental End Time
                </label>
                <input
                  type="time"
                  value={form.rentalEndTime}
                  onChange={(e) => handleChange("rentalEndTime", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                />
              </div>
              {/* Review Period (days) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Review Period (days after rental end)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={form.reviewPeriod}
                  onChange={(e) => handleChange("reviewPeriod", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Deposit...
              </span>
            ) : (
              "Create Deposit Agreement"
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Your wallet will be asked to sign a transaction on Stellar Testnet.
          </p>
        </form>
      )}
    </div>
  );
}

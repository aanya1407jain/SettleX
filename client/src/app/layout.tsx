import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SettleX — Fair Rental Deposits, Settled Securely",
  description:
    "SettleX locks rental security deposits in a Soroban smart contract instead of sending them directly to the landlord. A neutral escrow layer for tenants and landlords.",
  keywords: [
    "rental deposit",
    "escrow",
    "stellar",
    "soroban",
    "blockchain",
    "tenant",
    "landlord",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="py-6 border-t border-slate-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                SettleX — Fair rental deposits, settled securely.
              </p>
              <p className="text-xs text-slate-400">
                Powered by{" "}
                <a
                  href="https://stellar.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-800"
                >
                  Stellar
                </a>{" "}
                ·{" "}
                <a
                  href="https://soroban.stellar.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-800"
                >
                  Soroban
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

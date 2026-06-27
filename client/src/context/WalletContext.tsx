"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  isConnected,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";

export interface WalletContextValue {
  address: string | null;
  isFreighterInstalled: boolean;
  connecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: ONLY check if Freighter is installed — do NOT auto-connect
  useEffect(() => {
    (async () => {
      try {
        const resp = await isConnected();
        setIsFreighterInstalled(resp.isConnected);
      } catch {
        setIsFreighterInstalled(false);
      }
    })();
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      // First check if Freighter is installed
      let installed = isFreighterInstalled;
      if (!installed) {
        try {
          const resp = await isConnected();
          installed = resp.isConnected;
          setIsFreighterInstalled(installed);
        } catch {
          // ignore
        }
      }
      if (!installed) {
        throw new Error(
          "Freighter wallet is not installed. Please install the Freighter browser extension."
        );
      }

      // Request access (pops up Freighter)
      await requestAccess();

      // Get the selected address
      const addrResp = await getAddress();
      if (!addrResp.address) {
        throw new Error("No address returned from Freighter.");
      }

      setAddress(addrResp.address);

      // Save to localStorage so we know the user previously connected
      try {
        localStorage.setItem("settlex_connected", "true");
      } catch {
        // localStorage may be unavailable
      }
    } catch (e: any) {
      const message =
        e?.message || "Failed to connect to Freighter wallet.";
      setError(message);
      console.error("Wallet connection error:", e);
    } finally {
      setConnecting(false);
    }
  }, [isFreighterInstalled]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setError(null);
    try {
      localStorage.removeItem("settlex_connected");
    } catch {
      // ignore
    }
    // NOTE: This only clears SettleX app state.
    // It does NOT revoke Freighter extension permissions.
  }, []);

  const refreshWallet = useCallback(async () => {
    setError(null);
    try {
      const resp = await isConnected();
      setIsFreighterInstalled(resp.isConnected);
      if (!resp.isConnected) {
        setAddress(null);
        throw new Error(
          "Freighter wallet is not installed."
        );
      }
      const addrResp = await getAddress();
      if (addrResp.address) {
        setAddress(addrResp.address);
      }
    } catch (e: any) {
      const message =
        e?.message || "Failed to refresh wallet address.";
      setError(message);
      console.error("Wallet refresh error:", e);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isFreighterInstalled,
        connecting,
        error,
        connectWallet,
        disconnectWallet,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

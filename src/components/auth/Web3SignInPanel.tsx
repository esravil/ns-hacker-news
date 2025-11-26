"use client";

import { useState, useEffect } from "react";
import { WalletUiDropdown, useWalletUiAccount } from "@wallet-ui/react";
import { useAuth } from "./AuthProvider";

export function Web3SignInPanel() {
  const { supabase } = useAuth();
  const { account, wallet } = useWalletUiAccount();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedAddress = account?.address ?? null;
  const truncatedAddress =
    connectedAddress && connectedAddress.length > 12
      ? `${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)}`
      : connectedAddress;

  useEffect(() => {
    console.log("Wallet selection changed:", {
      walletName: wallet?.name,
      address: account?.address ?? null,
    });
  }, [wallet, account]);

  async function handleSignInWithWallet() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (typeof window === "undefined") {
        throw new Error("Wallet sign-in must run in the browser.");
      }

      if (!account || !account.address) {
        throw new Error(
          "Connect a wallet using the selector above before signing in."
        );
      }

      const windowAny = window as any;
      const phantom = windowAny?.solana;

      if (
        !phantom ||
        typeof phantom !== "object" ||
        (!phantom.isPhantom &&
          (typeof phantom.signMessage !== "function" ||
            !phantom.publicKey ||
            typeof phantom.publicKey.toBase58 !== "function"))
      ) {
        throw new Error(
          "Phantom wallet not found or not compatible. Please install Phantom and try again."
        );
      }

      const credentials: any = {
        chain: "solana",
        wallet: phantom,
        statement:
          "Sign in to nsreddit anonymously with your wallet. We will never ask to transfer funds.",
      };

      const { data, error: signInError } =
        await supabase.auth.signInWithWeb3(credentials);

      // print address
      console.log("Phantom public key:", phantom.publicKey?.toBase58?.());
      console.log("Current account from Wallet UI: ", { account });
      console.log("signInWithWeb3 result:", { data, signInError });

      if (signInError) {
        throw signInError;
      }

      setMessage("Wallet signed in successfully.");
    } catch (err: any) {
      console.error("Web3 sign-in failed", err);
      setError(err.message ?? "Failed to sign in with wallet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 text-left text-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">
          Continue with wallet
        </h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <WalletUiDropdown />
        <button
          type="button"
          onClick={handleSignInWithWallet}
          disabled={submitting}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? "Signing in..." : "Sign in with wallet"}
        </button>
      </div>

      <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
        {connectedAddress ? (
          <p></p>
        ) : (
          <p>
            Choose a wallet from the dropdown above, then click{" "}
            <span className="font-mono">Sign in with wallet</span>.
          </p>
        )}
      </div>

      {message && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

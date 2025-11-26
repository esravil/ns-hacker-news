"use client";

import type { ReactNode } from "react";
import {
  WalletUi,
  createSolanaDevnet,
  createSolanaLocalnet,
  createWalletUiConfig,
} from "@wallet-ui/react";

/**
 * Provides Wallet UI context for Solana wallets across the app.
 *
 * For MVP we use devnet/localnet. Once ready, we can switch to mainnet
 * or make the cluster configurable.
 */
const walletUiConfig = createWalletUiConfig({
  clusters: [
    // You can add mainnet later if desired.
    createSolanaDevnet(),
    createSolanaLocalnet(),
  ],
});

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  return <WalletUi config={walletUiConfig}>{children}</WalletUi>;
}
// src/hooks/useWallet.js
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getWalletBalance, getWalletTransactions } from "../services/walletService";

export function useWallet() {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    if (!currentUser) return;
    setLoading(true);
    const [bal, txns] = await Promise.all([
      getWalletBalance(currentUser.uid),
      getWalletTransactions(currentUser.uid),
    ]);
    setBalance(bal);
    setTransactions(txns);
    setLoading(false);
  };

  useEffect(() => { fetchWallet(); }, [currentUser]);
  return { balance, transactions, loading, refetch: fetchWallet };
}

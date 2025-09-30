import { create } from "zustand";
import { getTransactionsByUserId, getUsers } from "@/api";

export interface Transaction {
  transaction_id: number;
  transaction_user_id: number;
  transaction_partner_id: number;
  transaction_title: string;
  transaction_balance: number;
  transaction_due: string;
  transaction_close: boolean;
  created_at: string;
  // 서류 기반 거래와 1:1 송금을 구분하기 위한 'type' 필드
  type?: "document" | "transfer";
  partner_name?: string;
}

interface TransactionState {
  transactions: Transaction[];
  fetchTransactions: (userId: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  fetchTransactions: async (userId: number) => {
    try {
      const userTransactions = await getTransactionsByUserId(userId);
      const allUsers = await getUsers();

      const userMap = new Map<number, string>();
      if (Array.isArray(allUsers)) {
        allUsers.forEach((user) => {
          userMap.set(user.user_id, user.user_name);
        });
      }

      if (Array.isArray(userTransactions)) {
        const completedTransactions = userTransactions
          .map((tx) => ({
            ...tx,
            type: tx.transaction_title.includes("송금")
              ? "transfer"
              : "document",
            partner_name:
              userMap.get(tx.transaction_partner_id) ||
              `알 수 없음 (ID: ${tx.transaction_partner_id})`,
          }))
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        set({ transactions: completedTransactions });
      } else {
        set({ transactions: [] });
      }
    } catch (error: unknown) {
      console.error("Failed to fetch transactions:", error);
      set({ transactions: [] });
    }
  },
}));

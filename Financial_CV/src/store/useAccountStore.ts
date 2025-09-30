import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import { getUserAccounts, createAccount, updateAccount as updateAccountAPI, deleteAccount as deleteAccountAPI } from "@/api";

export type Account = {
  account_id: number;
  account_user_id: number;
  account_number: string;
  account_bank: string;
  account_balance: number;
  is_primary?: boolean;
};

interface AccountState {
  accounts: Account[];
  fetchAccounts: (userId: number) => Promise<void>;
  addAccount: (accountData: Omit<Account, 'account_id' | 'account_user_id' | 'is_primary'>, userId: number) => Promise<void>;
  updateAccount: (accountId: number, updates: Partial<Omit<Account, 'account_id' | 'account_user_id'>>) => Promise<void>;
  deleteAccount: (accountId: number) => Promise<void>;
  setPrimaryAccount: (accountId: number) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      fetchAccounts: async (userId) => {
        try {
          const data = await getUserAccounts(userId);
          const userAccounts = data.filter((acc: Account) => acc.account_user_id === userId);
          set({ accounts: userAccounts.map((acc: Account) => ({ ...acc, is_primary: false })) });
        } catch (error: unknown) {
          console.error("Failed to fetch accounts:", error);
        }
      },
      addAccount: async (accountData, userId) => {
        try {
          await createAccount({ ...accountData, account_user_id: userId });
          await get().fetchAccounts(userId);
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            console.error("Failed to add account. Server response:", error.response.data);
          } else {
            console.error("Failed to add account:", error);
          }
          throw error;
        }
      },
      updateAccount: async (accountId, updates) => {
        try {
          const updatedAccount = await updateAccountAPI(accountId, updates);
          
          set((state) => ({
            accounts: state.accounts.map((acc) =>
              acc.account_id === accountId ? { ...acc, ...updatedAccount } : acc
            ),
          }));
        } catch (error: unknown) {
          console.error("Failed to update account:", error);
        }
      },
      deleteAccount: async (accountId) => {
        try {
          await deleteAccountAPI(accountId);
          set((state) => ({
            accounts: state.accounts.filter((acc) => acc.account_id !== accountId),
          }));
        } catch (error: unknown) {
          console.error("Failed to delete account:", error);
        }
      },
      setPrimaryAccount: (accountId) => {
        set((state) => ({
          accounts: state.accounts.map((acc) => ({
            ...acc,
            is_primary: acc.account_id === accountId,
          })),
        }));
      },
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
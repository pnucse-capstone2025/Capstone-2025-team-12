import { create } from "zustand";
import { getUserDocuments } from "@/api";

// API 명세서 기반으로 Document 타입 재정의
export type Document = {
  document_id: number;
  document_user_id: number;
  document_title: string;
  document_balance: number;
  document_partner: string;
  document_bank: string;
  document_account_number: string;
  document_due: string;
  created_at: string;
  document_classification_id: number;
};

interface DocumentState {
  documents: Document[];
  fetchDocuments: (userId: number) => Promise<void>;
  updateDocument: (id: number, updates: Partial<Document>) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  fetchDocuments: async (userId) => {
    try {
      const userDocuments = await getUserDocuments(userId);
      set({ documents: userDocuments });
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      set({ documents: [] }); // 에러 발생 시 문서를 빈 배열로 저장
    }
  },
  updateDocument: (id, updates) => {
    set({
      documents: get().documents.map((doc) =>
        doc.document_id === id ? { ...doc, ...updates } : doc
      ),
    });
  },
}));

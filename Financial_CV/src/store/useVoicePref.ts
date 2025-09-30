// src/store/useVoicePref.ts
import { create } from "zustand";

type VoicePrefState = {
  enabled: boolean;         // 음성 모드 ON/OFF
  initialized: boolean;     // 스플래시에서 이미 물어봤는지(필요 시 유지)
  setEnabled: (v: boolean) => void;
  setInitialized: (v: boolean) => void;
  reset: () => void;
};

const readBool = (key: string, def = false) => {
  try { return localStorage.getItem(key) === "1"; } catch { return def; }
};
const writeBool = (key: string, v: boolean) => {
  try { localStorage.setItem(key, v ? "1" : "0"); } catch {}
};

export const useVoicePref = create<VoicePrefState>((set) => ({
  // ✅ 저장값이 없으면 기본 활성(ON)
  enabled: readBool("voice_enabled", true),
  initialized: readBool("voice_initialized", false),

  setEnabled: (v) => { writeBool("voice_enabled", v); set({ enabled: v }); },
  setInitialized: (v) => { writeBool("voice_initialized", v); set({ initialized: v }); },

  reset: () => {
    writeBool("voice_enabled", false);
    writeBool("voice_initialized", false);
    set({ enabled: false, initialized: false });
  }
}));
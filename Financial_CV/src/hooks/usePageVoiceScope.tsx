import { useEffect, useRef, useCallback } from "react";

export function usePageVoiceScope() {
  const timersRef = useRef<number[]>([]);
  const recsRef = useRef<any[]>([]);
  const disposedRef = useRef(false);

  const addTimer = useCallback((id: number) => {
    timersRef.current.push(id);
  }, []);

  const bindRecognizer = useCallback((rec: any) => {
    if (rec) recsRef.current.push(rec);
    return rec;
  }, []);

  const cancelTTS = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
  }, []);

  const speak = useCallback((text: string, opts?: { lang?: string; rate?: number; onend?: () => void }) => {
    if (disposedRef.current) return;
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts?.lang || "ko-KR";
    if (opts?.rate) u.rate = opts.rate;
    if (opts?.onend) u.onend = () => {
      if (!disposedRef.current) opts.onend?.();
    };
    window.speechSynthesis.speak(u);
  }, []);

  const cleanup = useCallback(() => {
    disposedRef.current = true;
    // 1) 모든 타이머 제거
    for (const id of timersRef.current) {
      clearTimeout(id);
    }
    timersRef.current = [];
    // 2) 모든 STT 중단
    for (const r of recsRef.current) {
      try { r.onend = null; } catch {}
      try { r.stop(); } catch {}
      try { r.abort && r.abort(); } catch {}
    }
    recsRef.current = [];
    // 3) TTS 취소
    try { window.speechSynthesis.cancel(); } catch {}
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return {
    speak,
    cancelTTS,
    addTimer,
    bindRecognizer,
    cleanup,
  };
}

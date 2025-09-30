import { useCallback, useEffect, useRef, useState } from "react";

type ListenOpts = { lang?: string; interim?: boolean; timeoutMs?: number };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function awaitVoices() {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    const id = setInterval(() => {
      if (synth.getVoices().length > 0) { clearInterval(id); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(id); resolve(); }, 1500);
  });
}

function pickKoVoice() {
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find(v => v.lang?.toLowerCase() === "ko-kr") ||
    voices.find(v => v.lang?.toLowerCase().startsWith("ko")) ||
    null
  );
}

export function usePageVoiceScope(_pageKey: string, enabled = true) {
  const [isActive, setIsActive] = useState(enabled);
  const recRef = useRef<any>(null);
  const ttsBusyRef = useRef(false);
  const lastSpeakEndRef = useRef(0);
  const destroyedRef = useRef(false);

  const QUIET_AFTER_TTS_MS = 400;

  const waitForQuietAfterTTS = useCallback(async () => {
    while (window.speechSynthesis.speaking || window.speechSynthesis.pending || ttsBusyRef.current) {
      await sleep(80);
    }
    while ((performance.now() - lastSpeakEndRef.current) < QUIET_AFTER_TTS_MS) {
      await sleep(40);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (destroyedRef.current) return;
    await awaitVoices();
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try { window.speechSynthesis.cancel(); } catch {}
      await sleep(50);
    }
    ttsBusyRef.current = true;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        ttsBusyRef.current = false;
        lastSpeakEndRef.current = performance.now();
        resolve();
      };
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoVoice(); if (v) u.voice = v;
      const guard = setTimeout(finish, 4000);
      u.onend = () => { clearTimeout(guard); finish(); };
      u.onerror = () => { clearTimeout(guard); finish(); };
      try { window.speechSynthesis.resume(); } catch {}
      setTimeout(() => {
        try { window.speechSynthesis.speak(u); } catch { finish(); }
      }, 0);
    });
  }, []);

  const speakThen = useCallback(async (text: string, afterMs = 120) => {
    await speak(text);
    await sleep(afterMs);
  }, [speak]);

  const listenOnce = useCallback(async (opts?: ListenOpts) => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return "";
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;

    await waitForQuietAfterTTS();
    await sleep(20);

    return await new Promise<string>((resolve) => {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = opts?.lang ?? "ko-KR";
      rec.interimResults = !!opts?.interim;
      rec.maxAlternatives = 1;

      const end = (val: string) => { try { rec.stop(); } catch {}; resolve(val); };
      const timer = setTimeout(() => end(""), opts?.timeoutMs ?? 4000);

      rec.onresult = (e: any) => {
        const last = e?.results?.[e.results.length - 1];
        const t = last?.[0]?.transcript?.trim?.() ?? "";
        clearTimeout(timer); end(t);
      };
      rec.onerror = () => { clearTimeout(timer); end(""); };
      rec.onend = () => { clearTimeout(timer); end(""); };

      try { rec.start(); } catch { clearTimeout(timer); end(""); }
    });
  }, [waitForQuietAfterTTS]);

  const stopAll = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
    ttsBusyRef.current = false;
  }, []);

  // 페이지 언마운트 시
  useEffect(() => {
    destroyedRef.current = false;
    setIsActive(enabled);
    return () => {
      destroyedRef.current = true;
      stopAll();
      setIsActive(false);
    };
  }, [stopAll]);

  //enabled 값이 바뀔 때 즉시 반응
  useEffect(() => {
    if (!enabled) {
      stopAll();
      setIsActive(false);
    } else {
      setIsActive(true);
    }
  }, [enabled, stopAll]);

  const isTTSSpeaking = () =>
    window.speechSynthesis.speaking || window.speechSynthesis.pending || ttsBusyRef.current;

  return { isActive, speak, speakThen, listenOnce, stopAll, isTTSSpeaking };
}

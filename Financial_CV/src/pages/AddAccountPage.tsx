// src/pages/AddAccountPage.tsx
import { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";
import PageWrapper from "@/components/PageWrapper";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useAccountStore } from "@/store/useAccountStore";
import { useVoicePref } from "@/store/useVoicePref";

type Step = "bank" | "account" | "confirm" | "done";

const AddAccountPage = () => {
  const { enabled } = useVoicePref(); // ★ 스플래시에서 저장한 전역 음성 설정
  return enabled ? <AddAccountVoiceMode /> : <AddAccountManualMode />;
};

export default AddAccountPage;

/* =========================
   음성(STT/TTS) 모드 컴포넌트
   ========================= */
const AddAccountVoiceMode = () => {
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [step, setStep] = useState<Step>("bank");

  const navigate = useNavigate();
  const { addAccount } = useAccountStore();

  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);

  // 최신값 ref (state 지연 방지)
  const stepRef = useRef(step);
  const bankRef = useRef(bank);
  const accountRef = useRef(accountNumber);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { bankRef.current = bank; }, [bank]);
  useEffect(() => { accountRef.current = accountNumber; }, [accountNumber]);

  // ===== 보이스 로드 보장 유틸 =====
  const awaitVoices = () =>
    new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis;
        const ready = () => {
          const v = synth.getVoices();
          if (v && v.length > 0) { resolve(); return true; }
          return false;
        };
        if (ready()) return;
        const onChange = () => { if (ready()) synth.onvoiceschanged = null as any; };
        synth.onvoiceschanged = onChange;
        setTimeout(() => resolve(), 1500);
      } catch { resolve(); }
    });

  const pickKoreanVoice = () => {
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return (
        voices.find(v => v.lang?.toLowerCase() === "ko-kr") ||
        voices.find(v => v.lang?.toLowerCase().startsWith("ko")) ||
        null
      );
    } catch { return null; }
  };

  // ===== TTS: 첫 발화 보장(voices 로드 + resume + 소폭 지연 + 안전가드) =====
  const speakAndThen = async (text: string, then?: () => void) => {
    let finished = false;
    const done = () => { if (finished) return; finished = true; try { then?.(); } catch {} };

    const SAFETY_MS = 2000;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      await awaitVoices();
      try { window.speechSynthesis.resume(); } catch {}
      await new Promise(r => setTimeout(r, 150));

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoreanVoice(); if (v) u.voice = v;

      u.onend = () => { clearTimeout(timer); setTimeout(done, 120); };

      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    } catch {
      clearTimeout(timer);
      done();
    }
  };

  // ===== 계좌번호 정규화: 숫자/하이픈만 유지 =====
  const normalizeAccount = (raw: string) => {
    let s = raw.replace(/[^\d-]+/g, "");
    s = s.replace(/-+/g, "-");
    s = s.replace(/^-/g, "").replace(/-$/g, "");
    return s;
  };

  // ===== STT (단계별 세션: TTS 끝난 뒤 시작) =====
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speakAndThen("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "ко-KR".replace("ко", "ko"); // 안전
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let active = true;

    rec.onresult = (event: any) => {
      const raw = (event?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!raw) return;
      const currentStep = stepRef.current;

      if (currentStep === "bank") {
        setBank(raw);
        bankRef.current = raw;
        setStep("account");
        active = false;
        try { rec.stop(); } catch {}
        speakAndThen(`입력하신 은행명은 ${raw}입니다. 다음으로 계좌번호를 말씀해주세요.`, () => startListening());

      } else if (currentStep === "account") {
        const cleaned = normalizeAccount(raw);
        if (!cleaned) {
          active = false;
          try { rec.stop(); } catch {}
          speakAndThen("계좌번호가 인식되지 않았습니다. 숫자와 하이픈으로 다시 말씀해주세요.", () => startListening());
          return;
        }
        setAccountNumber(cleaned);
        accountRef.current = cleaned;
        setStep("confirm");
        active = false;
        try { rec.stop(); } catch {}
        speakAndThen(`입력하신 계좌번호는 ${cleaned}입니다. 등록하시겠습니까? 등록 또는 아니오로 대답해주세요.`, () => startListening());

      } else if (currentStep === "confirm") {
        const ans = raw.replace(/\s+/g, "");
        active = false;
        try { rec.stop(); } catch {}

        if (ans.includes("등록")) {
          handleSubmit(bankRef.current, accountRef.current);
        } else if (ans.includes("아니오")) {
          speakAndThen("등록을 취소했습니다."); setStep("done");
        } else {
          speakAndThen("죄송합니다. 등록 또는 아니오로만 대답해주세요.", () => startListening());
        }
      }
    };

    rec.onerror = () => {
      if (!active) return;
      speakAndThen("음성을 인식하지 못했습니다. 다시 말씀해주세요.", () => startListening());
    };

    rec.onend = () => {
      if (active) {
        const retry = () => {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            setTimeout(retry, 120);
          } else {
            try { rec.start(); } catch {}
          }
        };
        retry();
      }
    };

    const tryStart = () => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        setTimeout(tryStart, 120);
      } else {
        try { rec.start(); } catch {}
      }
    };
    tryStart();
  };

  // ===== 첫 진입: 첫 TTS 확실히 재생 → STT 시작 =====
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // 초기화
    setBank(""); bankRef.current = "";
    setAccountNumber(""); accountRef.current = "";
    setStep("bank"); stepRef.current = "bank";

    speakAndThen("은행명을 말씀해주세요.", () => startListening());

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 제출 (ref 우선 사용) =====
  const handleSubmit = async (bankValue?: string, accountValue?: string) => {
    const finalBank = (bankValue ?? bankRef.current ?? "").trim();
    const finalAccount = normalizeAccount(accountValue ?? accountRef.current ?? "");

    if (!finalBank || !finalAccount) {
      speakAndThen("모든 정보를 입력해야 합니다.");
      return;
    }

    const userId = localStorage.getItem("user_id");
    if (!userId) {
      speakAndThen("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
      navigate("/login");
      return;
    }

    try {
      const accountData = {
        account_user_id: parseInt(userId),
        account_number: finalAccount,
        account_bank: finalBank,
        account_balance: 1000000,
      };
      await addAccount(accountData, parseInt(userId));
      speakAndThen("계좌가 성공적으로 등록되었습니다. 마이페이지로 이동합니다.", () => navigate("/mypage"));
    } catch (error) {
      speakAndThen("계좌 등록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <AddAccountContainer>
          <h1>음성으로 계좌 추가하기</h1>
          <p>현재 단계: {step}</p>
          <p>은행명: {bank}</p>
          <p>계좌번호: {accountNumber}</p>
          <p>확인 단계에서는 “등록” 또는 “아니오”로만 대답해 주세요.</p>
        </AddAccountContainer>
      </PageWrapper>
    </>
  );
};

/* =========================
   수동(버튼/입력 폼) 모드 컴포넌트
   ========================= */
const AddAccountManualMode = () => {
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const navigate = useNavigate();
  const { addAccount } = useAccountStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank || !accountNumber) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const userId = localStorage.getItem("user_id");
    if (!userId) {
      alert("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
      navigate("/login");
      return;
    }

    try {
      const accountData = {
        account_user_id: parseInt(userId),
        account_number: accountNumber,
        account_bank: bank,
        account_balance: 1000000,
      };
      await addAccount(accountData, parseInt(userId));
      alert("계좌가 성공적으로 등록되었습니다.");
      navigate("/mypage");
    } catch (error: unknown) {
      alert("계좌 등록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <AddAccountContainer>
          <h1>계좌 추가하기</h1>
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="은행명"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
            <Input
              type="text"
              placeholder="계좌번호"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
            <Button type="submit">등록</Button>
          </form>
        </AddAccountContainer>
      </PageWrapper>
    </>
  );
};

/* ===== 스타일 ===== */
const AddAccountContainer = styled.div`
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  h1 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background-color: black;
  color: white;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
`;

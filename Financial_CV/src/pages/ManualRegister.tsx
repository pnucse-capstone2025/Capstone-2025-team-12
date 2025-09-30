/** @jsxImportSource @emotion/react */
import styled from "@emotion/styled";
import { useCallback, useEffect, useRef, useState } from "react";
import NavigationBar from "@/components/NavigationBar";
import PageWrapper from "@/components/PageWrapper";
import imgPath from "@/assets/eyes_open_nobg.png";
import { useVoicePref } from "@/store/useVoicePref";
import { createDocument } from "@/api";
import { useAccountStore } from "@/store/useAccountStore";
import axios from "axios";

/* =========================
   공용 스타일 (반응형 + @media)
   ========================= */
const Title = styled.h2`
  margin: 0 0 clamp(2vh, 3.2vh, 4vh) 0;
  font-size: clamp(2.2vh, 3vh, 3.6vh);
  line-height: 1.2;
  font-weight: 800;

  @media (max-height: 600px) {
    font-size: clamp(2vh, 2.6vh, 3vh);
    margin-bottom: clamp(1.6vh, 2vh, 2.4vh);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(1.6vh, 2vh, 2.4vh);

  @media (max-height: 600px) {
    gap: clamp(1.2vh, 1.6vh, 2vh);
  }
`;

const InputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(0.6vh, 0.9vh, 1.2vh);

  @media (max-height: 600px) {
    gap: clamp(0.4vh, 0.6vh, 0.8vh);
  }
`;

const Label = styled.label`
  font-weight: 700;
  font-size: clamp(1.6vh, 1.9vh, 2.1vh);
  color: #333;

  @media (max-height: 600px) {
    font-size: clamp(1.4vh, 1.6vh, 1.8vh);
  }
`;

const Input = styled.input`
  padding: clamp(1.2vh, 1.6vh, 2vh) clamp(1.6vh, 2vh, 2.4vh);
  border: 0.25vh solid #ddd;
  border-radius: clamp(1vh, 1.4vh, 1.8vh);
  font-size: clamp(1.6vh, 1.9vh, 2.2vh);
  box-sizing: border-box;

  &:hover { border-color: #c8c8c8; }
  &:focus-visible {
    outline: none;
    border-color: #111;
    box-shadow: 0 0 0 0.6vh rgba(0, 0, 0, 0.08);
  }

  @media (max-height: 600px) {
    font-size: clamp(1.4vh, 1.6vh, 1.8vh);
    padding: clamp(1vh, 1.2vh, 1.4vh);
  }
`;

const RegisterButton = styled.button`
  padding: clamp(1.4vh, 1.8vh, 2.2vh) clamp(2vh, 2.6vh, 3.2vh);
  background-color: black;
  color: white;
  font-weight: 800;
  font-size: clamp(1.7vh, 2vh, 2.3vh);
  border: none;
  border-radius: clamp(1.2vh, 1.6vh, 2vh);
  margin-top: clamp(2vh, 3vh, 4vh);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.06s ease;

  &:hover { background-color: #333; }
  &:active { transform: translateY(0.2vh); }

  @media (max-height: 600px) {
    font-size: clamp(1.5vh, 1.8vh, 2vh);
    padding: clamp(1.2vh, 1.6vh, 2vh);
  }
`;

const Hint = styled.div`
  font-size: clamp(1.4vh, 1.7vh, 1.9vh);
  color: #666;
  line-height: 1.5;

  @media (max-height: 600px) {
    font-size: clamp(1.2vh, 1.4vh, 1.6vh);
  }
`;

/* =========================
   라우트 컴포넌트
   ========================= */
export default function ManualRegisterPage() {
  const { enabled } = useVoicePref();
  return enabled ? <VoiceMode /> : <ManualMode />;
}

/* =========================
   유틸 함수
   ========================= */
const zeroPad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

function parseKoreanDateToISO(transcript: string): string | null {
  const onlyNum = transcript.replace(/[^0-9]/g, " ").replace(/\s+/g, " ").trim();
  if (!onlyNum) return null;
  const parts = onlyNum.split(" ").map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1900) {
      return `${y}-${zeroPad2(m)}-${zeroPad2(d)}`;
    }
  }
  if (parts.length === 2) {
    const now = new Date();
    const [m, d] = parts;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${now.getFullYear()}-${zeroPad2(m)}-${zeroPad2(d)}`;
    }
  }
  return null;
}

function parseAmountWon(transcript: string): number | null {
  const t = transcript.replace(/\s/g, "");
  let m = t.match(/([0-9]+)만원?/);
  if (m) return parseInt(m[1], 10) * 10000;
  m = t.match(/([0-9]+)억([0-9]+)?만?/);
  if (m) {
    const ok = parseInt(m[1], 10) * 100000000;
    const man = m[2] ? parseInt(m[2], 10) * 10000 : 0;
    return ok + man;
  }
  const onlyNum = transcript.replace(/[^0-9]/g, "");
  if (onlyNum.length > 0) return parseInt(onlyNum, 10);
  return null;
}

function formatWon(n: number | string) {
  if (typeof n === "string") return n;
  if (!Number.isFinite(n as number)) return String(n);
  return `₩${(n as number).toLocaleString("ko-KR")}`;
}

function normalizeAccount(transcript: string): string | null {
  const cleaned = transcript
    .trim()
    .replace(/[^0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
  return cleaned.length > 3 ? cleaned : null;
}

const toNumberAmount = (s: string) => {
  if (!s) return 0;
  const onlyNum = s.replace(/[^\d]/g, "");
  return onlyNum ? parseInt(onlyNum, 10) : 0;
};

function usePrimaryAccountNumber() {
  const { accounts, fetchAccounts } = useAccountStore();
  const [primary, setPrimary] = useState<string>("");

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) fetchAccounts(parseInt(userId, 10));
  }, [fetchAccounts]);

  useEffect(() => {
    const p = (accounts.find((a: any) => a.is_primary) || accounts[0]) as any;
    setPrimary(p?.account_number || "");
  }, [accounts]);

  return primary;
}

/* =========================
   음성 모드
   ========================= */
function VoiceMode() {
  const userId = Number(localStorage.getItem("user_id") || 0);
  const myAccountNumber = usePrimaryAccountNumber();

  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [partner, setPartner] = useState("");
  const [partnerBank, setPartnerBank] = useState("");
  const [partnerAccount, setPartnerAccount] = useState("");

  type Step = "date" | "amount" | "partner" | "bank" | "account" | "confirm" | "done";
  const [step, setStep] = useState<Step>("date");

  const stepRef = useRef(step); useEffect(()=>{stepRef.current = step;},[step]);
  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);

  const buildPayload = () => ({
    document_user_id: userId,
    document_title: partner || "정기 납부",
    document_balance: toNumberAmount(amount),
    document_partner: partner,
    document_bank: partnerBank,
    document_account_number: myAccountNumber,
    document_partner_number: partnerAccount,
    document_due: dueDate,
    document_classification_id: 0,
    document_partner_id:0,
  });

  const validateRequired = () => {
    const p = buildPayload();
    if (!p.document_user_id) return "로그인이 필요합니다.";
    if (!p.document_title) return "거래상대 이름이 필요합니다.";
    if (!p.document_balance) return "금액이 필요합니다.";
    if (!p.document_partner) return "거래상대 이름이 필요합니다.";
    if (!p.document_bank) return "은행명이 필요합니다.";
    if (!p.document_account_number) return "내(사용자) 대표 계좌가 없습니다.";
    if (!p.document_partner_number) return "상대 계좌번호가 필요합니다.";
    if (!p.document_due) return "납부일이 필요합니다.";
    return "";
  };

  const handleSubmit = useCallback(async () => {
    const err = validateRequired();
    if (err) { alert(err); return; }

    try {
      await createDocument(buildPayload() as any);
      alert("✅ 서버에 서류가 정상 등록되었습니다.");
      setStep("done");
    } catch (e) {
      console.error(e);
      alert("서류 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [userId, partner, amount, partnerBank, myAccountNumber, partnerAccount, dueDate]);

  const speakAndThen = async (text: string, then?: () => void) => {
    let finished = false;
    const done = () => { if (finished) return; finished = true; try { then?.(); } catch {} };
    const SAFETY_MS = 3000;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      try { window.speechSynthesis.resume(); } catch {}
      await new Promise(r => setTimeout(r, 120));

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = window.speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith("ko"));
      if (v) u.voice = v;
      u.onend = () => { clearTimeout(timer); setTimeout(done, 80); };

      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    } catch {
      clearTimeout(timer); done();
    }
  };

  const getSR = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR) { speakAndThen("이 브라우저는 음성 인식을 지원하지 않습니다."); return; }

    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let active = true;

    rec.onresult = async (e: any) => {
      const raw = (e?.results?.[0]?.[0]?.transcript || "").trim();
      if (!raw) return;
      const s = stepRef.current;

      active = false;
      try { rec.stop(); } catch {}

      if (s === "date") {
        const iso = parseKoreanDateToISO(raw);
        if (!iso) { await speakAndThen("날짜를 이해하지 못했습니다. 예: 2025년 10월 15일.", () => startListening()); return; }
        setDueDate(iso);
        setStep("amount");
        await speakAndThen("금액을 말씀해 주세요. 예: 250만 원.", () => startListening());
      }

      else if (s === "amount") {
        const n = parseAmountWon(raw);
        if (n === null) { await speakAndThen("금액을 이해하지 못했습니다. 예: 250만 원.", () => startListening()); return; }
        setAmount(formatWon(n));
        setStep("partner");
        await speakAndThen("거래 상대 이름을 말씀해 주세요. 예: 김민수.", () => startListening());
      }

      else if (s === "partner") {
        const name = raw.replace(/\s+/g, " ").trim();
        if (!name) { await speakAndThen("다시 한 번 이름을 말씀해 주세요.", () => startListening()); return; }
        setPartner(name);
        setStep("bank");
        await speakAndThen("은행명을 말씀해 주세요. 예: 국민은행.", () => startListening());
      }

      else if (s === "bank") {
        const bank = raw.replace(/\s+/g, " ").trim();
        if (!bank) { await speakAndThen("은행명을 다시 말씀해 주세요.", () => startListening()); return; }
        setPartnerBank(bank);
        setStep("account");
        await speakAndThen("상대 계좌번호를 말씀해 주세요.", () => startListening());
      }

      else if (s === "account") {
        const acc = normalizeAccount(raw);
        if (!acc) { await speakAndThen("계좌번호를 이해하지 못했습니다. 다시 말씀해 주세요.", () => startListening()); return; }
        setPartnerAccount(acc);
        setStep("confirm");
        await speakAndThen("입력 감사합니다. 제출하시겠습니까? 제출 또는 아니오로 답해주세요.", () => startListening());
      }

      else if (s === "confirm") {
        const t = raw.replace(/\s+/g, "");
        if (t.includes("제출")) { handleSubmit(); return; }
        if (t.includes("아니오") || t.includes("아니요")) {
          await speakAndThen("제출을 취소했습니다."); setStep("done"); return;
        }
        await speakAndThen("제출 또는 아니오로만 대답해주세요.", () => startListening());
      }
    };

    rec.onerror = async () => {
      if (!active) return;
      await speakAndThen("음성을 인식하지 못했습니다. 다시 말씀해 주세요.", () => startListening());
    };

    rec.onend = () => {
      if (active) {
        const retry = () => {
          if (window.speechSynthesis.speaking || (window.speechSynthesis as any).pending) {
            setTimeout(retry, 120);
          } else {
            try { rec.start(); } catch {}
          }
        };
        retry();
      }
    };

    const tryStart = () => {
      if (window.speechSynthesis.speaking || (window.speechSynthesis as any).pending) {
        setTimeout(tryStart, 120);
      } else {
        try { rec.start(); } catch {}
      }
    };
    tryStart();
  }, [handleSubmit]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    setStep("date");
    speakAndThen("음성으로 서류를 등록하겠습니다. 먼저 납부일을 말씀해 주세요. 예: 2025년 10월 15일.", () => startListening());

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, [startListening]);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <PageWrapper>
        <Title>📄 직접 서류 등록하기(정기구독 및 납부)</Title>

        <Container>
          <InputRow>
            <Label>납부일</Label>
            <Input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>금액</Label>
            <Input type="text" placeholder="₩2,500,000" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>거래상대(제목)</Label>
            <Input type="text" placeholder="예: 넷플릭스 / 김민수" value={partner} onChange={(e)=>setPartner(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>은행</Label>
            <Input type="text" placeholder="예: 신한은행" value={partnerBank} onChange={(e)=>setPartnerBank(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>상대 계좌번호</Label>
            <Input type="text" placeholder="예: 1000-xxxx-xxxx" value={partnerAccount} onChange={(e)=>setPartnerAccount(e.target.value)} />
          </InputRow>

          <Hint>
            • 내(사용자) 대표 계좌: <b>{myAccountNumber || "미설정"}</b>
          </Hint>
        </Container>
      </PageWrapper>
    </>
  );
}

/* =========================
   수동 모드
   ========================= */
function ManualMode() {
  const userId = Number(localStorage.getItem("user_id") || 0);
  const myAccountNumber = usePrimaryAccountNumber();

  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [partner, setPartner] = useState("");
  const [partnerBank, setPartnerBank] = useState("");
  const [partnerAccount, setPartnerAccount] = useState("");

  const buildPayload = () => ({
    document_user_id: userId,
    document_title: partner || "정기 납부",
    document_balance: toNumberAmount(amount),
    document_partner: partner,
    document_bank: partnerBank,
    document_account_number: myAccountNumber,
    document_partner_number: partnerAccount,
    document_due: dueDate,
    document_classification_id: 0,
    document_partner_id:0,
  });

  const validateRequired = () => {
    const p = buildPayload();
    if (!p.document_user_id) return "로그인이 필요합니다.";
    if (!p.document_title) return "거래상대 이름이 필요합니다.";
    if (!p.document_balance) return "금액이 필요합니다.";
    if (!p.document_partner) return "거래상대 이름이 필요합니다.";
    if (!p.document_bank) return "은행명이 필요합니다.";
    if (!p.document_account_number) return "내(사용자) 대표 계좌가 없습니다.";
    if (!p.document_partner_number) return "상대 계좌번호가 필요합니다.";
    if (!p.document_due) return "납부일이 필요합니다.";
    return "";
  };

  const handleSubmit = useCallback(async () => {
    const err = validateRequired();
    if (err) { alert(err); return; }
    try {
      await createDocument(buildPayload() as any);
      alert("✅ 서버에 서류가 정상 등록되었습니다.");
    } catch (e) {
      console.error(e);
      alert("서류 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [userId, partner, amount, partnerBank, myAccountNumber, partnerAccount, dueDate]);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <PageWrapper>
        <Title>📄 직접 서류 등록하기(정기구독 및 납부)</Title>

        <Container>
          <InputRow>
            <Label>납부일</Label>
            <Input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>금액</Label>
            <Input type="text" placeholder="₩2,500,000" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>거래상대(제목)</Label>
            <Input type="text" placeholder="예: 넷플릭스 / 김민수" value={partner} onChange={(e)=>setPartner(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>은행</Label>
            <Input type="text" placeholder="예: 신한은행" value={partnerBank} onChange={(e)=>setPartnerBank(e.target.value)} />
          </InputRow>

          <InputRow>
            <Label>상대 계좌번호</Label>
            <Input type="text" placeholder="예: 1000-xxxx-xxxx" value={partnerAccount} onChange={(e)=>setPartnerAccount(e.target.value)} />
          </InputRow>

          <RegisterButton onClick={handleSubmit}>📄 서류 등록하기</RegisterButton>

          <Hint>
            • 내(사용자) 대표 계좌: <b>{myAccountNumber || "미설정"}</b>
          </Hint>
        </Container>
      </PageWrapper>
    </>
  );
}

// src/pages/TransferPage.tsx
// 송금하기 페이지 (음성 모드 / 버튼 모드 분기)

import { useEffect, useMemo, useRef, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { transferAmount } from "@/api";
import { useAccountStore } from "@/store/useAccountStore";
import { useVoicePref } from "@/store/useVoicePref";

/* =========================
   공통 유틸
   ========================= */
function useLoadAccounts() {
  const { fetchAccounts } = useAccountStore();
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) fetchAccounts(parseInt(userId));
  }, [fetchAccounts]);
}

function useSpeechUtils() {
  const awaitVoices = () =>
    new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis;
        const ready = () => {
          const v = synth.getVoices();
          if (v && v.length > 0) {
            resolve();
            return true;
          }
          return false;
        };
        if (ready()) return;
        const handler = () => {
          if (ready()) synth.onvoiceschanged = null as any;
        };
        synth.onvoiceschanged = handler;
        setTimeout(() => resolve(), 1500);
      } catch {
        resolve();
      }
    });

  const pickKoreanVoice = () => {
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return (
        voices.find((v) => v.lang?.toLowerCase() === "ko-kr") ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("ko")) ||
        null
      );
    } catch {
      return null;
    }
  };

  const speakAndThen = async (text: string, then?: () => void) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      try {
        then?.();
      } catch {}
    };
    const SAFETY_MS = 3500;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      await awaitVoices();
      try { window.speechSynthesis.resume(); } catch {}
      await new Promise((r) => setTimeout(r, 120));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoreanVoice();
      if (v) u.voice = v;
      u.onend = () => {
        clearTimeout(timer);
        setTimeout(done, 80);
      };
      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    } catch {
      clearTimeout(timer);
      done();
    }
  };

  return { speakAndThen };
}

/* =========================
   메인 엔트리
   ========================= */
const TransferPage = () => {
  const { enabled } = useVoicePref();
  return enabled ? <TransferVoiceMode /> : <TransferManualMode />;
};

export default TransferPage;

/* =========================
   공통 파싱/포맷
   ========================= */
function parseAmount(a?: string): number | null {
  if (!a) return null;
  const n = Number(a.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/* =========================
   음성(STT/TTS) 모드
   ========================= */
const TransferVoiceMode = () => {
  useLoadAccounts();
  const { accounts } = useAccountStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { speakAndThen } = useSpeechUtils();

  const { alertId, title, dueDate, amount, partner, partner_bank, account } =
    (location.state as any) || {};

  const withdrawAmount = useMemo(() => parseAmount(amount), [amount]);
  const fromAccount = useMemo(
    () => accounts.find((acc) => acc.is_primary) || accounts[0],
    [accounts]
  );

  const [isTransferring, setIsTransferring] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);
  const activeRef = useRef(false);

  const summaryText = () => {
    const amt = withdrawAmount != null ? `${withdrawAmount.toLocaleString()}원` : "금액 미지정";
    const parts = [
      `서류 제목 ${title ?? "제목 없음"}`,
      `납부일 ${dueDate ?? "정보 없음"}`,
      `금액 ${amt}`,
      `거래상대 ${partner ?? "정보 없음"}`,
      `은행 ${partner_bank ?? "정보 없음"}`,
      `계좌번호 ${account ?? "정보 없음"}`,
    ];
    return parts.join(", ");
  };

  const buildPrompt = () =>
    `송금하기입니다. ${summaryText()} 입니다. 송금하시려면 송금 이라고 말씀해 주세요. 취소하려면 취소, 다시 듣기 원하면 다시 라고 말씀해 주세요.`;

  const confirmWords = ["송금", "보내", "이체", "확인", "네", "예"];
  const cancelWords = ["취소", "그만", "아니오", "아니요", "뒤로"];
  const againWords = ["다시", "다시듣기", "상세"];

  const doTransfer = async () => {
    if (isTransferring) return;
    setIsTransferring(true);

    if (!fromAccount) {
      await speakAndThen("송금할 출금 계좌 정보를 찾을 수 없습니다.");
      setIsTransferring(false);
      return;
    }
    if (!account || withdrawAmount == null) {
      await speakAndThen("수취 계좌 또는 금액 정보가 없어서 송금할 수 없습니다.");
      setIsTransferring(false);
      return;
    }

    try {
      await transferAmount({
        from_account_number: fromAccount.account_number,
        withdraw_amount: withdrawAmount,
        to_account_number: account,
        deposit_amount: withdrawAmount,
      });
      await speakAndThen(`송금이 완료되었습니다. 홈 화면으로 이동합니다.`);
      navigate("/home", { state: { completedAlertId: alertId } });
    } catch (e) {
      console.error("송금 실패:", e);
      await speakAndThen("송금에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsTransferring(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speakAndThen("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let localActive = true;
    activeRef.current = true;

    rec.onresult = async (event: any) => {
      const said = (event?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!said) return;
      const t = said.replace(/\s+/g, "").toLowerCase();

      const hit = (list: string[]) => list.some((w) => t.includes(w));
      if (hit(cancelWords)) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakAndThen("송금을 취소했습니다. 이전 화면으로 돌아갑니다.");
        navigate(-1);
        return;
      }
      if (hit(againWords)) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakAndThen(buildPrompt(), () => startListening());
        return;
      }
      if (hit(confirmWords)) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakAndThen("확인되었습니다. 송금을 진행합니다.", () => doTransfer());
        return;
      }

      localActive = false; activeRef.current = false;
      try { rec.stop(); } catch {}
      await speakAndThen("이해하지 못했습니다. 송금, 취소, 또는 다시 중 하나로 말씀해 주세요.", () => startListening());
    };

    rec.onerror = async () => {
      if (!localActive || !activeRef.current) return;
      await speakAndThen("음성을 인식하지 못했습니다. 다시 말씀해 주세요.", () => startListening());
    };

    rec.onend = () => {
      if (localActive && activeRef.current) {
        const retry = () => {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) setTimeout(retry, 120);
          else {
            try { rec.start(); } catch {}
          }
        };
        retry();
      }
    };

    const tryStart = () => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) setTimeout(tryStart, 120);
      else {
        try { rec.start(); } catch {}
      }
    };
    tryStart();
  };

  useEffect(() => {
    if (!alertId) return; // location.state 없을 때는 음성 안내 생략
    if (startedRef.current) return;
    startedRef.current = true;

    speakAndThen(buildPrompt(), () => startListening());

    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  // 시각 UI는 수동 모드와 유사하게 제공
  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <TransferContainer>
          <h1>송금하기 (음성 모드)</h1>
          {alertId ? (
            <TransferDetails>
              <p><strong>서류 제목:</strong> {title}</p>
              <p><strong>납부일:</strong> {dueDate}</p>
              <p><strong>금액:</strong> {withdrawAmount != null ? `₩${withdrawAmount.toLocaleString()}` : amount ?? "-"}</p>
              <p><strong>거래상대:</strong> {partner}</p>
              <p><strong>은행:</strong> {partner_bank}</p>
              <p><strong>계좌번호:</strong> {account}</p>
              <TransferButton
                onClick={doTransfer}
                disabled={isTransferring}
                aria-label="송금 진행"
              >
                {isTransferring ? "송금 중..." : "지금 송금"}
              </TransferButton>
              <HelpText>음성 명령: “송금”, “취소”, “다시”</HelpText>
            </TransferDetails>
          ) : (
            <p>송금할 정보를 찾을 수 없습니다. 홈 화면에서 알림을 선택해 주세요.</p>
          )}
        </TransferContainer>
      </PageWrapper>
    </>
  );
};

/* =========================
   버튼(수동) 모드
   ========================= */
const TransferManualMode = () => {
  useLoadAccounts();
  const { accounts } = useAccountStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { alertId, title, dueDate, amount, partner, partner_bank, account } =
    (location.state as any) || {};

  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransferComplete = async () => {
    setIsTransferring(true);

    const fromAccount = accounts.find((acc) => acc.is_primary) || accounts[0];
    if (!fromAccount) {
      alert("송금할 계좌 정보가 없습니다.");
      setIsTransferring(false);
      return;
    }

    const fromAccountNumber = fromAccount.account_number;
    const withdrawAmount = parseAmount(amount);
    if (withdrawAmount == null || !account) {
      alert("금액 또는 수취 계좌 정보가 올바르지 않습니다.");
      setIsTransferring(false);
      return;
    }

    try {
      await transferAmount({
        from_account_number: fromAccountNumber,
        withdraw_amount: withdrawAmount,
        to_account_number: account,
        deposit_amount: withdrawAmount,
      });
      alert(`'${title}' 송금이 완료되었습니다.`);
      navigate("/home", { state: { completedAlertId: alertId } });
    } catch (error: unknown) {
      console.error("송금 실패:", error);
      alert("송금에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <TransferContainer>
          <h1>송금하기</h1>
          {alertId ? (
            <TransferDetails>
              <p><strong>서류 제목:</strong> {title}</p>
              <p><strong>납부일:</strong> {dueDate}</p>
              <p><strong>금액:</strong> {amount}</p>
              <p><strong>거래상대:</strong> {partner}</p>
              <p><strong>은행:</strong> {partner_bank}</p>
              <p><strong>계좌번호:</strong> {account}</p>
              <TransferButton
                onClick={handleTransferComplete}
                disabled={isTransferring}
              >
                {isTransferring ? "송금 중..." : "송금 완료"}
              </TransferButton>
            </TransferDetails>
          ) : (
            <p>송금할 정보를 찾을 수 없습니다. 홈 화면에서 알림을 선택해 주세요.</p>
          )}
        </TransferContainer>
      </PageWrapper>
    </>
  );
};

/* =========================
   스타일
   ========================= */
const TransferContainer = styled.div`
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

const TransferDetails = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f9f9f9;

  p {
    margin-bottom: 8px;
    font-size: 16px;
    color: #555;
  }

  strong {
    color: #222;
  }
`;

const TransferButton = styled.button`
  width: 100%;
  padding: 12px;
  font-size: 18px;
  font-weight: bold;
  background-color: black;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.25s ease, transform 0.06s ease;

  &:hover:not(:disabled) {
    background-color: #333;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const HelpText = styled.p`
  margin-top: 10px;
  font-size: 14px;
  color: #6b7280;
`;

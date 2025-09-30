// src/pages/DirectTransferPage.tsx
import { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { useLocation } from "react-router-dom";
import axios from "axios";
import NavigationBar from "@/components/NavigationBar";
import PageWrapper from "@/components/PageWrapper";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useAccountStore, Account } from "@/store/useAccountStore";
import {
  transferAmount as transferAmountAPI,
  getAccountByNumber,
  createTransaction,
} from "@/api";
import { useVoicePref } from "@/store/useVoicePref";

type VoiceStep =
  | "choose"   // 보내는 계좌 선택
  | "bank"     // 받는 은행
  | "account"  // 받는 계좌번호
  | "amount"   // 금액
  | "confirm"  // 확인(송금/아니오)
  | "done";

const DirectTransferPage = () => {
  const { enabled } = useVoicePref();
  return enabled ? <DirectTransferVoiceMode /> : <DirectTransferManualMode />;
};

export default DirectTransferPage;

/* =========================
   음성(STT/TTS) 모드
   ========================= */
const DirectTransferVoiceMode = () => {
  const location = useLocation();
  const { accounts, fetchAccounts } = useAccountStore();

  const [selectedSenderAccount, setSelectedSenderAccount] = useState<Account | null>(null);
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState<number | "">("");
  const [isTransferring, setIsTransferring] = useState(false);

  const [step, setStep] = useState<VoiceStep>("choose");

  // ===== 최신값 refs (STT 이벤트 타이밍 대비) =====
  const stepRef = useRef<VoiceStep>(step);
  const senderRef = useRef<Account | null>(selectedSenderAccount);
  const bankRef = useRef(recipientBank);
  const rcvAccRef = useRef(recipientAccount);
  const amtRef = useRef<number | "">(transferAmount);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { senderRef.current = selectedSenderAccount; }, [selectedSenderAccount]);
  useEffect(() => { bankRef.current = recipientBank; }, [recipientBank]);
  useEffect(() => { rcvAccRef.current = recipientAccount; }, [recipientAccount]);
  useEffect(() => { amtRef.current = transferAmount; }, [transferAmount]);

  // ===== 계좌 목록 로드 =====
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) fetchAccounts(Number(userId));
  }, [fetchAccounts]);

  // ===== location.state 초기값(있다면 폼/음성 모두에서 사용) =====
  useEffect(() => {
    if (location.state) {
      const { recipientBank, recipientAccount, transferAmount } = location.state as any;
      if (recipientBank) setRecipientBank(recipientBank);
      if (recipientAccount) setRecipientAccount(recipientAccount);
      if (transferAmount) setTransferAmount(transferAmount);
    }
  }, [location.state]);

  // ===== 보이스 유틸 =====
  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);

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

  const speakAndThen = async (text: string, then?: () => void) => {
    let finished = false;
    const done = () => { if (finished) return; finished = true; try { then?.(); } catch {} };
    const SAFETY_MS = 2500;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      await awaitVoices();
      try { window.speechSynthesis.resume(); } catch {}
      await new Promise(r => setTimeout(r, 140));

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoreanVoice(); if (v) u.voice = v;
      u.onend = () => { clearTimeout(timer); setTimeout(done, 100); };

      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    } catch {
      clearTimeout(timer);
      done();
    }
  };

  // ===== STT =====
  const normalizeAccount = (raw: string) => {
    let s = String(raw ?? "").replace(/[^\d-]+/g, "");
    s = s.replace(/-+/g, "-");
    s = s.replace(/^-/g, "").replace(/-$/g, "");
    return s;
  };

  const extractNumber = (raw: string) => {
    const digits = (raw.match(/\d+/g) || []).join("");
    return digits ? Number(digits) : NaN;
    // (필요하면 "만/천/백" 등의 한국어 수사 파싱 로직을 추가 가능)
  };

  const parseAccountSelection = (raw: string, list: Account[]) => {
    const t = raw.replace(/\s+/g, "").toLowerCase();
    // 1) "첫번째/두번째/세번째" or "1/2/3"
    const ordMap: Record<string, number> = {
      "첫번째": 1, "첫번쨰": 1, "첫번재": 1, "첫번쨰계좌": 1,
      "두번째": 2, "세번째": 3, "네번째": 4, "다섯번째": 5
    };
    for (const k of Object.keys(ordMap)) {
      if (t.includes(k)) {
        const idx = ordMap[k] - 1;
        if (idx >= 0 && idx < list.length) return list[idx];
      }
    }
    const num = extractNumber(t);
    if (!isNaN(num)) {
      const idx = num - 1;
      if (idx >= 0 && idx < list.length) return list[idx];
    }
    // 2) 은행명 포함
    const bankHit = list.find(a => t.includes(String(a.account_bank).toLowerCase()));
    if (bankHit) return bankHit;
    // 3) 계좌 뒷 4자리로 매칭
    const tail4 = (t.match(/\d{4}$/) || [])[0];
    if (tail4) {
      const hit = list.find(a => String(a.account_number).replace(/[^\d]/g, "").endsWith(tail4));
      if (hit) return hit;
    }
    return null;
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

    let active = true;

    rec.onresult = async (event: any) => {
      const raw = (event?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!raw) return;
      const cur = stepRef.current;

      if (cur === "choose") {
        if (!accounts || accounts.length === 0) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("등록된 보내는 계좌가 없습니다. 먼저 계좌를 등록해 주세요.");
          return;
        }
        const picked = parseAccountSelection(raw, accounts);
        if (!picked) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("죄송합니다. 어느 계좌인지 이해하지 못했습니다. 첫 번째, 두 번째처럼 말씀하시거나, 은행명 또는 계좌 뒷 네 자리로 말씀해 주세요.", () => startListening());
          return;
        }
        setSelectedSenderAccount(picked);
        setStep("bank");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen(`보내는 계좌는 ${picked.account_bank} ${picked.account_number} 입니다. 받는 은행을 말씀해 주세요.`, () => startListening());

      } else if (cur === "bank") {
        setRecipientBank(raw);
        setStep("account");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen(`받는 은행은 ${raw} 입니다. 받는 계좌번호를 말씀해 주세요.`, () => startListening());

      } else if (cur === "account") {
        const cleaned = normalizeAccount(raw);
        if (!cleaned) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("계좌번호가 인식되지 않았습니다. 숫자와 하이픈으로 다시 말씀해주세요.", () => startListening());
          return;
        }
        setRecipientAccount(cleaned);
        setStep("amount");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen(`받는 계좌번호는 ${cleaned} 입니다. 보낼 금액을 말씀해 주세요.`, () => startListening());

      } else if (cur === "amount") {
        const n = extractNumber(raw);
        if (isNaN(n) || n <= 0) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("금액을 이해하지 못했습니다. 숫자로 다시 말씀해 주세요.", () => startListening());
          return;
        }
        setTransferAmount(n);
        setStep("confirm");
        active = false; try { rec.stop(); } catch {}
        const a = senderRef.current!;
        await speakAndThen(
          `확인합니다. ${a.account_bank} ${a.account_number} 에서, ${bankRef.current} ${rcvAccRef.current} 로, ${n} 원을 송금할까요? 송금 또는 아니오로 대답해 주세요.`,
          () => startListening()
        );

      } else if (cur === "confirm") {
        const t = raw.replace(/\s+/g, "").toLowerCase();
        active = false; try { rec.stop(); } catch {}
        if (t.includes("송금")) {
          await doTransfer();
        } else if (t.includes("아니오") || t.includes("아니요")) {
          await speakAndThen("송금을 취소했습니다.");
          setStep("done");
        } else {
          await speakAndThen("죄송합니다. 송금 또는 아니오로만 대답해 주세요.", () => startListening());
        }
      }
    };

    rec.onerror = async () => {
      if (!active) return;
      await speakAndThen("음성을 인식하지 못했습니다. 다시 말씀해주세요.", () => startListening());
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

    // TTS가 끝난 뒤 시작
    const tryStart = () => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        setTimeout(tryStart, 120);
      } else {
        try { rec.start(); } catch {}
      }
    };
    tryStart();
  };

  // ===== 실제 송금 처리 =====
  const doTransfer = async () => {
    if (isTransferring) return;
    setIsTransferring(true);

    try {
      const sender = senderRef.current;
      const bank = bankRef.current;
      const rcvAcc = rcvAccRef.current;
      const amt = amtRef.current;

      if (!sender || !bank || !rcvAcc || !amt || Number(amt) <= 0) {
        setIsTransferring(false);
        await speakAndThen("필수 정보가 부족합니다. 처음부터 다시 시도해 주세요.");
        setStep("choose");
        startListening();
        return;
      }

      if (sender.account_balance < Number(amt)) {
        setIsTransferring(false);
        await speakAndThen("잔액이 부족합니다. 금액을 다시 말씀해 주세요.");
        setStep("amount");
        startListening();
        return;
      }

      const recipientAccountInfo = await getAccountByNumber(rcvAcc);
      if (!recipientAccountInfo) {
        setIsTransferring(false);
        await speakAndThen("상대방 계좌를 찾을 수 없습니다. 받는 계좌번호를 다시 말씀해 주세요.");
        setStep("account");
        startListening();
        return;
      }

      // 송금 실행
      await transferAmountAPI({
        from_account_number: sender.account_number,
        to_account_number: rcvAcc,
        withdraw_amount: Number(amt),
        deposit_amount: Number(amt),
      });

      // 거래 내역 생성
      await createTransaction({
        transaction_user_id: sender.account_user_id,
        transaction_partner_id: recipientAccountInfo.account_user_id,
        transaction_title: `${recipientAccountInfo.account_bank}(으)로 송금`,
        transaction_balance: Number(amt),
        transaction_due: new Date().toISOString(),
        transaction_close: true,
        transaction_recurring: false,
      });

      await speakAndThen(`${amt}원 송금이 완료되었습니다.`);
      // 잔액 갱신
      const userId = localStorage.getItem("user_id");
      if (userId) await fetchAccounts(Number(userId));
      setIsTransferring(false);

      // 초기화 (필요 시 바로 종료)
      setSelectedSenderAccount(null);
      setRecipientBank("");
      setRecipientAccount("");
      setTransferAmount("");
      setStep("done");
    } catch (error: unknown) {
      setIsTransferring(false);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Failed to complete transfer:", error.response.data);
        await speakAndThen(`송금 실패. ${JSON.stringify(error.response.data)}.`);
      } else if (error instanceof Error) {
        console.error("Failed to complete transfer:", error.message);
        await speakAndThen(`송금 실패. ${error.message}.`);
      } else {
        console.error("An unexpected error occurred:", error);
        await speakAndThen("송금 실패: 알 수 없는 오류가 발생했습니다.");
      }
      // 실패 시 확인 단계로 되돌리거나, 필요 시 이전 단계로 안내
      setStep("confirm");
      startListening();
    }
  };

  // ===== 안내 후 STT 시작 =====
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const intro = async () => {
      if (!accounts || accounts.length === 0) {
        await speakAndThen("등록된 보내는 계좌가 없습니다. 먼저 계좌를 등록해 주세요.");
        return;
      }

      // 상위 3개 계좌만 간단히 소개
      const previews = accounts.slice(0, 3).map((a, idx) =>
        `${idx + 1}번, ${a.account_bank} ${a.account_number}`
      ).join(". ");

      await speakAndThen(
        `송금을 시작합니다. 보내는 계좌를 선택해 주세요. 예를 들어, 첫 번째 또는 두 번째라고 말씀하실 수 있어요. ${previews}.`,
        () => startListening()
      );
    };

    intro();

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // ===== UI (음성 모드이지만, 화면 정보는 그대로 표시) =====
  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <TransferContainer>
          <h1>송금하기 (음성 모드)</h1>
          <AccountList>
            {accounts.length === 0 ? (
              <p>등록된 계좌가 없습니다.</p>
            ) : (
              accounts.map((account) => (
                <AccountItem key={account.account_id}>
                  <AccountInfo>
                    <p><strong>은행:</strong> {account.account_bank}</p>
                    <p><strong>계좌번호:</strong> {account.account_number}</p>
                    <p><strong>잔액:</strong> {account.account_balance.toLocaleString()}원</p>
                  </AccountInfo>
                </AccountItem>
              ))
            )}
          </AccountList>

          <StatusPanel>
            <p><strong>현재 단계:</strong> {step}</p>
            <p><strong>보내는 계좌:</strong> {selectedSenderAccount ? `${selectedSenderAccount.account_bank} ${selectedSenderAccount.account_number}` : "-"}</p>
            <p><strong>받는 분 은행:</strong> {recipientBank || "-"}</p>
            <p><strong>받는 분 계좌번호:</strong> {recipientAccount || "-"}</p>
            <p><strong>송금 금액:</strong> {transferAmount ? `${transferAmount}원` : "-"}</p>
            {isTransferring && <p>송금 중...</p>}
          </StatusPanel>
        </TransferContainer>
      </PageWrapper>
    </>
  );
};

/* =========================
   수동(기존 버튼/폼) 모드
   ========================= */
const DirectTransferManualMode = () => {
  const location = useLocation();
  const { accounts, fetchAccounts } = useAccountStore();

  const [selectedSenderAccount, setSelectedSenderAccount] =
    useState<Account | null>(null);
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState<number | "">("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showManualFormOverlay, setShowManualFormOverlay] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      fetchAccounts(Number(userId));
    }
  }, [fetchAccounts]);

  useEffect(() => {
    if (location.state) {
      const { recipientBank, recipientAccount, transferAmount } =
        location.state as any;
      if (recipientBank) setRecipientBank(recipientBank);
      if (recipientAccount) setRecipientAccount(recipientAccount);
      if (transferAmount) setTransferAmount(transferAmount);
      setShowManualFormOverlay(true);
    }
  }, [location.state]);

  const handleInitiateTransfer = (account: Account) => {
    setSelectedSenderAccount(account);
    setShowManualFormOverlay(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSenderAccount || !recipientBank || !recipientAccount || !transferAmount) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    if (selectedSenderAccount.account_balance < Number(transferAmount)) {
      alert("잔액이 부족합니다.");
      return;
    }
    setShowConfirmation(true);
  };

  const confirmTransfer = async () => {
    setIsTransferring(true);
    setShowConfirmation(false);
    if (!selectedSenderAccount || !transferAmount) return;

    try {
      const recipientAccountInfo = await getAccountByNumber(recipientAccount);
      if (!recipientAccountInfo) {
        alert("상대방 계좌를 찾을 수 없습니다.");
        setIsTransferring(false);
        return;
      }
      const partnerId = recipientAccountInfo.account_user_id;
      const myUserId = selectedSenderAccount.account_user_id;

      await transferAmountAPI({
        from_account_number: selectedSenderAccount.account_number,
        to_account_number: recipientAccount,
        withdraw_amount: Number(transferAmount),
        deposit_amount: Number(transferAmount),
      });

      await createTransaction({
        transaction_user_id: myUserId,
        transaction_partner_id: partnerId,
        transaction_title: `${recipientAccountInfo.account_bank}(으)로 송금`,
        transaction_balance: Number(transferAmount),
        transaction_due: new Date().toISOString(),
        transaction_close: true,
        transaction_recurring: false,
      });

      alert(`${transferAmount}원 송금이 완료되었습니다.`);
      const userId = localStorage.getItem("user_id");
      if (userId) fetchAccounts(Number(userId));

      setIsTransferring(false);
      setShowManualFormOverlay(false);
      setRecipientBank("");
      setRecipientAccount("");
      setTransferAmount("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Failed to complete transfer:", error.response.data);
        alert(`송금 실패: ${JSON.stringify(error.response.data)}`);
      } else if (error instanceof Error) {
        console.error("Failed to complete transfer:", error.message);
        alert(`송금 실패: ${error.message}`);
      } else {
        console.error("An unexpected error occurred:", error);
        alert("송금 실패: 알 수 없는 오류가 발생했습니다.");
      }
      setIsTransferring(false);
    }
  };

  const cancelTransfer = () => {
    setShowConfirmation(false);
    setIsTransferring(false);
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <TransferContainer>
          <h1>송금하기</h1>
          <AccountList>
            {accounts.length === 0 ? (
              <p>등록된 계좌가 없습니다.</p>
            ) : (
              accounts.map((account) => (
                <AccountItem key={account.account_id}>
                  <AccountInfo>
                    <p><strong>은행:</strong> {account.account_bank}</p>
                    <p><strong>계좌번호:</strong> {account.account_number}</p>
                    <p><strong>잔액:</strong> {account.account_balance.toLocaleString()}원</p>
                  </AccountInfo>
                  <TransferButton onClick={() => handleInitiateTransfer(account)}>
                    송금하기
                  </TransferButton>
                </AccountItem>
              ))
            )}
          </AccountList>

          {showManualFormOverlay && (
            <ManualTransferOverlay>
              <ManualTransferForm onSubmit={handleTransferSubmit}>
                <h2>송금 정보 입력</h2>
                {selectedSenderAccount && (
                  <SenderAccountInfo>
                    <p>
                      <strong>보내는 계좌:</strong>{" "}
                      {selectedSenderAccount.account_bank} {selectedSenderAccount.account_number}
                    </p>
                    <p>
                      <strong>잔액:</strong>{" "}
                      {selectedSenderAccount.account_balance.toLocaleString()}원
                    </p>
                  </SenderAccountInfo>
                )}
                <Input
                  type="text"
                  placeholder="받는 분 은행"
                  value={recipientBank}
                  onChange={(e) => setRecipientBank(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="받는 분 계좌번호"
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="송금 금액"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                />
                <ButtonContainer>
                  <ConfirmButton type="submit" disabled={isTransferring}>
                    {isTransferring ? "송금 중..." : "다음"}
                  </ConfirmButton>
                  <CancelButton onClick={() => setShowManualFormOverlay(false)}>
                    취소
                  </CancelButton>
                </ButtonContainer>
              </ManualTransferForm>
            </ManualTransferOverlay>
          )}

          {showConfirmation && (
            <ConfirmationOverlay>
              <ConfirmationBox>
                <p><strong>보내는 계좌:</strong> {selectedSenderAccount?.account_bank} {selectedSenderAccount?.account_number}</p>
                <p><strong>받는 분 은행:</strong> {recipientBank}</p>
                <p><strong>받는 분 계좌번호:</strong> {recipientAccount}</p>
                <p><strong>송금 금액:</strong> {transferAmount}원</p>
                <p>정말 송금하시겠습니까?</p>
                <ButtonContainer>
                  <ConfirmButton onClick={confirmTransfer}>예</ConfirmButton>
                  <CancelButton onClick={cancelTransfer}>아니오</CancelButton>
                </ButtonContainer>
              </ConfirmationBox>
            </ConfirmationOverlay>
          )}
        </TransferContainer>
      </PageWrapper>
    </>
  );
};

/* ===== 스타일 공통 ===== */
const TransferContainer = styled.div`
  padding: clamp(1.8vh, 3vh, 4vh);
  max-width: 80vh;
  margin: 0 auto;
  background-color: #fff;
  border-radius: clamp(0.6vh, 1vh, 1.6vh);
  box-shadow: 0 0.4vh 1.2vh rgba(0, 0, 0, 0.1);

  h1 {
    text-align: center;
    margin-bottom: clamp(2vh, 3.2vh, 4vh);
    color: #333;
    font-size: clamp(2.2vh, 3vh, 3.6vh);
    font-weight: 800;
  }
`;

const AccountList = styled.div`
  margin-top: 2vh;
  font-size: 2.3vh;
`;

const AccountItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(1.4vh, 1.8vh, 2.4vh);
  border: 0.2vh solid #eee;
  border-radius: clamp(0.6vh, 1vh, 1.6vh);
  margin-bottom: 1.6vh;
  background-color: #f9f9f9;
  gap: 1.2vh;
  flex-wrap: wrap;
`;

const AccountInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  p {
    margin-bottom: 1vh;
    font-size: clamp(1.6vh, 1.9vh, 2.1vh);
  }
`;

const TransferButton = styled.button`
  background-color: black;
  color: white;
  border: none;
  padding: clamp(1vh, 1.4vh, 1.8vh) clamp(1.2vh, 1.8vh, 2.2vh);
  border-radius: clamp(0.5vh, 0.8vh, 1.2vh);
  cursor: pointer;
  font-size: clamp(1.6vh, 1.9vh, 2.2vh);

  &:hover {
    background-color: #333;
  }
`;

const ManualTransferOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ManualTransferForm = styled.form`
  background-color: white;
  padding: clamp(2vh, 3vh, 4vh);
  border-radius: clamp(0.8vh, 1.2vh, 1.6vh);
  box-shadow: 0 0.8vh 2vh rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 70vh;
  max-width: 90vh;

  h2 {
    margin-bottom: 2.4vh;
    color: #333;
    font-size: clamp(2vh, 2.6vh, 3vh);
  }

  @media (max-height: 60vh) {
    width: 64vh;
    padding: clamp(1.6vh, 2.2vh, 3vh);
  }
`;

const SenderAccountInfo = styled.div`
  background-color: #e9ecef;
  padding: 1.4vh;
  border-radius: 0.8vh;
  margin-bottom: 2vh;

  p {
    margin-bottom: 0.8vh;
    font-size: clamp(1.6vh, 1.9vh, 2.1vh);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: clamp(1.2vh, 1.6vh, 2vh);
  margin-bottom: 1.6vh;
  border-radius: 0.8vh;
  border: 0.25vh solid #ccc;
  font-size: clamp(1.6vh, 1.9vh, 2.2vh);

  &:hover {
    border-color: #bdbdbd;
  }

  &:focus-visible {
    outline: none;
    border-color: #111;
    box-shadow: 0 0 0 0.6vh rgba(0, 0, 0, 0.08);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 1.2vh;
  margin-top: 2.2vh;
  flex-wrap: wrap;
`;

const ConfirmButton = styled.button`
  padding: clamp(1.2vh, 1.6vh, 2vh) clamp(1.8vh, 2.4vh, 3vh);
  font-size: clamp(2vh, 2vh, 2.2vh);
  background-color: black;
  color: white;
  border: none;
  border-radius: 0.8vh;
  cursor: pointer;
  width: 25vh;

  &:hover {
    background-color: #333;
  }
`;

const CancelButton = styled.button`
  padding: clamp(1.2vh, 1.6vh, 2vh) clamp(1.8vh, 2.4vh, 3vh);
  font-size: clamp(1.8vh, 2vh, 2.2vh);
  background-color: #ccc;
  color: black;
  border: none;
  border-radius: 0.8vh;
  cursor: pointer;
  width: 25vh;

  &:hover {
    background-color: #bbb;
  }
`;

const ConfirmationOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ConfirmationBox = styled.div`
  background-color: white;
  padding: clamp(2vh, 3vh, 4vh);
  border-radius: 1.2vh;
  box-shadow: 0 0.8vh 2vh rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 64vh;
  max-width: 90vh;

  p {
    margin-bottom: 1.6vh;
    font-size: clamp(1.8vh, 2.1vh, 2.4vh);
  }

  @media (max-height: 60vh) {
    width: 56vh;
    padding: clamp(1.6vh, 2.2vh, 3vh);
  }
`;

const StatusPanel = styled.div`
  margin-top: 1.6vh;
  padding: 1.2vh;
  border: 0.3vh dashed #ddd;
  border-radius: 0.8vh;
  background: #fafafa;
  font-size: clamp(1.6vh, 1.9vh, 2.2vh);
`;

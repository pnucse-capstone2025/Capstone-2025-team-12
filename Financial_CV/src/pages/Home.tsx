// src/pages/Home.tsx
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import imgPath from "../assets/eyes_open_nobg.png";
import SearchBar from "../components/SearchBar";
import AlertCard from "../components/AlertCard";
import styled from "@emotion/styled";
import { getReminders } from "../api";
import { useAccountStore } from "../store/useAccountStore";
import { useVoicePref } from "@/store/useVoicePref";
import { usePageVoiceScope } from "@/utils/voiceGate";

type Reminder = {
  reminder_id: number;
  transaction_id: number;
  reminder_user_id: number;
  reminder_title: string;
  due_at: string;
  status: string;
  created_at: string;
};

function Home() {
  const { enabled } = useVoicePref();
  return enabled ? <HomeVoiceMode /> : <HomeManualMode />;
}
export default Home;

/* =========================================
   음성(STT/TTS) 모드
   ========================================= */
const HomeVoiceMode = () => {
  const { accounts, fetchAccounts } = useAccountStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const remindersRef = useRef<Reminder[]>([]);
  const completedRef = useRef<number[]>([]);
  const accountsRef = useRef(accounts);
  useEffect(() => { remindersRef.current = reminders; }, [reminders]);
  useEffect(() => { completedRef.current = completedIds; }, [completedIds]);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);

  const handleComplete = useCallback((id: number) => {
    setCompletedIds((prev) => {
      const next = [...prev, id];
      localStorage.setItem("completedAlerts", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) fetchAccounts(parseInt(userId));
    (async () => {
      try {
        const r = await getReminders();
        setReminders(r || []);
      } catch (e) { console.error(e); }
    })();
    const saved = localStorage.getItem("completedAlerts");
    if (saved) setCompletedIds(JSON.parse(saved));
    if ((location.state as any)?.completedAlertId) {
      const { completedAlertId } = location.state as any;
      handleComplete(completedAlertId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleComplete, fetchAccounts]);

  const activeReminders = useMemo(
    () => reminders.filter((r) => !completedIds.includes(r.reminder_id)),
    [reminders, completedIds]
  );
  const primaryAccount = useMemo(
    () => accounts.find((acc) => (acc as any).is_primary) || accounts[0],
    [accounts]
  );

  const { speak, listenOnce, stopAll } = usePageVoiceScope("home");
  const { enabled } = useVoicePref();

  // 로그인 여부에 따라 인트로 문구를 다르게 안내
  const buildIntro = useCallback(() => {
    const loggedIn = !!localStorage.getItem("access_token");
    const n = (remindersRef.current || []).filter(
      (r) => !completedRef.current.includes(r.reminder_id)
    ).length;
    // 알림 개수 안내를 넣고 싶다면 아래 주석을 활용하세요.
    // const head = n > 0 ? `확인할 알림 ${n}건이 있습니다. ` : `확인할 알림은 없습니다. `;
    const helpWhenLoggedOut =
      `무엇을 도와드릴까요? “송금하기”, “로그인”, “회원가입”, “서류등록”, “서류보관함”, “거래내역”, “계좌관리”, “검색”이라고 말씀해 보세요.`;
    const helpWhenLoggedIn =
      `무엇을 도와드릴까요? “송금하기”, “로그아웃”, “서류등록”, “서류보관함”, “거래내역”, “계좌관리”, “검색”이라고 말씀해 보세요.`;
    return loggedIn ? helpWhenLoggedIn : helpWhenLoggedOut;
  }, []);

  const waitCommand = useCallback(async (): Promise<void> => {
    const raw = (await listenOnce({ lang: "ko-KR", timeoutMs: 15000 })) || "";
    const low = raw.replace(/\s+/g, "").toLowerCase();

    if (low.includes("송금하기") || low.includes("송금")) {
      await speak("송금하기로 이동합니다."); navigate("/direct-transfer"); return;
    }

    // 로그인: 이미 로그인 상태면 안내만 하고 다시 대기
    if (low.includes("로그인")) {
      if (localStorage.getItem("access_token")) {
        await speak("이미 로그인 상태입니다. 로그아웃을 원하시면 로그아웃이라고 말씀해 주세요.");
        return waitCommand();
      }
      await speak("로그인 페이지로 이동합니다."); navigate("/login"); return;
    }

    // 로그아웃: 토큰 정리 후 /login 으로 이동
    if (low.includes("로그아웃")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      await speak("로그아웃 되었습니다. 로그인 페이지로 이동합니다.");
      navigate("/login");
      return;
    }

    if (low.includes("회원가입")) {
      await speak("회원가입 페이지로 이동합니다."); navigate("/signup"); return;
    }
    if (low.includes("서류등록") || low.includes("서류촬영") || low.includes("카메라")) {
      await speak("서류 등록으로 이동합니다."); navigate("/Camera"); return;
    }
    if (low.includes("서류보관함") || (low.includes("서류") && low.includes("보관함"))) {
      await speak("서류 보관함으로 이동합니다."); navigate("/documents"); return;
    }
    if (low.includes("거래내역")) {
      await speak("거래내역으로 이동합니다."); navigate("/history"); return;
    }
    if (low.includes("검색")) {
      await speak("검색어를 말씀해 주세요.");
      const q = (await listenOnce({ lang: "ko-KR", timeoutMs: 15000 }))?.trim();
      if (!q) { await speak("검색어를 이해하지 못했습니다. 다시 시도해 주세요."); return waitCommand(); }
      await speak(`“${q}”를 검색합니다.`); navigate("/documents", { state: { q } }); return;
    }
    if (low.includes("잔액") || low.includes("계좌")) {
      const pa = accountsRef.current && accountsRef.current.length
        ? (accountsRef.current.find((a: any) => a.is_primary) || accountsRef.current[0])
        : null;
      if (pa) {
        await speak(`대표 계좌 ${pa.account_number}, 잔액은 ${Number(pa.account_balance || 0).toLocaleString()}원입니다.`);
      } else {
        await speak("계좌 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      }
      return waitCommand();
    }

    await speak("이해하지 못했습니다. 송금하기, 로그인, 로그아웃, 회원가입, 서류등록, 서류보관함, 거래내역, 계좌관리, 검색 중에서 말씀해 주세요.");
    return waitCommand();
  }, [listenOnce, speak, navigate]);

  const startedRef = useRef(false);
  const strictCleanupSkippedRef = useRef(false);

  const startVoice = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    await speak(buildIntro());
    await waitCommand();
  }, [buildIntro, waitCommand, speak]);

  useEffect(() => {
    if (!enabled) { startedRef.current = false; stopAll(); return; }
    startVoice();
  }, [enabled, startVoice, stopAll]);

  useEffect(() => {
    const onEnable = () => startVoice();
    window.addEventListener("voice:enable", onEnable);
    return () => window.removeEventListener("voice:enable", onEnable);
  }, [startVoice]);

  useEffect(() => {
    return () => {
      const isDev =
        typeof process !== "undefined"
          ? process.env.NODE_ENV !== "production"
          : (typeof import.meta !== "undefined" && (import.meta as any)?.env?.DEV);
      if (isDev && !strictCleanupSkippedRef.current) {
        strictCleanupSkippedRef.current = true;
        return;
      }
      stopAll();
    };
  }, [stopAll]);

  return (
    <div>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <SearchBar />
      <AccountSection>
        <AccountInfo>
          <h3>내 계좌</h3>
          {primaryAccount ? (
            <>
              <p>{primaryAccount.account_number}</p>
              <Balance>₩ {Number(primaryAccount.account_balance || 0).toLocaleString()}</Balance>
            </>
          ) : (
            <p>계좌 정보를 불러오는 중입니다...</p>
          )}
        </AccountInfo>
        <TransferButton onClick={() => navigate("/direct-transfer")}>송금하기</TransferButton>
      </AccountSection>
      <section style={{ padding: "0 24px", marginTop: "2vh" }}>
        <h3 style={{ fontSize: "4vh", marginBottom: "2vh" }}>알림</h3>
        {activeReminders.map((reminder) => (
          <AlertCard
            key={reminder.reminder_id}
            id={reminder.reminder_id}
            title={reminder.reminder_title}
            dueDate={new Date(reminder.due_at).toLocaleDateString()}
            amount="-"
            partner="-"
            partner_bank=""
            account=""
            isCompleted={reminder.status === "completed"}
            onComplete={() => handleComplete(reminder.reminder_id)}
          />
        ))}
        {activeReminders.length === 0 && <p>🎉 모든 알림을 확인했습니다!</p>}
      </section>
    </div>
  );
};

/* =========================================
   수동(기존) 모드
   ========================================= */
const HomeManualMode = () => {
  const { accounts, fetchAccounts } = useAccountStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const handleComplete = useCallback((id: number) => {
    setCompletedIds((prev) => {
      const next = [...prev, id];
      localStorage.setItem("completedAlerts", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) fetchAccounts(parseInt(userId));
    (async () => {
      try {
        const r = await getReminders();
        setReminders(r || []);
      } catch (e) { console.error(e); }
    })();
    const saved = localStorage.getItem("completedAlerts");
    if (saved) setCompletedIds(JSON.parse(saved));
    if ((location.state as any)?.completedAlertId) {
      const { completedAlertId } = location.state as any;
      handleComplete(completedAlertId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleComplete, fetchAccounts]);

  const activeReminders = reminders.filter(r => !completedIds.includes(r.reminder_id));
  const primaryAccount = accounts.find((acc) => (acc as any).is_primary) || accounts[0];

  return (
    <div>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <SearchBar />
      <AccountSection>
        <AccountInfo>
          <h3>내 계좌</h3>
          {primaryAccount ? (
            <>
              <p>{primaryAccount.account_number}</p>
              <Balance>₩ {Number(primaryAccount.account_balance || 0).toLocaleString()}</Balance>
            </>
          ) : (
            <p>계좌 정보를 불러오는 중입니다...</p>
          )}
        </AccountInfo>
        <TransferButton onClick={() => navigate("/direct-transfer")}>송금하기</TransferButton>
      </AccountSection>
      <section style={{ padding: "0 24px", marginTop: "2vh" }}>
        <h3 style={{ fontSize: "4vh", marginBottom: "2vh" }}>알림</h3>
        {activeReminders.map((reminder) => (
          <AlertCard
            key={reminder.reminder_id}
            id={reminder.reminder_id}
            title={reminder.reminder_title}
            dueDate={new Date(reminder.due_at).toLocaleDateString()}
            amount="-"
            partner="-"
            partner_bank=""
            account=""
            isCompleted={reminder.status === "completed"}
            onComplete={() => handleComplete(reminder.reminder_id)}
          />
        ))}
        {activeReminders.length === 0 && <p>🎉 모든 알림을 확인했습니다!</p>}
      </section>
    </div>
  );
};

/* =========================================
   스타일
   ========================================= */
const AccountSection = styled.section`
  padding: min(3vh, 24px);
  margin-top: min(2.5vh, 20px);
  background-color: #f0f2f5;
  border-radius: min(1vh, 8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: min(1vh, 10px);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: min(1.5vh, 12px);
  }

  @media (max-width: 480px) {
    padding: min(2vh, 16px);
    margin-left: min(2vw, 10px);
    margin-right: min(2vw, 10px);
  }
`;

const AccountInfo = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin-bottom: min(0.6vh, 5px);
    color: #333;
    font-size: min(2.2vh, 18px);
    font-weight: 600;
  }

  p {
    font-size: min(1.8vh, 14px);
    color: #666;
    margin-bottom: min(0.6vh, 5px);
    word-break: break-all;
  }
`;

const Balance = styled.div`
  font-size: min(3vh, 24px);
  font-weight: bold;
  color: #000;
  margin-top: min(0.5vh, 4px);
`;

const TransferButton = styled.button`
  background-color: black;
  color: white;
  border: none;
  padding: min(1.2vh, 10px) min(2.5vw, 20px);
  border-radius: min(1vh, 8px);
  font-size: min(2vh, 16px);
  cursor: pointer;
  transition: background-color 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    padding: min(1.5vh, 12px) min(2vw, 20px);
    font-size: min(1.8vh, 16px);
  }

  @media (max-width: 480px) {
    padding: min(1.2vh, 10px) min(2vw, 16px);
    font-size: min(1.6vh, 14px);
  }

  &:hover {
    background-color: #333;
  }
`;

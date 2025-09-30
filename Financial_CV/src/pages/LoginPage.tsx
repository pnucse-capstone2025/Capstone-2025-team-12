// src/pages/LoginPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { login } from "@/api";
import axios from "axios";
import { useVoicePref } from "@/store/useVoicePref";

interface ErrorResponse { detail?: string; }

const LoginPage: React.FC = () => {
  const { enabled } = useVoicePref();
  return enabled ? <LoginVoiceMode /> : <LoginManualMode />;
};

export default LoginPage;

/* =========================
   음성(STT/TTS) 모드
   ========================= */
type Step = "email" | "password" | "done";

const LoginVoiceMode: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepRef = useRef(step);
  const emailRef = useRef(email);
  const pwRef = useRef(password);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { pwRef.current = password; }, [password]);

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
    const SAFETY_MS = 3000;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      await awaitVoices();
      try { window.speechSynthesis.resume(); } catch {}
      await new Promise(r => setTimeout(r, 120));

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoreanVoice(); if (v) u.voice = v;
      u.onend = () => { clearTimeout(timer); setTimeout(done, 80); };

      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    } catch {
      clearTimeout(timer);
      done();
    }
  };

  const normalizeEmail = (raw: string) => {
    let t = (raw || "").trim().toLowerCase().replace(/\s+/g, "");
    t = t.replace("골뱅이", "@");
    if (!t.includes("@")) t = `${t}@pusan.ac.kr`;
    t = t.replace(/@pusan\.ac\.kr.*/g, "@pusan.ac.kr");
    return t;
  };
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPassword = (p: string) => (p || "").length >= 1;

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

      if (cur === "email") {
        const e = normalizeEmail(raw);
        if (!isValidEmail(e)) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("이메일 형식을 이해하지 못했습니다.", () => startListening());
          return;
        }
        setEmail(e);
        setStep("password");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen("비밀번호를 말씀해 주세요.", () => startListening());

      } else if (cur === "password") {
        const p = raw.replace(/\s/g, "");
        if (!isValidPassword(p)) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("비밀번호를 이해하지 못했습니다.", () => startListening());
          return;
        }
        setPassword(p);
        active = false; try { rec.stop(); } catch {}

        // 확인 질문 없이 바로 로그인
        await speakAndThen("입력하신 정보로 로그인합니다.");
        await doLogin();
      }
    };

    rec.onerror = async () => {
      if (!active) return;
      await speakAndThen("음성을 인식하지 못했습니다.", () => startListening());
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
  };

  const doLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const e = emailRef.current;
    const p = pwRef.current;

    try {
      const response = await login({ user_mail: e, password: p });
      const { access_token } = response;
      if (!access_token) throw new Error("access_token이 없습니다.");

      const payload = JSON.parse(atob(access_token.split(".")[1]));
      const { user_id, user_name } = payload;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user_id", user_id.toString());

      await speakAndThen(`로그인 성공. ${user_name}님 환영합니다.`);
      navigate("/home");
    } catch (error: unknown) {
      let msg = "서버에 연결할 수 없습니다.";
      if (axios.isAxiosError(error) && error.response) {
        const data: ErrorResponse = error.response.data;
        msg = `로그인 실패. ${data.detail || "서버 오류"}`;
      }
      await speakAndThen(`${msg} 다시 시도하시겠습니까?`, () => {
        setStep("email");
        startListening();
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const intro = async () => {
      await speakAndThen("로그인을 시작합니다. 이메일을 말씀해 주세요.", () => startListening());
    };
    intro();
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <ContainerHeader>로그인 (음성 모드)</ContainerHeader>
        <Status>
          <p><strong>현재 단계:</strong> {step}</p>
          <p><strong>이메일:</strong> {email || "-"}</p>
          <p><strong>비밀번호:</strong> {password ? "●●●●●●●●" : "-"}</p>
          {isSubmitting && <p>로그인 처리 중...</p>}
        </Status>
        <SignUpLink>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </SignUpLink>
      </Container>
    </>
  );
};

/* =========================
   수동(폼) 모드
   ========================= */
const LoginManualMode: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isButtonDisabled = email === "" || password === "";

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await login({ user_mail: email, password });
      const { access_token } = response;
      if (!access_token) throw new Error("access_token이 없습니다.");

      const payload = JSON.parse(atob(access_token.split(".")[1]));
      const { user_id, user_name } = payload;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user_id", user_id.toString());

      alert(`로그인 성공: ${user_name}`);
      navigate("/home");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const data: ErrorResponse = error.response.data;
        alert(`로그인 실패: ${data.detail || "서버 오류"}`);
      } else {
        alert("서버에 연결할 수 없습니다.");
      }
    }
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <ContainerHeader>로그인</ContainerHeader>
        <form onSubmit={handleLogin}>
          <InputWrapper>
            <Label htmlFor="email">이메일</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              autoComplete="email"
            />
          </InputWrapper>
          <InputWrapper>
            <Label htmlFor="password">비밀번호</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </InputWrapper>
          <Button type="submit" disabled={isButtonDisabled}>로그인</Button>
        </form>
        <SignUpLink>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </SignUpLink>
      </Container>
    </>
  );
};

/* ===== 스타일 (반응형 적용) ===== */
const ContainerHeader = styled.div`
  font-size: clamp(3vh, 3vh, 3vh);
  margin-bottom: 4vh;
  font-weight: 700;
`;

const Container = styled.div`
  padding: clamp(48px, 10vh, 96px) clamp(16px, 3vw, 24px) clamp(16px, 4vh, 32px);
  max-width: min(92vw, 520px);
  margin: 0 auto;
  box-sizing: border-box;

  h2 {
    margin: 0 0 clamp(12px, 2.4vh, 24px);
    font-size: clamp(18px, 2.8vh, 28px);
    line-height: 1.2;
    font-weight: 700;
    color: #111;
  }

  form {
    display: flex;
    flex-direction: column;
    row-gap: clamp(10px, 1.8vh, 16px);
  }

  @media (max-height: 600px) {
    padding-top: clamp(32px, 8vh, 56px);
  }
`;

const Status = styled.div`
  margin-top: 12px;
  padding: 12px;
  border: 1px dashed #ddd;
  border-radius: 8px;
  background: #fafafa;
  p { margin: 4px 0; }
`;

const InputWrapper = styled.div`
  margin: 0;
`;

const Label = styled.label`
  display: block;
  margin-bottom: clamp(6px, 1vh, 8px);
  font-weight: 700;
  color: #222;
  font-size: clamp(1.8vh, 1.8vh, 1.8vh);
`;

const Input = styled.input`
  width: 100%;
  padding: clamp(10px, 1.8vh, 14px) clamp(12px, 2vw, 16px);
  border-radius: clamp(6px, 1vh, 10px);
  border: 1px solid #c9cdd2;
  box-sizing: border-box;
  font-size: clamp(2vh, 2vh, 2vh);
  line-height: 1.4;
  background-color: #fff;

  &:hover { border-color: #adb5bd; }
  &:focus-visible {
    outline: none;
    border-color: #111;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: clamp(12px, 2.2vh, 16px);
  background-color: #000;
  color: #fff;
  border-radius: clamp(6px, 1vh, 10px);
  border: none;
  font-weight: 800;
  cursor: pointer;
  font-size: clamp(2.1vh, 2.1vh, 2.1vh);
  transition: background-color 0.25s ease, transform 0.06s ease;

  &:hover:not(:disabled) { background-color: #222; }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled {
    background-color: #e9ecef;
    color: #6c757d;
    cursor: not-allowed;
  }
`;

const SignUpLink = styled.p`
  text-align: center;
  margin-top: clamp(14px, 2.4vh, 20px);
  font-size: clamp(1.9vh, 1.9vh, 1.9vh);
  color: #444;

  a {
    color: #000;
    text-decoration: none;
    font-weight: 800;
    &:hover { text-decoration: underline; }
  }
`;
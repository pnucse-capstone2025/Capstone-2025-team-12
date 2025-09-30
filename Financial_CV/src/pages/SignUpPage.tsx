// src/pages/SignUpPage.tsx
import { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";
import { signUp } from "@/api";
import axios from "axios";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useVoicePref } from "@/store/useVoicePref";

interface ApiErrorDetail {
  msg?: string;
  message?: string;
  [key: string]: unknown;
}

const SignUpPage = () => {
  const { enabled } = useVoicePref();
  return enabled ? <SignUpVoiceMode /> : <SignUpManualMode />;
};

export default SignUpPage;

/* =========================
   음성(STT/TTS) 모드
   ========================= */
type Step = "name" | "email" | "password" | "confirm" | "done";

const SignUpVoiceMode = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("name");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const stepRef = useRef(step);
  const nameRef = useRef(name);
  const emailRef = useRef(email);
  const pwRef = useRef(password);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { nameRef.current = name; }, [name]);
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
        synth.onvoiceschanged = () => { if (ready()) synth.onvoiceschanged = null as any; };
        setTimeout(() => resolve(), 1500);
      } catch { resolve(); }
    });

  const pickKoreanVoice = () => {
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return voices.find(v => v.lang?.toLowerCase() === "ko-kr") || voices.find(v => v.lang?.toLowerCase().startsWith("ko")) || null;
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
    } catch { clearTimeout(timer); done(); }
  };

  const normalizeEmail = (raw: string) => {
    let t = raw.trim().toLowerCase().replace(/\s+/g, "");
    if (!t.includes("@")) t = `${t}@pusan.ac.kr`;
    t = t.replace("골뱅이", "@");
    t = t.replace(/@pusan\.ac\.kr.*/g, "@pusan.ac.kr");
    return t;
  };
  const isValidEmail = (e: string) => e.endsWith("@pusan.ac.kr") && /^[^\s@]+@pusan\.ac\.kr$/.test(e);
  const isValidPassword = (p: string) => p.length >= 8;

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { speakAndThen("이 브라우저에서는 음성 인식을 지원하지 않습니다."); return; }

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

      if (cur === "name") {
        setName(raw);
        setStep("email");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen(`이름은 ${raw} 입니다. 부산대학교 이메일을 말씀해 주세요.`, () => startListening());
      } else if (cur === "email") {
        const e = normalizeEmail(raw);
        if (!isValidEmail(e)) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("이메일 형식이 올바르지 않습니다. 다시 말씀해 주세요.", () => startListening());
          return;
        }
        setEmail(e);
        setStep("password");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen("비밀번호를 말씀해 주세요. 8자리 이상이어야 합니다.", () => startListening());
      } else if (cur === "password") {
        const p = raw.replace(/\s/g, "");
        if (!isValidPassword(p)) {
          active = false; try { rec.stop(); } catch {}
          await speakAndThen("비밀번호가 너무 짧습니다. 다시 말씀해 주세요.", () => startListening());
          return;
        }
        setPassword(p);
        setStep("confirm");
        active = false; try { rec.stop(); } catch {}
        await speakAndThen(`확인합니다. 이름 ${nameRef.current}, 이메일 ${emailRef.current}. 가입할까요?`, () => startListening());
      } else if (cur === "confirm") {
        const t = raw.replace(/\s+/g, "").toLowerCase();
        active = false; try { rec.stop(); } catch {}
        if (t.includes("가입")) {
          await doSignUp();
        } else if (t.includes("아니오") || t.includes("아니요")) {
          await speakAndThen("회원가입을 취소했습니다."); setStep("done");
        } else {
          await speakAndThen("회원가입 또는 아니오로만 대답해 주세요.", () => startListening());
        }
      }
    };

    rec.onerror = async () => {
      if (!active) return;
      await speakAndThen("음성을 인식하지 못했습니다. 다시 말씀해 주세요.", () => startListening());
    };

    rec.onend = () => {
      if (active) {
        const retry = () => {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) setTimeout(retry, 120);
          else { try { rec.start(); } catch {} }
        };
        retry();
      }
    };

    const tryStart = () => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) setTimeout(tryStart, 120);
      else { try { rec.start(); } catch {} }
    };
    tryStart();
  };

  const doSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const n = nameRef.current.trim();
    const e = emailRef.current.trim();
    const p = pwRef.current;

    if (!n || !isValidEmail(e) || !isValidPassword(p)) {
      setIsSubmitting(false);
      await speakAndThen("입력 정보가 부족하거나 올바르지 않습니다. 처음부터 다시 시도해 주세요.");
      setStep("name");
      startListening();
      return;
    }

    try {
      await signUp({ user_name: n, user_mail: e, password: p });
      await speakAndThen("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      navigate("/login");
    } catch (error: unknown) {
      let msg = "서버에 연결할 수 없습니다.";
      if (axios.isAxiosError(error) && error.response) {
        if (Array.isArray(error.response.data.detail)) {
          const errorMessages = error.response.data.detail.map(
            (err: ApiErrorDetail) => err.msg || err.message || JSON.stringify(err)
          ).join(". ");
          msg = `회원가입 실패. ${errorMessages}`;
        } else {
          msg = `회원가입 실패: ${error.response.data.detail || "서버 오류"}`;
        }
      }
      await speakAndThen(`${msg} 다시 시도하시겠습니까?`, () => { setStep("confirm"); startListening(); });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    speakAndThen("회원가입을 시작합니다. 이름을 말씀해 주세요.", () => startListening());

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <h2>회원가입 (음성 모드)</h2>
        <Status>
          <p><strong>현재 단계:</strong> {step}</p>
          <p><strong>이름:</strong> {name || "-"}</p>
          <p><strong>이메일:</strong> {email || "-"}</p>
          <p><strong>비밀번호:</strong> {password ? "●●●●●●●●" : "-"}</p>
          {isSubmitting && <p>가입 처리 중...</p>}
        </Status>
      </Container>
    </>
  );
};

/* =========================
   수동(기존 폼) 모드 + 반응형 스타일
   ========================= */
const SignUpManualMode = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ name: "", email: "", password: "" });
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const validateForm = () => {
      const newErrors = { name: "", email: "", password: "" };
      let isValid = true;
      if (name.length < 1) { newErrors.name = "이름을 입력해주세요."; isValid = false; }
      if (!email.endsWith("@pusan.ac.kr")) { newErrors.email = "@pusan.ac.kr 이메일 형식으로 입력해주세요."; isValid = false; }
      if (password.length < 8) { newErrors.password = "비밀번호는 8자리 이상이어야 합니다."; isValid = false; }
      setErrors(newErrors); return isValid;
    };
    setIsFormValid(validateForm());
  }, [name, email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      await signUp({ user_name: name, user_mail: email, password });
      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        if (Array.isArray(error.response.data.detail)) {
          const errorMessages = error.response.data.detail.map(
            (err: ApiErrorDetail) => err.msg || err.message || JSON.stringify(err)
          ).join("\n");
          alert(`회원가입 실패:\n${errorMessages}`);
        } else {
          alert(`회원가입 실패: ${error.response.data.detail || "서버 오류"}`);
        }
      } else {
        alert("서버에 연결할 수 없습니다.");
      }
    }
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <h2>회원가입</h2>
        <form onSubmit={handleSubmit} noValidate>
          <InputWrapper>
            <Label htmlFor="name">이름</Label>
            <Input id="name" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} autoComplete="name" />
            {errors.name && <ErrorMessage id="name-error">{errors.name}</ErrorMessage>}
          </InputWrapper>

          <InputWrapper>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" placeholder="부산대학교 이메일 (@pusan.ac.kr)" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <ErrorMessage id="email-error">{errors.email}</ErrorMessage>}
          </InputWrapper>

          <InputWrapper>
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" placeholder="비밀번호 (8자리 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
            {errors.password && <ErrorMessage id="password-error">{errors.password}</ErrorMessage>}
          </InputWrapper>

          <Button type="submit" disabled={!isFormValid}>회원가입</Button>
        </form>
      </Container>
    </>
  );
};

/* =========================
   반응형 스타일
   ========================= */
const Container = styled.div`
  padding: clamp(10vh, 10vh, 10vh) clamp(3vw, 3vw, 3vw) clamp(4vh, 4vh, 4vh);
  max-width: min(92vw, 500px);
  margin: 0 auto;
  box-sizing: border-box;

  h2 {
    margin: 0 0 clamp(2.4vh, 2.4vh, 2.4vh);
    font-size: clamp(2.8vh, 2.8vh, 2.8vh);
    line-height: 1.2;
    font-weight: 700;
    color: #111;
  }

  form {
    display: flex;
    flex-direction: column;
    row-gap: clamp(1.8vh, 1.8vh, 1.8vh);
  }

  @media (max-height: 600px) {
    padding-top: clamp(8vh, 8vh, 8vh);
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
  margin-bottom: clamp(1vh, 1vh, 1vh);
  font-weight: 700;
  color: #222;
  font-size: clamp(1.8vh, 1.8vh, 1.8vh);
`;

const Input = styled.input`
  width: 100%;
  padding: clamp(1.8vh, 1.8vh, 1.8vh) clamp(2vw, 2vw, 2vw);
  border-radius: clamp(1vh, 1vh, 1vh);
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
  padding: clamp(2.2vh, 2.2vh, 2.2vh);
  background-color: #000;
  color: #fff;
  border-radius: clamp(1vh, 1vh, 1vh);
  border: none;
  font-weight: 800;
  cursor: pointer;
  font-size: clamp(2.1vh, 2.1vh, 2.1vh);
  transition: background-color 0.25s ease, transform 0.06s ease;

  &:hover:not(:disabled) { background-color: #222; }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { background-color: #e9ecef; color: #6c757d; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const ErrorMessage = styled.p`
  color: #e03131;
  font-size: clamp(1.6vh, 1.6vh, 1.6vh);
  margin-top: clamp(0.6vh, 0.6vh, 0.6vh);
  line-height: 1.3;
`;

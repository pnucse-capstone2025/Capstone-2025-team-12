/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "@/components/NavigationBar";
import PageWrapper from "@/components/PageWrapper";
import imgPath from "@/assets/eyes_open_nobg.png";
import { useVoicePref } from "@/store/useVoicePref";

const Title = styled.h2`
  margin: 0 0 clamp(2vh, 3.2vh, 4vh) 0;
  font-size: clamp(3.5vh, 3.5vh, 3.5vh);
  line-height: 1.2;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(1.6vh, 2vh, 2.4vh);
`;

const UploadButton = styled.button`
  padding: clamp(1.6vh, 2.2vh, 2.8vh) clamp(2vh, 2.6vh, 3.2vh);
  font-size: clamp(2vh, 2vh, 2vh);
  border-radius: clamp(1vh, 1.4vh, 1.8vh);
  border: 0.25vh solid #d1d1d6;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.06s ease;
  text-align: center;

  &:hover { background-color: #eaeaea; }
  &:active { transform: translateY(0.3vh); }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const PreviewWrap = styled.div`
  margin-top: clamp(2.4vh, 3.2vh, 4vh);
  text-align: center;
`;

const PreviewImage = styled.img`
  width: 100%;
  max-width: 60vh;
  border-radius: clamp(1vh, 1.4vh, 1.8vh);
  display: block;
  margin: 0 auto;
`;

// ============================
// Camera Page
// ============================
const CameraPage = () => {
  const { enabled } = useVoicePref();
  return enabled ? <CameraVoiceMode /> : <CameraManualMode />;
};

export default CameraPage;

/* ============================
   음성 모드
============================ */
const CameraVoiceMode = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);

  // --- 보이스 유틸
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
    const SAFETY_MS = 4000;
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

  // --- 파일 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterDocument = () => {
    if (!imagePreview) {
      alert("사진을 먼저 등록해주세요!");
      return;
    }
    console.log("서류 등록 처리 중...");
  };

  // --- 음성 인식 루프
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

    rec.onresult = async (event: any) => {
      const raw = (event?.results?.[0]?.[0]?.transcript ?? "").trim();
      const low = raw.replace(/\s+/g, "").toLowerCase();
      if (!raw) return;

      if (low.includes("사진") || low.includes("촬영")) {
        await speakAndThen("사진 촬영을 시작합니다.", () => {
          inputRef.current?.click();
        });
        return;
      }
      if (low.includes("업로드")) {
        await speakAndThen("서류 업로드 페이지로 이동합니다.", () => {
          navigate("/document-scan");
        });
        return;
      }
      if (low.includes("직접") || low.includes("등록")) {
        await speakAndThen("직접 등록 페이지로 이동합니다.", () => {
          navigate("/manual-register");
        });
        return;
      }

      await speakAndThen(
        "이해하지 못했습니다. 사진 촬영하기, 서류 업로드하기, 직접 등록하기 중에서 말씀해 주세요.",
        () => startListening()
      );
    };

    rec.onerror = async () => {
      await speakAndThen("음성을 인식하지 못했습니다.", () => startListening());
    };

    rec.onend = () => {
      if (!window.speechSynthesis.speaking) {
        try { rec.start(); } catch {}
      }
    };

    try { rec.start(); } catch {}
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const intro = async () => {
      await speakAndThen("서류 등록 페이지입니다. 사진 촬영하기, 서류 업로드하기, 직접 등록하기 중 하나를 말씀해 주세요.", () => startListening());
    };
    intro();

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <PageWrapper>
        <Title>📂 서류 등록 (음성 모드)</Title>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />

        <ButtonGroup>
          <UploadButton onClick={() => navigate("/document-scan")}>🖼️ 서류 업로드하기</UploadButton>
          <UploadButton onClick={() => inputRef.current?.click()}>📷 사진 촬영하기</UploadButton>
          <UploadButton onClick={() => navigate("/manual-register")}>✍️ 직접 등록하기</UploadButton>
        </ButtonGroup>

        {imagePreview && (
          <PreviewWrap>
            <PreviewImage src={imagePreview} alt="미리보기" />
            <UploadButton
              onClick={handleRegisterDocument}
              css={css`margin-top: clamp(2vh, 2.6vh, 3.2vh); width: 100%; max-width: 60vh;`}
            >
              📄 서류 등록하기
            </UploadButton>
          </PreviewWrap>
        )}
      </PageWrapper>
    </>
  );
};

/* ============================
   수동 모드
============================ */
const CameraManualMode = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterDocument = () => {
    if (!imagePreview) {
      alert("사진을 먼저 등록해주세요!");
      return;
    }
    console.log("서류 등록 처리 중...");
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <PageWrapper>
        <Title>📂 서류 등록</Title>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />

        <ButtonGroup>
          <UploadButton onClick={() => navigate("/document-scan")}>🖼️ 서류 업로드하기</UploadButton>
          <UploadButton onClick={() => inputRef.current?.click()}>📷 사진 촬영하기</UploadButton>
          <UploadButton onClick={() => navigate("/manual-register")}>✍️ 직접 등록하기</UploadButton>
        </ButtonGroup>

        {imagePreview && (
          <PreviewWrap>
            <PreviewImage src={imagePreview} alt="미리보기" />
            <UploadButton
              onClick={handleRegisterDocument}
              css={css`margin-top: clamp(2vh, 2.6vh, 3.2vh); width: 100%; max-width: 60vh;`}
            >
              📄 서류 등록하기
            </UploadButton>
          </PreviewWrap>
        )}
      </PageWrapper>
    </>
  );
};

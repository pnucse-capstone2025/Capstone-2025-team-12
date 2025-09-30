// src/pages/DocumentList.tsx
// 서류보관함 페이지 (음성 모드 / 버튼 모드 분기)

import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useDocumentStore } from "@/store/useDocumentStore";
import { CATEGORY_MAP } from "@/data/categories";
import { useVoicePref } from "@/store/useVoicePref";

/* =========================
   고정 카테고리
   ========================= */
const ALLOWED_CATEGORIES = [
  "정기구독 및 납부",
  "송장 및 세금계산서",
  "이체 및 송금 전표",
  "은행 거래내역서",
  "카드명세서",
] as const;

/* =========================
   공통 유틸
   ========================= */
function useUserIdAndFetch() {
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);

  useEffect(() => {
    const userIdString = localStorage.getItem("user_id");
    if (userIdString) {
      const userId = parseInt(userIdString, 10);
      if (!isNaN(userId)) {
        fetchDocuments(userId);
      }
    } else {
      console.error("User ID not found, cannot fetch documents.");
    }
  }, [fetchDocuments]);
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
    const SAFETY_MS = 3000;
    const timer = setTimeout(done, SAFETY_MS);

    try {
      await awaitVoices();
      try {
        window.speechSynthesis.resume();
      } catch {}
      await new Promise((r) => setTimeout(r, 120));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      const v = pickKoreanVoice();
      if (v) u.voice = v;
      u.onend = () => {
        clearTimeout(timer);
        setTimeout(done, 80);
      };
      try {
        window.speechSynthesis.cancel();
      } catch {}
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
const DocumentList = () => {
  const { enabled } = useVoicePref();
  return enabled ? <DocumentListVoiceMode /> : <DocumentListManualMode />;
};

export default DocumentList;

/* =========================
   음성 모드
   ========================= */
const DocumentListVoiceMode = () => {
  useUserIdAndFetch();
  const navigate = useNavigate();
  const { speakAndThen } = useSpeechUtils();

  // CATEGORY_MAP에 실제 존재하는 항목만 노출
  const categories = useMemo(
    () => ALLOWED_CATEGORIES.filter((c) => Object.prototype.hasOwnProperty.call(CATEGORY_MAP, c)),
    []
  );

  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);
  const activeRef = useRef(false);

  // 안내 멘트
  const buildPrompt = (cats: string[]) => {
    const head = "서류 보관함입니다. 이동할 분류명을 말씀해 주세요.";
    const list = cats.length > 0 ? `가능한 분류는 ${cats.join(", ")} 입니다.` : "";
    const tail = "목록 다시 말해줘 또는 뒤로 가기 명령도 가능합니다.";
    return [head, list, tail].filter(Boolean).join(" ");
  };

  // 정규화
  const norm = (s: string) =>
    s
      .replace(/\s+/g, "")
      .replace(/폴더$/, "")
      .replace(/서류$/, "")
      .toLowerCase();

  // 간단한 동의어/축약 매핑
  const ALIAS_MAP: Record<string, string> = {
    // 정기구독 및 납부
    "정기구독": "정기구독 및 납부",
    "정기결제": "정기구독 및 납부",
    "구독": "정기구독 및 납부",
    "납부": "정기구독 및 납부",

    // 송장 및 세금계산서
    "송장": "송장 및 세금계산서",
    "세금계산서": "송장 및 세금계산서",
    "인보이스": "송장 및 세금계산서",

    // 이체 및 송금 전표
    "이체전표": "이체 및 송금 전표",
    "송금전표": "이체 및 송금 전표",
    "이체": "이체 및 송금 전표",
    "송금": "이체 및 송금 전표",
    "전표": "이체 및 송금 전표",

    // 은행 거래내역서
    "은행거래내역서": "은행 거래내역서",
    "거래내역서": "은행 거래내역서",
    "은행내역": "은행 거래내역서",
    "계좌내역": "은행 거래내역서",

    // 카드명세서
    "카드내역": "카드명세서",
    "카드명세": "카드명세서",
    "카드사용내역": "카드명세서",
  };

  const matchCategory = (spoken: string) => {
    const raw = norm(spoken);

    // 번호로 선택
    const numMap: Record<string, number> = {
      첫번째: 1, 두번째: 2, 세번째: 3, 네번째: 4, 다섯번째: 5,
      "1번": 1, "2번": 2, "3번": 3, "4번": 4, "5번": 5,
    };
    if (raw in numMap) {
      const idx = numMap[raw] - 1;
      if (idx >= 0 && idx < categories.length) return categories[idx];
    }

    // 동의어 축약어 매핑
    for (const [aliasRaw, target] of Object.entries(ALIAS_MAP)) {
      if (raw === norm(aliasRaw)) return target;
      if (raw.includes(norm(aliasRaw))) return target;
    }

    // 완전일치
    const hit = categories.find((c) => norm(c) === raw);
    if (hit) return hit;

    // 부분포함
    const contains = categories.find((c) => norm(c).includes(raw) || raw.includes(norm(c)));
    if (contains) return contains;

    return null;
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speakAndThen("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {}
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

      if (t.includes("목록다시") || t.includes("다시목록")) {
        localActive = false;
        activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakAndThen(buildPrompt(categories), () => startListening());
        return;
      }
      if (t.includes("뒤로가기") || t.includes("이전화면") || t.includes("뒤로가")) {
        localActive = false;
        activeRef.current = false;
        try { rec.stop(); } catch {}
        navigate(-1);
        return;
      }

      const cat = matchCategory(said);
      if (!cat) {
        localActive = false;
        activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakAndThen("해당 분류를 찾지 못했습니다. 다시 말씀해 주세요.", () => startListening());
        return;
      }

      localActive = false;
      activeRef.current = false;
      try { rec.stop(); } catch {}
      await speakAndThen(`${cat}로 이동합니다.`, () => {
        navigate(`/documents/category/${cat}`);
      });
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
    if (startedRef.current) return;
    startedRef.current = true;

    speakAndThen(buildPrompt(categories), () => startListening());

    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <Title>서류 보관함 (음성 모드)</Title>
        <Grid>
          {categories.map((category, idx) => (
            <FolderCard key={category} onClick={() => navigate(`/documents/category/${category}`)} tabIndex={0}>
              <FolderIcon>📁</FolderIcon>
              <FolderName>
                {category} <OrderHint>{idx + 1}번</OrderHint>
              </FolderName>
            </FolderCard>
          ))}
        </Grid>

        <Status>
          <p>분류명을 말하면 해당 폴더로 이동합니다.</p>
          <p>목록 다시, 뒤로 가기 음성 명령을 지원합니다.</p>
          <p>마우스나 키보드로도 선택할 수 있습니다.</p>
        </Status>
      </Container>
    </>
  );
};

/* =========================
   버튼 모드(수동)
   ========================= */
const DocumentListManualMode = () => {
  useUserIdAndFetch();
  const navigate = useNavigate();
  const categories = useMemo(
    () => ALLOWED_CATEGORIES.filter((c) => Object.prototype.hasOwnProperty.call(CATEGORY_MAP, c)),
    []
  );

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <Title>서류 보관함</Title>
        <Grid>
          {categories.map((category) => (
            <FolderCard key={category} onClick={() => navigate(`/documents/category/${category}`)} tabIndex={0}>
              <FolderIcon>📁</FolderIcon>
              <FolderName>{category}</FolderName>
            </FolderCard>
          ))}
        </Grid>
      </Container>
    </>
  );
};

/* =========================
   스타일
   ========================= */
const Container = styled.div`
  padding: clamp(2.4vh, 3.2vh, 4vh) clamp(2vh, 2.8vh, 3.6vh) clamp(2vh, 2.6vh, 3.2vh);
  max-width: 120vh;
  margin: 0 auto;
  box-sizing: border-box;
`;

const Title = styled.h2`
  font-size: clamp(3vh, 3vh, 3vh);
  font-weight: 600;
  margin: 0 0 clamp(1.6vh, 2vh, 2.4vh) 0;
  line-height: 1.2;
  color: #111;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(17vh, 17vh, 17vh), 1fr));
  gap: clamp(1.2vh, 1.8vh, 2.4vh);
`;

const FolderCard = styled.div`
  background: #f2f2f7;
  border-radius: clamp(1.2vh, 1.6vh, 2vh);
  padding: clamp(2vh, 2.6vh, 3.2vh) clamp(1.4vh, 1.8vh, 2.2vh);
  text-align: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.06s ease;
  outline: none;

  &:hover {
    background: #e1e1e6;
  }
  &:active {
    transform: translateY(0.2vh);
  }
  &:focus-visible {
    box-shadow: 0 0 0 0.6vh rgba(0, 0, 0, 0.08);
  }
`;

const FolderIcon = styled.div`
  font-size: clamp(5vh, 5vh, 5vh);
  margin-bottom: clamp(0.8vh, 1vh, 1.2vh);
  line-height: 1;
`;

const FolderName = styled.div`
  font-size: clamp(1.9vh, 1.9vh, 1.9vh);
  font-weight: 700;
  color: #222;
  word-break: keep-all;
`;

const OrderHint = styled.span`
  display: inline-block;
  font-weight: 600;
  font-size: clamp(1.5vh, 1.5vh, 1.5vh);
  color: #6b7280;
  margin-left: 0.4em;
`;

const Status = styled.div`
  margin-top: 16px;
  padding: 12px;
  border: 1px dashed #ddd;
  border-radius: 8px;
  background: #fafafa;
  p {
    margin: 4px 0;
  }
`;

// src/pages/DocumentCategoryPage.tsx
// DocumentCard는 수정하지 않음.
// 변경점: 송금 트리거는 오직 "[제목] 송금"만 허용. (번호 기반 명령 제거)

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useDocumentStore, Document } from "@/store/useDocumentStore";
import DocumentCard from "@/components/DocumentCard";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { CATEGORY_MAP } from "@/data/categories";
import { useVoicePref } from "@/store/useVoicePref";

/* =========================
   문서 필터
   ========================= */
function useCategoryFilteredDocs(category: string) {
  const allDocuments = useDocumentStore((s) => s.documents);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  const filterDocuments = () => {
    const classificationId = CATEGORY_MAP[category];
    if (classificationId === undefined) {
      setFilteredDocuments([]);
      return;
    }
    setFilteredDocuments(
      allDocuments.filter((doc) => doc.document_classification_id === classificationId)
    );
  };

  useEffect(() => {
    filterDocuments();
  }, [category, allDocuments]);

  return { filteredDocuments, filterDocuments };
}

/* =========================
   STT/TTS 유틸
   ========================= */
function useSpeechUtils() {
  const awaitVoices = () =>
    new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis;
        const ready = () => synth.getVoices().length > 0;
        if (ready()) return resolve();
        const handler = () => {
          if (ready()) {
            synth.onvoiceschanged = null as any;
            resolve();
          }
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

  const speakQueue = async (parts: string[], then?: () => void) => {
    let cancelled = false;

    const runOne = (text: string) =>
      new Promise<void>(async (resolve) => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        const SAFETY_MS = 4500;
        const timer = setTimeout(done, SAFETY_MS);

        try {
          await awaitVoices();
          try { window.speechSynthesis.resume(); } catch {}
          await new Promise((r) => setTimeout(r, 80));

          const u = new SpeechSynthesisUtterance(text);
          u.lang = "ko-KR";
          const v = pickKoreanVoice();
          if (v) u.voice = v;
          u.onend = () => { clearTimeout(timer); setTimeout(done, 60); };

          try { window.speechSynthesis.cancel(); } catch {}
          if (!cancelled) window.speechSynthesis.speak(u);
          else { clearTimeout(timer); done(); }
        } catch {
          done();
        }
      });

    for (const t of parts) {
      if (cancelled) break;
      await runOne(t);
    }
    if (!cancelled) { try { then?.(); } catch {} }
    return () => { cancelled = true; try { window.speechSynthesis.cancel(); } catch {} };
  };

  const speakOnce = (text: string, then?: () => void) => speakQueue([text], then);

  return { speakQueue, speakOnce };
}

/* =========================
   제목 정규화
   ========================= */
const getTitle = (d: any) =>
  String(d?.document_title ?? "")
    .replace(/\u200B/g, "")
    .trim();

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/* =========================
   메인
   ========================= */
const DocumentCategoryPage = () => {
  const { enabled } = useVoicePref();
  return enabled ? <VoiceModePage /> : <ManualModePage />;
};

export default DocumentCategoryPage;

/* =========================
   음성 모드: [제목] 송금만 지원
   ========================= */
const VoiceModePage = () => {
  const { category = "" } = useParams<{ category: string }>();
  const { filteredDocuments, filterDocuments } = useCategoryFilteredDocs(category);
  const navigate = useNavigate();
  const { speakQueue, speakOnce } = useSpeechUtils();

  const recognitionRef = useRef<any>(null);
  const startedRef = useRef(false);
  const activeRef = useRef(false);

  // 제목이 실제 준비된 문서 수
  const readyTitles = useMemo(
    () => filteredDocuments.map(getTitle).filter(Boolean),
    [filteredDocuments]
  );

  const countText = `${filteredDocuments.length}건`;

  const introText = () =>
    `카테고리 ${category}. 문서 ${countText}. 제목을 순서대로 읽겠습니다. 송금하려면 "제목 송금"처럼 말씀해 주세요. 예: 넷플릭스 구독 송금. 번호는 사용하지 않습니다. "제목 읽어줘"로 다시 들을 수 있습니다.`;

  // 제목 낭독(2~3개씩 끊어서)
  const titleLines = useMemo(() => {
    const lines: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < filteredDocuments.length; i += chunkSize) {
      const chunk = filteredDocuments
        .slice(i, i + chunkSize)
        .map((d, idx) => {
          const n = i + idx + 1;
          const title = getTitle(d) || "제목 없음";
          const money =
            typeof d.document_balance === "number"
              ? d.document_balance.toLocaleString("ko-KR")
              : String(d.document_balance ?? "");
          return `${n}번, ${title}${money ? `, 금액 ${money}원` : ""}`;
        })
        .join(". ");
      lines.push(chunk);
    }
    if (lines.length === 0) lines.push("표시할 문서가 없습니다.");
    return lines;
  }, [filteredDocuments]);

  const goTransfer = (d: Document) => {
    navigate("/direct-transfer", {
      state: {
        recipientBank: d.document_bank,
        recipientAccount: d.document_account_number,
        transferAmount: d.document_balance,
      },
    });
  };

  // [제목] 송금
  const handleTitleTransfer = async (said: string) => {
    const t = normalize(said);
    if (!t.includes("송금")) return false;

    // '...송금' 앞의 키워드 추출
    const keyword = t.replace(/송금.*$/, "").trim();
    if (!keyword) return false;

    // 제목 포함 매칭
    const matches = filteredDocuments.filter((d) =>
      normalize(getTitle(d)).includes(keyword)
    );

    if (matches.length === 1) {
      await speakOnce(`해당 제목으로 송금 페이지로 이동합니다.`);
      goTransfer(matches[0]);
      return true;
    }
    if (matches.length > 1) {
      await speakOnce(`같은 제목이 여러 개 있습니다. 더 구체적으로 말씀해 주세요.`);
      return true;
    }
    await speakOnce(`해당 제목의 문서를 찾지 못했습니다. 다시 말씀해 주세요.`);
    return true;
  };

  // 스크롤
  const scrollByVh = (vh: number) => {
    const px = (vh / 100) * window.innerHeight;
    window.scrollBy({ top: px, behavior: "smooth" });
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { speakOnce("이 브라우저에서는 음성 인식을 지원하지 않습니다."); return; }

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

      const t = normalize(said);

      // 재낭독
      if (t.includes("제목읽어줘") || t.includes("목록읽어줘") || t.includes("다시읽어줘")) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        await speakOnce("제목을 다시 읽겠습니다.", () => {
          speakQueue(titleLines, () => startListening());
        });
        return;
      }

      // 새로고침
      if (t.includes("새로고침") || t.includes("리프레시")) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        filterDocuments();
        await speakOnce(`목록을 새로고침했습니다. 현재 ${countText} 입니다.`, () => {
          speakQueue(titleLines, () => startListening());
        });
        return;
      }

      // 뒤로가기
      if (t.includes("뒤로가기") || t.includes("이전화면") || t.includes("뒤로가")) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        window.history.back();
        return;
      }

      // 스크롤
      if (t.includes("아래로") || t.includes("내려")) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        scrollByVh(70);
        await speakOnce("아래로 이동했습니다.", () => startListening());
        return;
      }
      if (t.includes("위로") || t.includes("올려")) {
        localActive = false; activeRef.current = false;
        try { rec.stop(); } catch {}
        scrollByVh(-70);
        await speakOnce("위로 이동했습니다.", () => startListening());
        return;
      }

      // [제목] 송금만 처리
      const handled = await handleTitleTransfer(said);
      if (handled) return;

      // 기타
      localActive = false; activeRef.current = false;
      try { rec.stop(); } catch {}
      await speakOnce(
        "이해하지 못했습니다. 예: 넷플릭스 구독 송금, 또는 제목 읽어줘.",
        () => startListening()
      );
    };

    rec.onerror = async () => {
      if (!localActive || !activeRef.current) return;
      await speakOnce("음성을 인식하지 못했습니다. 다시 말씀해 주세요.", () => startListening());
    };

    rec.onend = () => {
      if (localActive && activeRef.current) {
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

  // 제목 준비 후에만 TTS 시작
  useEffect(() => {
    if (startedRef.current) return;
    if (readyTitles.length === 0) return;

    startedRef.current = true;

    speakQueue([introText()], () => {
      speakQueue(titleLines, () => startListening());
    });

    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyTitles.length, category]);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <Header>
          <Title>{category} (음성 모드)</Title>
          <RefreshButton onClick={() => { filterDocuments(); }}>
            새로고침
          </RefreshButton>
        </Header>

        {filteredDocuments.length === 0 ? (
          <EmptyMessage>표시할 서류가 없습니다.</EmptyMessage>
        ) : (
          <DocumentGrid>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.document_id} {...doc} />
            ))}
          </DocumentGrid>
        )}

        <Hint>음성 예시: “넷플릭스 구독 송금”, “제목 읽어줘”</Hint>
      </Container>
    </>
  );
};

/* =========================
   수동 모드
   ========================= */
const ManualModePage = () => {
  const { category = "" } = useParams<{ category: string }>();
  const { filteredDocuments, filterDocuments } = useCategoryFilteredDocs(category);

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <Container>
        <Header>
          <Title>{category}</Title>
          <RefreshButton onClick={filterDocuments}>새로고침</RefreshButton>
        </Header>

        {filteredDocuments.length === 0 ? (
          <EmptyMessage>표시할 서류가 없습니다.</EmptyMessage>
        ) : (
          <DocumentGrid>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.document_id} {...doc} />
            ))}
          </DocumentGrid>
        )}
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
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(1.6vh, 2vh, 2.4vh);
  gap: 1vh;
`;

const Title = styled.h2`
  font-size: clamp(3.5vh, 3.5vh, 3.5vh);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: #111;
  word-break: keep-all;
`;

const RefreshButton = styled.button`
  background-color: #f2f2f7;
  border: 0.25vh solid #e1e1e6;
  color: #333;
  padding: clamp(0.9vh, 1.2vh, 1.5vh) clamp(1.2vh, 1.6vh, 2vh);
  border-radius: clamp(0.8vh, 1.2vh, 1.6vh);
  cursor: pointer;
  font-size: clamp(1.6vh, 1.6vh, 1.6vh);
  transition: background 0.2s ease, transform 0.06s ease;

  &:hover { background-color: #e1e1e6; }
  &:active { transform: translateY(0.2vh); }
`;

const DocumentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(28vh, 32vh, 36vh), 1fr));
  gap: clamp(1.2vh, 1.8vh, 2.4vh);
`;

const EmptyMessage = styled.p`
  color: #888;
  padding: clamp(1.6vh, 2vh, 2.4vh);
  text-align: center;
  font-size: clamp(1.6vh, 1.9vh, 2.2vh);
`;

const Hint = styled.p`
  margin-top: 10px;
  font-size: clamp(1.5vh, 1.7vh, 1.9vh);
  color: #6b7280;
`;

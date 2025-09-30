// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

export default function DocumentScanAccessible(): JSX.Element {
  // ===== Refs & State =====
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState("카메라 준비중...");
  const [ocrText, setOcrText] = useState("");
  const [isListening, setIsListening] = useState(false);

  // 촬영 후 화면 정지(Freeze) 제어
  const [freezePreview, setFreezePreview] = useState(false);

  // 마지막 캡처 이미지 dataURL (프리뷰 용)
  const lastShotDataUrlRef = useRef<string>("");

  // ===== 백엔드 연결 =====
  const API_BASE = "";
  const OCR_PREVIEW_ENDPOINT = `/ocr/ingest-preview`;
  const OCR_CREATE_ENDPOINT  = `/ocr/ingest-create`;
  const DEFAULT_MODEL = "gpt-4o-mini";
  const DEFAULT_USER_ID = 1;

  // ===== axios =====
  const api = axios.create({
    timeout: 15000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  // ===== user_id 헬퍼 =====
  const getUserId = useCallback(() => {
    try {
      const raw = localStorage.getItem("user_id");
      if (!raw) return DEFAULT_USER_ID;
      let val: any = raw;
      try { val = JSON.parse(raw); } catch {}
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_USER_ID;
    } catch {
      return DEFAULT_USER_ID;
    }
  }, []);

  // ===== TTS (중복/중첩 억제 + 순차 읽기) =====
  const lastSpeakRef = useRef(0);
  const speakLockUntilRef = useRef(0);
  const lastMsgKeyRef = useRef("");

  const SPEAK_MIN_GAP = 1200;
  const SPEAK_COOLDOWN_MS = 1000;

  const speakIfNeeded = useCallback((msgKey: string, text: string) => {
    try {
      const now = performance.now();
      if (now < speakLockUntilRef.current) return;
      if (msgKey === lastMsgKeyRef.current && now - lastSpeakRef.current < SPEAK_MIN_GAP) return;
      if (now - lastSpeakRef.current < SPEAK_MIN_GAP) return;
      if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) return;

      lastMsgKeyRef.current = msgKey;
      lastSpeakRef.current = now;
      speakLockUntilRef.current = now + SPEAK_COOLDOWN_MS;

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, []);

  const speakAndThen = useCallback((text: string, then?: () => void) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.95;
      u.onend = () => setTimeout(() => then?.(), 200);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      then?.();
    }
  }, []);

  // ===== STT =====
  const currentRecRef = useRef<any>(null);
  const listeningCancelRef = useRef(false);

  const stopListening = useCallback(() => {
    try {
      listeningCancelRef.current = true;
      if (currentRecRef.current) {
        try { currentRecRef.current.onend = null; } catch {}
        try { currentRecRef.current.stop(); } catch {}
      }
    } catch {}
    setIsListening(false);
  }, []);

  const startYesNoListening = useCallback((
    onDone: (ans: "yes" | "no" | "unknown", transcript?: string) => void
  ) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { onDone("unknown"); return; }

    try {
      const rec = new SR();
      currentRecRef.current = rec;
      listeningCancelRef.current = false;

      rec.lang = "ko-KR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = true;

      let finished = false;

      const finish = (ans: "yes" | "no" | "unknown", transcript?: string) => {
        if (finished) return;
        finished = true;
        listeningCancelRef.current = true;
        try { rec.stop(); } catch {}
        setIsListening(false);
        onDone(ans, transcript);
      };

      const YES = ["네","예","맞아","맞아요","맞습니다","그래","좋아","오케이","ok","okay","yes","정확해","맞다"];
      const NO  = ["아니","아니야","아니요","아니오","틀려","틀렸어","다시","재촬영","no","노"];

      const isIn = (arr: string[], t: string, norm: string) =>
        arr.some(w => norm.includes(w) || t.includes(w));

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r.isFinal) continue;
          const t = (r[0]?.transcript || "").trim();
          const norm = t.toLowerCase();
          if (isIn(YES, t, norm)) return finish("yes", t);
          if (isIn(NO,  t, norm)) return finish("no",  t);
        }
      };

      rec.onerror = (ev: any) => {
        if (finished || listeningCancelRef.current) return;
        const err = ev?.error || "";
        const recoverable = new Set(["no-speech","aborted","network","audio-capture"]);
        if (recoverable.has(err)) {
          try { rec.stop(); } catch {}
          setTimeout(() => {
            if (!finished && !listeningCancelRef.current) {
              try { rec.start(); } catch {}
            }
          }, 250);
        } else {
          finish("unknown");
        }
      };

      rec.onend = () => {
        if (!finished && !listeningCancelRef.current) {
          try { rec.start(); } catch {}
        }
      };

      setIsListening(true);
      rec.start();
    } catch {
      onDone("unknown");
    }
  }, []);

  // ===== OpenCV 유틸 =====
  const matsRef = useRef<any>({ gray: null, edges: null, contours: null, hierarchy: null, approx: null });
  const ensureMats = useCallback(() => {
    const cv = (window as any).cv;
    const m = matsRef.current;
    if (!m.gray) m.gray = new cv.Mat();
    if (!m.edges) m.edges = new cv.Mat();
    if (!m.contours) m.contours = new cv.MatVector();
    if (!m.hierarchy) m.hierarchy = new cv.Mat();
    if (!m.approx) m.approx = new cv.Mat();
    return m;
  }, []);

  const orderQuad = (pts: Array<{x:number;y:number}>) => {
    const y = [...pts].sort((a, b) => a.y - b.y);
    const top = [y[0], y[1]].sort((a, b) => a.x - b.x);
    const bottom = [y[2], y[3]].sort((a, b) => a.x - b.x);
    return [top[0], top[1], bottom[1], bottom[0]];
  };

  const isConvexQuad = (pts: Array<{x:number;y:number}>) => {
    const cross = (a:any,b:any,c:any) => {
      const abx = b.x - a.x, aby = b.y - a.y;
      const bcx = c.x - b.x, bcy = c.y - b.y;
      return abx * bcy - aby * bcx;
    };
    const s0 = Math.sign(cross(pts[0], pts[1], pts[2]));
    const s1 = Math.sign(cross(pts[1], pts[2], pts[3]));
    const s2 = Math.sign(cross(pts[2], pts[3], pts[0]));
    const s3 = Math.sign(cross(pts[3], pts[0], pts[1]));
    const allPos = s0>0 && s1>0 && s2>0 && s3>0;
    const allNeg = s0<0 && s1<0 && s2<0 && s3<0;
    return allPos || allNeg;
  };

  const angleDeg = (p:any,q:any,r:any) => {
    const ux = p.x - q.x, uy = p.y - q.y;
    const vx = r.x - q.x, vy = r.y - q.y;
    const du = Math.hypot(ux,uy) || 1, dv = Math.hypot(vx,vy) || 1;
    const cos = Math.max(-1, Math.min(1, (ux*vx + uy*vy)/(du*dv)));
    return Math.acos(cos) * 180 / Math.PI;
  };

  const maxRightAngleDeviation = (quad: Array<{x:number;y:number}>) => {
    const [tl,tr,br,bl] = quad as any;
    const devs = [
      Math.abs(angleDeg(bl, tl, tr) - 90),
      Math.abs(angleDeg(tl, tr, br) - 90),
      Math.abs(angleDeg(tr, br, bl) - 90),
      Math.abs(angleDeg(br, bl, tl) - 90),
    ];
    return Math.max(...devs);
  };

  const dist = (a:any,b:any) => Math.hypot(a.x-b.x, a.y-b.y);

  const detectDoc = useCallback((src: any) => {
    const cv = (window as any).cv;
    const { gray, edges, contours, hierarchy, approx } = ensureMats();

    const pass = (loose=false) => {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, gray, new cv.Size(5,5), 0);

      const mean = new cv.Mat(); const std = new cv.Mat();
      cv.meanStdDev(gray, mean, std);
      const sigma = Math.max(10, std.doubleAt(0,0));
      const base = loose ? 0.58 : 0.68;
      const lo = Math.max(20, base * sigma);
      const hi = Math.max(40, (base * 2.0) * sigma);
      cv.Canny(gray, edges, lo, hi);
      mean.delete(); std.delete();

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const areaTotal = src.cols * src.rows;
      const A4 = Math.SQRT2;
      const minAreaFrac = loose ? 0.06 : 0.10;
      const angMax = loose ? 18 : 14;
      const arMin = loose ? 1.18 : 1.26;
      const arMax = loose ? 1.62 : 1.52;
      const minSolidity = loose ? 0.70 : 0.78;

      let best:any = null, bestScore = -Infinity;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const peri = cv.arcLength(cnt, true);
        cv.approxPolyDP(cnt, approx, (loose ? 0.03 : 0.02) * peri, true);
        if (approx.rows !== 4) continue;

        const area = cv.contourArea(approx);
        if (area < areaTotal * minAreaFrac) continue;

        const rect = cv.boundingRect(approx);
        const rectArea = Math.max(1, rect.width * rect.height);
        const solidity = area / rectArea;
        if (solidity < minSolidity) continue;

        const pts: Array<{x:number;y:number}> = [];
        for (let k = 0; k < 4; k++) pts.push({ x: approx.data32S[k*2], y: approx.data32S[k*2+1] });
        const ord = orderQuad(pts);
        if (!isConvexQuad(ord)) continue;

        const maxDev = maxRightAngleDeviation(ord);
        if (maxDev > angMax) continue;

        const w = dist(ord[0], ord[1]);
        const h = dist(ord[0], ord[3]);
        const ar = (Math.max(w,h) / Math.max(1, Math.min(w,h)));
        if (ar < arMin || ar > arMax) continue;

        const score =
          (area / areaTotal) * 1.2
          - (maxDev / 30) * 0.8
          - Math.abs(Math.log(ar / A4)) * 0.8
          + (solidity - 0.7) * 0.6;

        if (score > bestScore) { bestScore = score; best = ord; }
      }

      return best;
    };

    let q = pass(false);
    if (!q) q = pass(true);
    return q;
  }, [ensureMats]);

  const cropAndDeskew = useCallback((srcMat: any, quad: any, targetW = 1000, targetH = 1400) => {
    const cv = (window as any).cv;
    const dst = new cv.Mat();
    const dsize = new cv.Size(targetW, targetH);
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      quad[0].x, quad[0].y,  quad[1].x, quad[1].y,
      quad[2].x, quad[2].y,  quad[3].x, quad[3].y,
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [ 0,0, dsize.width,0, dsize.width,dsize.height, 0,dsize.height ]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(srcMat, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    srcTri.delete(); dstTri.delete(); M.delete();
    return dst;
  }, []);

  // ===== 서버 통신 =====
  const analyzeCanvasOCR = useCallback(async (canvas: HTMLCanvasElement) => {
    const dataURL = canvas.toDataURL("image/png");
    const payload = { user_id: getUserId(), image: dataURL, model: DEFAULT_MODEL };

    setStatus("OCR 인식 중...");
    try {
      const { data } = await api.post(`${API_BASE}${OCR_PREVIEW_ENDPOINT}`, payload);
      const text = (data?.ocr_text || "").replace(/(^|\n)\s*document\.?context\s*:.+$/gmi, "").trim();
      return { text, dataURL };
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err?.message || '요청 실패');
      throw new Error(msg);
    }
  }, [API_BASE, getUserId]);

  const createDocumentWithServer = useCallback(async (ocr_text: string) => {
    setStatus("문서 생성 중...");
    try {
      const uid = getUserId();
      const { data } = await api.post(`${API_BASE}${OCR_CREATE_ENDPOINT}`, {
        user_id: uid,
        ocr_text,
      });
      const text = (data?.ocr_text || "").trim();
      return { id: data?.document_id, text };
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err?.message || '요청 실패');
      throw new Error(msg);
    }
  }, [API_BASE, getUserId]);

  // ===== 안내 & 촬영 판정 =====
  const STABLE_MS = 900;
  const T_CENTER_IN = 30,  T_CENTER_OUT = 84;
  const T_ANGLE_IN  = 3.0, T_ANGLE_OUT  = 7.5;
  const SIZE_IN_MIN = 0.88, SIZE_IN_MAX = 1.16;
  const SIZE_OUT_MIN = 0.78, SIZE_OUT_MAX = 1.22;

  const drawA4Guide = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const A4 = Math.SQRT2;
    const MARGIN = 0.06;
    const maxW = W * (1 - 2 * MARGIN);
    const maxH = H * (1 - 2 * MARGIN);
    let GW = maxW, GH = GW * A4;
    if (GH > maxH) { GH = maxH; GW = GH / A4; }
    const GX = (W - GW) / 2, GY = (H - GH) / 2;
    ctx.save();
    ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.strokeStyle = "#FFD400";
    ctx.strokeRect(GX, GY, GW, GH);
    ctx.restore();
    return { GX, GY, GW, GH };
  }, []);

  // Freeze/Unfreeze helpers
  const freeze = useCallback(() => {
    setFreezePreview(true);
    try { videoRef.current?.pause(); } catch {}
  }, []);
  const unfreeze = useCallback(() => {
    setFreezePreview(false);
    try { videoRef.current?.play(); } catch {}
  }, []);

  /**
   * 안내 우선순위(각도 → 위치 → 크기)에 맞춰 재작성
   * 1) 각도 오류가 있으면 각도부터 교정 안내
   * 2) 각도 OK면 중심 위치 이동 안내
   * 3) 둘 다 OK면 크기(거리) 안내
   * 모든 항목이 OK인 상태가 STABLE_MS 이상 유지되면 촬영 트리거
   */
  const judgeAndGuide = useCallback((ctx: CanvasRenderingContext2D, quadView: any, guide: any, onCapture: () => void) => {
    const { GX, GY, GW, GH } = guide;

    // 중심점, 기울기 계산 및 스무딩
    const cxRaw = (quadView[0].x + quadView[1].x + quadView[2].x + quadView[3].x) / 4;
    const cyRaw = (quadView[0].y + quadView[1].y + quadView[2].y + quadView[3].y) / 4;
    const ax = quadView[1].x - quadView[0].x;
    const ay = quadView[1].y - quadView[0].y;
    const thetaRaw = Math.atan2(ay, ax) * 180 / Math.PI;

    const ALPHA = 0.3;
    if (!(judgeAndGuide as any)._smooth) (judgeAndGuide as any)._smooth = { cx: cxRaw, cy: cyRaw, theta: thetaRaw };
    else {
      (judgeAndGuide as any)._smooth.cx = ALPHA * cxRaw + (1 - ALPHA) * (judgeAndGuide as any)._smooth.cx;
      (judgeAndGuide as any)._smooth.cy = ALPHA * cyRaw + (1 - ALPHA) * (judgeAndGuide as any)._smooth.cy;
      (judgeAndGuide as any)._smooth.theta = ALPHA * thetaRaw + (1 - ALPHA) * (judgeAndGuide as any)._smooth.theta;
    }
    const { cx, cy, theta } = (judgeAndGuide as any)._smooth;

    const dx = cx - (GX + GW / 2);
    const dy = cy - (GY + GH / 2);

    // 면적 기반 크기 비율
    const area = Math.abs(
      quadView[0].x * quadView[1].y - quadView[1].x * quadView[0].y +
      quadView[1].x * quadView[2].y - quadView[2].x * quadView[1].y +
      quadView[2].x * quadView[3].y - quadView[3].x * quadView[2].y +
      quadView[3].x * quadView[0].y - quadView[0].x * quadView[3].y
    ) / 2;
    const sizeRatio = area / (GW * GH || 1);

    // 1) 각도 우선 체크
    if (Math.abs(theta) > T_ANGLE_OUT) {
      speakIfNeeded(theta > 0 ? "ANG_R" : "ANG_L", theta > 0 ? "오른쪽으로 기울었습니다. 수평을 맞춰 주세요." : "왼쪽으로 기울었습니다. 수평을 맞춰 주세요.");
      // 안정 타이머 초기화
      (judgeAndGuide as any)._okSince = 0;
      return;
    }

    // 2) 중심 위치 체크
    if (Math.abs(dx) > T_CENTER_OUT || Math.abs(dy) > T_CENTER_OUT) {
      const needMoveX = Math.abs(dx) > T_CENTER_OUT;
      const needMoveY = Math.abs(dy) > T_CENTER_OUT;
      const msgX = needMoveX ? (dx > 0 ? "왼쪽으로" : "오른쪽으로") : "";
      const msgY = needMoveY ? (dy > 0 ? "위로" : "아래로") : "";
      const key = `MOVE|${msgX}|${msgY}`;
      const text = [msgY, msgX].filter(Boolean).join(", ");
      if (text) speakIfNeeded(key, text + " 이동해 주세요.");
      (judgeAndGuide as any)._okSince = 0;
      return;
    }

    // 3) 크기(거리) 체크
    if (sizeRatio < SIZE_OUT_MIN) {
      speakIfNeeded("SIZE_NEAR", "더 가까이 가져가세요.");
      (judgeAndGuide as any)._okSince = 0;
      return;
    }
    if (sizeRatio > SIZE_OUT_MAX) {
      speakIfNeeded("SIZE_FAR", "더 멀리 떨어뜨리세요.");
      (judgeAndGuide as any)._okSince = 0;
      return;
    }

    // 모두 허용 범위 안이면 유지 안내
    speakIfNeeded("HOLD", "좋아요, 그대로 유지해 주세요.");

    // 촬영 조건(‘IN’ 기준) 충족 여부
    const okIn =
      Math.abs(theta) <= T_ANGLE_IN &&
      Math.abs(dx) <= T_CENTER_IN &&
      Math.abs(dy) <= T_CENTER_IN &&
      sizeRatio >= SIZE_IN_MIN && sizeRatio <= SIZE_IN_MAX;

    const now = performance.now();
    if (okIn) {
      if (!(judgeAndGuide as any)._okSince) (judgeAndGuide as any)._okSince = now;
      if (now - (judgeAndGuide as any)._okSince >= STABLE_MS) {
        (judgeAndGuide as any)._okSince = 0;
        onCapture();
      }
    } else {
      (judgeAndGuide as any)._okSince = 0;
    }
  }, [
    T_ANGLE_OUT, T_CENTER_OUT, SIZE_OUT_MIN, SIZE_OUT_MAX,
    T_ANGLE_IN, T_CENTER_IN, SIZE_IN_MIN, SIZE_IN_MAX, STABLE_MS,
    speakIfNeeded
  ]);


  // ===== 메인 루프 =====
  useEffect(() => {
    if (!ready) return;
    let raf: number | null = null;

    const step = () => {
      const video = videoRef.current, view = viewCanvasRef.current, proc = procCanvasRef.current;
      if (!video || !view || !proc) { raf = requestAnimationFrame(step); return; }

      // ❄️ Freeze 상태면 캔버스에 손대지 않고 프레임 유지
      if (freezePreview) { raf = requestAnimationFrame(step); return; }

      const vctx = view.getContext("2d")!, pctx = proc.getContext("2d")!;
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) { raf = requestAnimationFrame(step); return; }

      // 미리보기
      vctx.clearRect(0, 0, view.width, view.height);
      vctx.drawImage(video, 0, 0, view.width, view.height);
      const guide = drawA4Guide(vctx, view.width, view.height);

      if (!capturing && !isListening) {
        const cv = (window as any).cv;
        if (cv) {
          pctx.drawImage(video, 0, 0, proc.width, proc.height);
          const srcSmall = cv.imread(proc);
          const quadSmall = detectDoc(srcSmall);
          if (quadSmall) {
            const sx = view.width / proc.width, sy = view.height / proc.height;
            const quadView = quadSmall.map((p:any) => ({ x: p.x * sx, y: p.y * sy }));

            // 윤곽 표시
            vctx.beginPath(); vctx.moveTo(quadView[0].x, quadView[0].y);
            for (let i = 1; i < 4; i++) vctx.lineTo(quadView[i].x, quadView[i].y);
            vctx.closePath();
            vctx.lineWidth = 5; vctx.strokeStyle = "rgba(0,255,0,0.9)"; vctx.stroke();

            // 안내 및 촬영 트리거
            judgeAndGuide(vctx, quadView, guide, async () => {
              if (capturing || isListening) return;
              setCapturing(true);

              // ❄️ 화면 얼리기: 현재 프레임을 그대로 유지
              freeze();
              setStatus("자동 촬영 중...");

              const cv2 = (window as any).cv;
              const fullMat = cv2.imread(view);
              const cropped = cropAndDeskew(fullMat, quadView, 1000, 1400);
              cv2.imshow(outCanvasRef.current!, cropped);
              fullMat.delete(); cropped.delete();

              try { navigator.vibrate?.([20, 40, 20]); } catch {}
              speakIfNeeded("SHOT", "촬영되었습니다. 잠시만요.");

              // OCR 프리뷰 → 읽기 → STT 확인
              setTimeout(async () => {
                const oc = outCanvasRef.current!;
                const dataURL = oc.toDataURL("image/png");
                lastShotDataUrlRef.current = dataURL;

                try {
                  const { text } = await analyzeCanvasOCR(oc);
                  setOcrText(text);
                  setStatus("인식 결과를 읽어드릴게요. 곧 확인 질문이 나옵니다.");

                  const MAX_READ = 600;
                  const readChunk = text.length > MAX_READ ? (text.slice(0, MAX_READ) + " ... 이하 생략") : text;
                  const prompt = "인식된 내용입니다. " + readChunk + " . 정확하면 ‘맞아요’라고, 틀리면 ‘아니에요’ 또는 ‘다시’라고 말씀해 주세요. 이제 대답을 기다립니다.";

                  speakAndThen(prompt, () => {
                    setStatus("음성 응답을 기다리는 중입니다. ‘맞아요’ 또는 ‘아니에요’라고 말씀해 주세요.");
                    startYesNoListening((ans, transcript) => {
                      if (ans === "yes") {
                        setStatus("확정하셨습니다. 문서를 생성합니다...");
                        // ✅ 확정: ocr_text로 문서 생성, 완료되면 /documents 로 이동
                        createDocumentWithServer(text)
                          .then(({ id }) => {
                            setStatus(`문서 생성 완료 (#${id}). 목록으로 이동합니다.`);
                            speakAndThen("문서가 생성되었습니다. 목록으로 이동합니다.", () => {
                              window.location.href = "/documents";
                            });
                          })
                          .catch((e) => {
                            setStatus(`업로드 오류: ${e?.message || e}`);
                            speakAndThen("업로드 중 오류가 발생했습니다. 다시 촬영하겠습니다.", () => {
                              setCapturing(false);
                              unfreeze(); // 오류 시 재개
                            });
                          });
                      } else if (ans === "no") {
                        // ❄️ 해제하고 다시 촬영 루프로
                        setStatus("다시 촬영합니다. 가이드에 맞춰 문서를 위치해 주세요.");
                        speakAndThen("알겠습니다. 다시 촬영하겠습니다.", () => {
                          setCapturing(false);
                          unfreeze();
                        });
                      } else {
                        setStatus(`확실하지 않음: 응답을 이해하지 못했습니다${transcript ? `: "${transcript}"` : ""}. 다시 촬영합니다.`);
                        speakAndThen("죄송합니다. 응답을 이해하지 못했습니다. 다시 촬영하겠습니다.", () => {
                          setCapturing(false);
                          unfreeze();
                        });
                      }
                    });
                  });
                } catch (e:any) {
                  setStatus(`OCR 인식 오류: ${e?.message || e}. 다시 시도해 주세요.`);
                  speakAndThen("인식 중 오류가 발생했습니다. 다시 촬영하겠습니다.", () => {
                    setCapturing(false);
                    unfreeze();
                  });
                }
              }, 120);
            });
          }
          srcSmall.delete();
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [
    ready, capturing, isListening, freezePreview,
    drawA4Guide, detectDoc, judgeAndGuide, cropAndDeskew,
    analyzeCanvasOCR, createDocumentWithServer, speakIfNeeded, speakAndThen, startYesNoListening, freeze
  ]);

  // ===== 초기화 =====
  const getUM = async (constraints: MediaStreamConstraints) => {
    if (navigator.mediaDevices?.getUserMedia) return navigator.mediaDevices.getUserMedia(constraints);
    const legacy: any =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;
    if (legacy) return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
    throw new Error("getUserMedia not supported");
  };

  const getRearStream = useCallback(async () => {
    const tryList: MediaStreamConstraints[] = [
      {
        audio: true,
        video: {
          facingMode: { exact: "environment" } as any,
          width: { ideal: 1280 } as any,
          height: { ideal: 720 } as any,
          frameRate: { ideal: 15, max: 30 } as any
        }
      },
      {
        audio: true,
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        }
      },
      {
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        }
      },
      { audio: true, video: true },
    ];
    let lastErr: any = null;
    for (const c of tryList) {
      try {
        const s = await getUM(c);
        return s;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("카메라/마이크 스트림을 열 수 없습니다");
  }, []);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    (async () => {
      try {
        setStatus("카메라 초기화 중...");
        stream = await getRearStream();
        if (!videoRef.current || stopped) return;

        // 권한만 확보하고 마이크는 즉시 점유 해제
        try { stream.getAudioTracks().forEach(t => t.stop()); } catch {}

        const v = videoRef.current;
        v.srcObject = stream;
        v.muted = true;
        v.setAttribute("playsinline", "true");

        await new Promise<void>((resolve) => {
          if (v.readyState >= 1 && v.videoWidth && v.videoHeight) return resolve();
          const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); resolve(); };
          v.addEventListener("loadedmetadata", onMeta);
        });
        try { await v.play(); } catch {}

        const vw = v.videoWidth || 1280;
        const vh = v.videoHeight || 720;
        viewCanvasRef.current!.width = vw;   viewCanvasRef.current!.height = vh;
        procCanvasRef.current!.width = 352;  procCanvasRef.current!.height = Math.round((352 * vh) / (vw || 1)) || 240;
        outCanvasRef.current!.width = 1000;  outCanvasRef.current!.height = 1400;

        setReady(true);
        setStatus("문서를 가이드에 맞추면 자동 촬영합니다. 촬영 후 결과를 읽어드리고, 맞는지 물어보겠습니다.");
      } catch (e: any) {
        console.error("카메라/마이크 열기 실패:", e);
        setStatus(`카메라/마이크 열기 실패: ${e?.name || e?.message || e}`);
      }
    })();

    return () => {
      stopped = true;
      try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {}
      stopListening();
      const m = matsRef.current; Object.values(m).forEach((x: any) => { try { x?.delete && x.delete(); } catch {} });
      matsRef.current = { gray: null, edges: null, contours: null, hierarchy: null, approx: null };
    };
  }, [getRearStream, stopListening]);

  // ===== UI =====
  return (
    <div
      style={{
        padding: "clamp(2vh, 3vh, 4vh)",
        maxWidth: "120vh",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: "1.2vh",
          fontSize: "clamp(2.2vh, 3vh, 3.6vh)",
          lineHeight: 1.25,
          fontWeight: 800,
          color: "#111",
        }}
      >
        문서 자동 촬영 & 서버 OCR(확인 후 생성)
      </h2>

      <p
        aria-live="assertive"
        style={{
          marginTop: 0,
          opacity: 0.9,
          fontSize: "clamp(1.6vh, 1.9vh, 2.2vh)",
        }}
      >
        {status}
      </p>

      {/* 서버 TTS 재생용 <audio> */}
      <audio ref={audioRef} hidden playsInline />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "0.1vh",
          height: "0.1vh",
          opacity: 0,
        }}
        aria-label="카메라 미리보기"
      />

      <div style={{ position: "relative" }}>
        <canvas
          ref={viewCanvasRef}
          style={{
            width: "100%",
            display: "block",
            background: "#000",
            borderRadius: "clamp(0.8vh, 1.2vh, 1.6vh)",
            boxShadow: "0 0.4vh 1.2vh rgba(0,0,0,0.2)",
          }}
          aria-label="촬영 미리보기"
        />
        <canvas ref={procCanvasRef} style={{ display: "none" }} />
        <canvas ref={outCanvasRef} style={{ display: "none" }} />
      </div>

      <div style={{ marginTop: "2vh" }}>
        <p
          style={{
            fontSize: "clamp(1.4vh, 1.6vh, 1.9vh)",
            opacity: 0.8,
            margin: "0.6vh 0",
          }}
        >
          OCR 결과(읽기 전용)
        </p>
        <textarea
          value={ocrText}
          readOnly
          rows={10}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: "clamp(0.8vh, 1.2vh, 1.6vh)",
            padding: "clamp(1vh, 1.2vh, 1.6vh)",
            border: "0.25vh solid #ccc",
            fontSize: "clamp(1.5vh, 1.8vh, 2vh)",
            lineHeight: 1.5,
            minHeight: "28vh",
            maxHeight: "48vh",
            resize: "vertical",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
          aria-label="OCR 텍스트 결과"
        />
      </div>
    </div>
  );
}
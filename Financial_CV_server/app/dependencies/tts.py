# # app/dependencies/tts.py
# import io
# import os
# import uuid
# import base64
# import tempfile
# import subprocess
# from typing import Optional

# from fastapi import APIRouter, HTTPException, Request
# from fastapi.responses import StreamingResponse, JSONResponse
# from pydantic import BaseModel, Field

# router = APIRouter()

# # ===== 요청 스키마 =====
# class TTSRequest(BaseModel):
#     text: str = Field(..., min_length=1)
#     speed: float = Field(1.3, ge=0.5, le=2.0)
#     speaker: str = Field("KR", description="스피커 키")
#     return_base64: bool = False
#     codec: Optional[str] = Field("wav", description='출력 코덱: "wav" | "mp3"')

# # ===== 도우미: 안전한 임시 경로 =====
# def _tmp_path(suffix: str) -> str:
#     return os.path.join(tempfile.gettempdir(), f"tts_{uuid.uuid4().hex}{suffix}")

# # ===== 라우트 =====
# @router.post("/tts")
# def tts_endpoint(req: TTSRequest, request: Request):
#     # MeloTTS 모델 가져오기 (lifespan에서 초기화되어 있어야 함)
#     tts_model = getattr(request.app.state, "tts_model", None)
#     speakers = getattr(request.app.state, "speakers", None)
#     if tts_model is None or speakers is None:
#         raise HTTPException(status_code=500, detail="TTS 모델이 초기화되지 않았습니다.")

#     if req.speaker not in speakers:
#         raise HTTPException(status_code=400, detail=f"잘못된 speaker: {req.speaker}")

#     # 1) 먼저 WAV 파일로 합성 (MeloTTS는 경로 출력이 가장 호환이 좋음)
#     wav_path = _tmp_path(".wav")
#     try:
#         tts_model.tts_to_file(
#             req.text,
#             speakers[req.speaker],
#             wav_path,
#             speed=req.speed
#         )
#     except Exception as e:
#         # 합성 실패 → 깨끗이 처리
#         try:
#             if os.path.exists(wav_path):
#                 os.remove(wav_path)
#         except:
#             pass
#         raise HTTPException(status_code=500, detail=f"TTS 처리 실패: {e}")

#     # 2) base64 응답 모드 (파일 I/O 최소화)
#     if req.return_base64:
#         try:
#             with open(wav_path, "rb") as f:
#                 audio_bytes = f.read()
#         finally:
#             try:
#                 os.remove(wav_path)
#             except:
#                 pass
#         return JSONResponse({
#             "mime": "audio/wav",
#             "audio_base64": base64.b64encode(audio_bytes).decode("utf-8")
#         })

#     # 3) 스트리밍 모드
#     codec = (req.codec or "wav").lower()

#     # 3-1) WAV 스트리밍 (다운로드 스트리밍: 합성 후 파일을 청크로 전송)
#     if codec == "wav":
#         def wav_iter(chunk_size=64 * 1024):
#             try:
#                 with open(wav_path, "rb") as f:
#                     while True:
#                         chunk = f.read(chunk_size)
#                         if not chunk:
#                             break
#                         yield chunk
#             finally:
#                 try:
#                     os.remove(wav_path)
#                 except:
#                     pass

#         headers = {
#             "Content-Disposition": 'inline; filename="tts.wav"',
#             # 리버스 프록시(Nginx 등) 버퍼링 방지
#             "X-Accel-Buffering": "no",
#             "Cache-Control": "no-store",
#         }
#         return StreamingResponse(wav_iter(), media_type="audio/wav", headers=headers)

#     # 3-2) MP3 스트리밍 (ffmpeg로 실시간 인코딩 → 브라우저가 더 빨리 재생 시작 가능)
#     elif codec == "mp3":
#         # ffmpeg가 있어야 함
#         ffmpeg = "ffmpeg"
#         if not _ffmpeg_exists(ffmpeg):
#             # ffmpeg 없으면 WAV로 폴백
#             def wav_iter(chunk_size=64 * 1024):
#                 try:
#                     with open(wav_path, "rb") as f:
#                         while True:
#                             chunk = f.read(chunk_size)
#                             if not chunk:
#                                 break
#                             yield chunk
#                 finally:
#                     try:
#                         os.remove(wav_path)
#                     except:
#                         pass
#             headers = {
#                 "Content-Disposition": 'inline; filename="tts.wav"',
#                 "X-Accel-Buffering": "no",
#                 "Cache-Control": "no-store",
#             }
#             return StreamingResponse(wav_iter(), media_type="audio/wav", headers=headers)

#         # ffmpeg 파이프 인코딩 (입력: wav_path, 출력: stdout→청크)
#         # -re 옵션은 입력을 실시간처럼 처리하므로 제외 (지연만 증가)
#         # -vn: 비디오 없음, -f mp3: mp3 컨테이너, -b:a 128k: 비트레이트 조절 가능
#         proc = subprocess.Popen(
#             [
#                 ffmpeg, "-hide_banner", "-loglevel", "error",
#                 "-i", wav_path,
#                 "-vn", "-f", "mp3", "-b:a", "128k", "pipe:1"
#             ],
#             stdout=subprocess.PIPE,
#             stderr=subprocess.PIPE,
#         )

#         def mp3_iter(chunk_size=64 * 1024):
#             try:
#                 while True:
#                     data = proc.stdout.read(chunk_size)
#                     if not data:
#                         break
#                     yield data
#             finally:
#                 try:
#                     proc.stdout.close()
#                 except:
#                     pass
#                 try:
#                     # 에러 로그 참고가 필요하면 아래 주석 해제
#                     # err = proc.stderr.read().decode("utf-8", "ignore")
#                     proc.stderr.close()
#                 except:
#                     pass
#                 try:
#                     proc.wait(timeout=1)
#                 except:
#                     proc.kill()
#                 try:
#                     os.remove(wav_path)
#                 except:
#                     pass

#         headers = {
#             "Content-Disposition": 'inline; filename="tts.mp3"',
#             "X-Accel-Buffering": "no",
#             "Cache-Control": "no-store",
#         }
#         return StreamingResponse(mp3_iter(), media_type="audio/mpeg", headers=headers)

#     # 3-3) 알 수 없는 코덱 → WAV로 폴백
#     else:
#         def wav_iter(chunk_size=64 * 1024):
#             try:
#                 with open(wav_path, "rb") as f:
#                     while True:
#                         chunk = f.read(chunk_size)
#                         if not chunk:
#                             break
#                         yield chunk
#             finally:
#                 try:
#                     os.remove(wav_path)
#                 except:
#                     pass

#         headers = {
#             "Content-Disposition": 'inline; filename="tts.wav"',
#             "X-Accel-Buffering": "no",
#             "Cache-Control": "no-store",
#         }
#         return StreamingResponse(wav_iter(), media_type="audio/wav", headers=headers)

# @router.get("/tts/speakers")
# def list_speakers(request: Request):
#     speakers = getattr(request.app.state, "speakers", None)
#     if speakers is None:
#         raise HTTPException(status_code=500, detail="TTS 모델이 초기화되지 않았습니다.")
#     return speakers

# # ===== 유틸: ffmpeg 존재 확인 =====
# def _ffmpeg_exists(cmd: str) -> bool:
#     try:
#         subprocess.run([cmd, "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
#         return True
#     except Exception:
#         return False

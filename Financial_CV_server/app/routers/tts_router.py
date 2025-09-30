# from fastapi import APIRouter
# from app.dependencies.tts import tts_endpoint, list_speakers, TTSRequest

# router = APIRouter(prefix="/tts", tags=["tts"])

# @router.post("")
# def tts_route(req: TTSRequest):
#     return tts_endpoint(req)

# @router.get("/speakers")
# def speakers_route():
#     return list_speakers()

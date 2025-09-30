from faster_whisper import WhisperModel


model = WhisperModel(
    "medium",   
    device="cuda",         
    compute_type="int8"    
)

def transcribe_audio(file_path: str, language: str = "ko") -> str:
    """
    파일 경로에 있는 오디오를 Whisper로 변환한 후
    전체 텍스트를 합쳐서 반환합니다.
    
    Args:
        file_path: 변환할 오디오 파일 경로 (wav, mp3 등 지원)
        language: 인식할 언어 코드 (기본값 "ko" 한국어)
        
    Returns:
        인식된 전체 텍스트 문자열
    """
    segments, info = model.transcribe(
        file_path,
        language=language,
        beam_size=5,         
        vad_filter=True     
    )

    return "".join(segment.text for segment in segments)

def main():
    audio_file = "/workspace/financial_CV/Financial_CV_server/app/dependencies/슬라이드다음_1_유빈2_9032.wav"
    language_code = "ko"  # 한국어

    text = transcribe_audio(audio_file, language_code)
    print("인식된 텍스트:", text)
    
    # 결과

if __name__ == "__main__":
        main()
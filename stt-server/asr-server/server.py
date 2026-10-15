"""
選用：自架台語語音辨識服務（MediaTek Breeze-ASR-26）

Breeze-ASR-26 以 Whisper-large-v2 為基礎，針對台語微調，輸出華語漢字，
國語也能正常辨識，適合「國語 + 台語」夾雜的展間對話。

啟動：
    pip install -r requirements.txt
    uvicorn server:app --host 0.0.0.0 --port 8001

需要 ffmpeg（解碼 m4a）。有 NVIDIA GPU 會快很多；只有 CPU 時建議改用
faster-whisper 的 int8 版本（見 README）。
"""
import os
import tempfile

import torch
from fastapi import FastAPI, File, Form, UploadFile
from transformers import pipeline

MODEL_ID = os.getenv("BREEZE_MODEL", "MediaTek-Research/Breeze-ASR-26")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

asr = pipeline(
    "automatic-speech-recognition",
    model=MODEL_ID,
    torch_dtype=dtype,
    device=device,
)

app = FastAPI(title="CarSales Copilot ASR")


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID, "device": device}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), prompt: str = Form("")):
    # pipeline 接受檔案路徑，內部用 ffmpeg 解碼並重採樣成 16kHz
    suffix = os.path.splitext(file.filename or "")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        path = tmp.name
    try:
        result = asr(
            path,
            chunk_length_s=30,
            generate_kwargs={"language": "zh", "task": "transcribe"},
        )
        return {"text": result["text"].strip()}
    finally:
        os.remove(path)

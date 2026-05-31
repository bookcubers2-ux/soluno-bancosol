import sys
from datetime import timedelta
from faster_whisper import WhisperModel

AUDIO = r"c:\Users\ASUS\3D Objects\HACKATON\audio 3.m4a"
OUT = r"c:\Users\ASUS\3D Objects\HACKATON\audio_3_transcripcion.txt"

def fmt(s):
    return str(timedelta(seconds=int(s)))

print("Cargando modelo 'small'...", flush=True)
model = WhisperModel("small", device="cpu", compute_type="int8")

print("Transcribiendo...", flush=True)
segments, info = model.transcribe(AUDIO, language="es", vad_filter=True, beam_size=5)

print(f"Idioma detectado: {info.language} (prob {info.language_probability:.2f})", flush=True)

lines = []
full = []
for seg in segments:
    stamp = f"[{fmt(seg.start)} -> {fmt(seg.end)}]"
    text = seg.text.strip()
    print(stamp, text, flush=True)
    lines.append(f"{stamp} {text}")
    full.append(text)

with open(OUT, "w", encoding="utf-8") as f:
    f.write("TRANSCRIPCION - audio 3.m4a\n")
    f.write("=" * 60 + "\n\n")
    f.write("TEXTO COMPLETO:\n\n")
    f.write(" ".join(full).strip() + "\n\n")
    f.write("=" * 60 + "\n\n")
    f.write("CON MARCAS DE TIEMPO:\n\n")
    f.write("\n".join(lines) + "\n")

print("\nLISTO ->", OUT, flush=True)

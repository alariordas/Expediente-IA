import os
import base64
import tempfile
import uuid
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pollinations import Image as PollinationsImage
from PyPDF2 import PdfReader
import pathlib
import datetime
import json
from google import genai
import model



from dotenv import load_dotenv
import os


load_dotenv()

# --- Config y cliente GenAI ---
API_KEY = os.getenv("gemini-key")
client = genai.Client(api_key=API_KEY)

app = FastAPI()
router = APIRouter()


# --- Leer estilo del PDF (primeras 50 páginas) ---
def load_style_text(path: pathlib.Path, max_pages: int = 50) -> str:
    reader = PdfReader(str(path))
    texto = ""
    for i in range(min(max_pages, len(reader.pages))):
        texto += (reader.pages[i].extract_text() or "") + "\n"
    return texto

PDF = os.getenv("pdf")
style_text = load_style_text(pathlib.Path(PDF))


@router.post("/start_game", response_model=model.Game)
async def start_game():
    """
    Genera la estructura inicial del juego (inicio, suspects, murder_details, etc.).
    """
    base_prompt = open("prompts/startgame.txt").read()

    resp = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[style_text, base_prompt]
    )
    raw = resp.text or ""
    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.splitlines()
        clean = "\n".join(lines[1:-1])
    if not clean:
        raise HTTPException(500, "Falló la generación del JSON: respuesta vacía")
    try:
        game = json.loads(clean)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Failed to parse game JSON: {e}")
    # Añadimos start_time para que el frontend lo reciba
    game["start_time"] = datetime.datetime.now().isoformat()
    return {"data": game}


@router.post("/ask", response_model=dict)
async def ask_suspect(req: model.AskSuspectRequest):
    """
    Interroga a un sospechoso: genera respuesta basada en personality, coartada y tiempo transcurrido.
    """
    # Parseo de tiempos
    try:
        start = datetime.datetime.fromisoformat(req.start_time)
        now   = datetime.datetime.fromisoformat(req.current_time)
        elapsed = (now - start).total_seconds() / 60
    except:
        raise HTTPException(400, "start_time/current_time deben ser ISO 8601")

    nivel = (
        "pistas sutiles" if elapsed < 10 else
        "pistas moderadas" if elapsed < 40 else
        "pistas muy explícitas"
    )

    # Selección de sospechoso
    if req.suspect_index < 0 or req.suspect_index >= len(req.suspects):
        raise HTTPException(400, f"Sólo hay {len(req.suspects)} sospechosos.")
    s = req.suspects[req.suspect_index]

    historial = "\n".join(req.history) if req.history else "No hay historial previo."

    with open("prompts/ask.txt", encoding="utf-8") as f:
        template = f.read()

    prompt = template.format(
        name=s.name,
        personality=s.personality,
        coartada=s.coartada,
        culpable=s.culpable,
        detalles_adicionales=s.detalles_adicionales,
        nivel=nivel,
        historial=historial,
        pregunta=req.question,
    )

    resp2 = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt]
    )
    return {"answer": resp2.text.strip() or "No tengo nada que decir."}

@router.post("/ask/narrator", response_model=model.NarratorResponse)
async def ask_narrator(req: model.NarratorRequest):
    """
    Narrador: distingue acusaciones de dudas, valida lo que menciona vs murder_details,
    o bien ofrece tutoriales según el tema.
    """
    # Parseo tiempos y warning
    try:
        start = datetime.datetime.fromisoformat(req.start_time)
        now = datetime.datetime.fromisoformat(req.current_time)
        elapsed = (now - start).total_seconds() / 60
    except:
        raise HTTPException(400, "start_time/current_time deben ser ISO 8601")

    warning = None
    threshold = max(1, int(0.2 * (req.attempts_remaining + 1)))
    if req.attempts_remaining <= threshold:
        warning = f"¡Cuidado! Solo te quedan {req.attempts_remaining} intentos."

    # Construcción del prompt con plantilla externa
    context_chat = "\n".join(req.history) if req.history else "No hay historial previo."
    suspect_names = ", ".join([s.name for s in req.suspects])
    keys = list(req.murder_details.keys())

    with open("prompts/narrator.txt", encoding="utf-8") as f:
        template = f.read()

    prompt = template.format(
        escenario=req.scenario,
        sospechosos=suspect_names,
        items=", ".join(keys),
        detectives=req.detectives_count,
        intentos=req.attempts_remaining,
        humor=f"- Personaje de humor: {req.humor_character}" if req.humor_character else "",
        intro=f"- Intro del narrador: {req.intro_narrator}" if req.intro_narrator else "",
        historial=context_chat,
        pregunta=req.question,
        claves=", ".join(keys),
        murder_details=json.dumps(req.murder_details, ensure_ascii=False),
        warning=warning or ""
    )

    resp = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt]
    )
    raw = resp.text or ""
    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.splitlines()
        clean = "\n".join(lines[1:-1])
    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Respuesta inválida del modelo: {e}\nContenido:\n{raw}")


@router.post("/generate_pfp", response_model=model.PFPResponse)
async def generate_pfp(req: model.PFPRequest):
    """
    Genera un avatar (pfp) con Pollinations ('flux') y devuelve la imagen en base64.
    """
    try:
        model = PollinationsImage(model="flux", width=1024, height=1024, seed=42)
        model.Generate(
            prompt=(
                "Genera una imagen de la cara de una persona en estilo del juego de mesa "
                f"cluedo mezclado con Ghibli: {req.description}"
            ),
            save=True
        )
        original = "pollinations-image.jpeg"
        if not os.path.isfile(original):
            raise HTTPException(500, "La imagen no fue generada correctamente.")
        tmp = tempfile.gettempdir()
        final_path = os.path.join(tmp, f"pfp_{uuid.uuid4().hex}.jpeg")
        os.replace(original, final_path)
        with open(final_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        os.remove(final_path)
        return {"image": f"data:image/jpeg;base64,{b64}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"No se pudo generar la imagen: {e}")
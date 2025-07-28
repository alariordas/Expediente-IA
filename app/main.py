from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import router


# --- FastAPI App ---
app = FastAPI()

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "URL del frontend aquí",  # Reemplaza con la URL de tu frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  
)


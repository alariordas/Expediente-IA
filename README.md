# 🕵️‍♂️ Expediente IA

**Expediente IA** es un juego conversacional donde te metes en la piel de un detective, hablando a través de un chat con sospechosos de un crimen, incendio, robo o cualquier movida turbia que haya ocurrido. El objetivo: **resolver el misterio usando solo tus preguntas e intuición**. 

Sí, lo que estás pensando: Cluedo pero en formato chat, con IA y en tu navegador.

## 🧠 ¿Cómo funciona?

El backend corre con **FastAPI en Python** conectado a **Gemini**, que genera las respuestas de los personajes según su personalidad, coartada y nivel de presión. El frontend está hecho a pelo: **HTML, CSS y JS Vanilla**, sin librerías raras, para que lo puedas montar donde quieras.

## 🛠️ Estructura del proyecto

```bash
├── app/                # API en FastAPI
│   ├── main.py         # Lanza el servidor
│   ├── router.py       # Lógica de los endpoints del juego
│   ├── model.py        # Modelos Pydantic
│   ├── prompts/        # Plantillas de texto para la IA
├── index.html          # Frontend
├── script.js           # JS para el frontend
├── styles.css          # Estilos
├── svg/                # Iconos y assets gráficos
└── .env                # Variables de entorno (API key, etc.)
```

## 🚀 Instalación

1. Clona el repo y entra en la carpeta:

```bash
git clone https://github.com/tuusuario/expediente-ia.git
cd expediente-ia
```

2. Crea y activa un entorno virtual:

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Instala las dependencias:

```bash
pip install -r requirements.txt
```

4. Crea un archivo `.env` dentro de `app/` con tu clave de Gemini y la ruta al PDF que define el estilo narrativo:

```env
gemini-key=TU_API_KEY
pdf=path/al/archivo.pdf
```

5. Lanza el servidor:

```bash
uvicorn app.main:app --reload
```

6. Abre `index.html` en tu navegador y a jugar 🔍

## 📌 Notas

- Puedes modificar las plantillas en la carpeta `prompts/` para cambiar la narrativa o el tono de los personajes.
- La generación de imágenes de perfil (pfp) usa Pollinations. Asegúrate de tener permisos de red o adapta la función.
- Próximamente: subiré una imagen de portada para dejarlo más fino 👀

---

## © Licencia
Licencia: CC BY-NC-ND 4.0. Ver [LICENSE.md](./LICENSE.md) para más información.
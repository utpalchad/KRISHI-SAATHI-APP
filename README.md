# Krishi Saathi — Complete Connected App

**From Soil to Sale — one intelligent assistant for every farmer.**

This package contains the React/Vite frontend, FastAPI backend, supplied farm images, AI/data adapters, and an optional live x402 + Algorand Testnet USDC payment flow. The frontend calls the backend for farm brief, recommendations, weather, market, chat, crop-health analysis, and premium reports.

## What is already connected

- **Home:** farm brief + weather + market cards
- **My Farm:** editable farmer profile saved in browser local storage
- **Crop Health:** image upload → FastAPI → configured AI vision provider
- **Market:** market adapter with safe fallback when no live API is configured
- **Krishi AI:** chat endpoint using Gemini → Ollama → Claude → safe fallback
- **Premium:** four x402-protected report endpoints
- **Wallet:** Pera / Defly through `@txnlab/use-wallet-react`
- **Images:** farmer, field, leaf and mandi photos are already placed in the UI

## Run locally — easiest method

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
python run.py
```

Backend: `http://localhost:8000`
Swagger: `http://localhost:8000/docs`
Health: `http://localhost:8000/api/health`
Status: `http://localhost:8000/api/status`

**The backend now starts even when x402 is not configured.** Premium endpoints fail closed with HTTP 503 until a receiver address is supplied, so you cannot accidentally expose paid reports for free.

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

If your backend is not on port 8000, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Enable live AI / data providers

Edit `backend/.env`. You can configure any combination of:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash

ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-sonnet-4-5

OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

OPENWEATHER_API_KEY=...
AGMARKNET_BASE_URL=...
DATA_GOV_RESOURCE_URL=...

BHASHINI_API_URL=...
BHASHINI_API_KEY=...
BHASHINI_USER_ID=...
BHASHINI_ASR_PIPELINE_ID=...
BHASHINI_TTS_PIPELINE_ID=...
BHASHINI_TRANSLATE_PIPELINE_ID=...
```

If a provider is not configured, the app uses clearly labelled demo/fallback behavior rather than pretending that data is live.

## Enable real x402 + Algorand Testnet payments

Set these in `backend/.env`:

```env
AVM_ADDRESS=YOUR_ALGORAND_TESTNET_RECEIVER_ADDRESS
FACILITATOR_URL=https://facilitator.goplausible.xyz
ALGORAND_TESTNET_CAIP2=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
USDC_TESTNET_ASA_ID=10458941
```

Only put a **public receiver address** in `AVM_ADDRESS`. Never put a private key there.

The browser flow is:

**React → HTTP 402 → Pera/Defly signs → GoPlausible facilitator → Algorand Testnet → premium report**.

The AVM x402 documentation confirms that `ClientAvmSigner` is compatible with `@txnlab/use-wallet`, and the Testnet CAIP-2 identifier and USDC asset are the values used by this app. citeturn1search0turn0search0

Premium prices:

| Service | Price |
|---|---:|
| Soil Health Report | 0.05 USDC |
| Water Quality & Salinity | 0.05 USDC |
| Leaf & Pathogen Report | 0.10 USDC |
| Fertilizer Prescription | 0.10 USDC |

## Docker

```bash
docker compose up --build
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:8000`

`docker-compose.yml` accepts an optional `backend/.env`, so the stack can boot in demo mode without secret configuration.

## Supplied images

- `frontend/assets/farmer.jpg` → home hero
- `frontend/assets/field.jpg` → farm context
- `frontend/assets/leaf.jpg` → crop health
- `frontend/assets/mandi.jpg` → market & sale

## Verification performed

- Python backend compiles successfully.
- FastAPI smoke tests pass.
- Existing backend test suite passes: **2 tests passed**.
- Frontend source was TypeScript-checked for syntax; dependency installation/build could not be completed in this environment because npm package downloads timed out.

## Important production note

The app is fully wired, but **live external services still require their own credentials/accounts**. No assistant can safely invent API keys, wallet receiver addresses, Bhashini pipeline IDs, or a funded Testnet wallet. Once those real credentials are placed in `.env`, the existing adapters use them.

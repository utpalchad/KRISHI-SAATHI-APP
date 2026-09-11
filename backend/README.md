# Krishi Saathi Python Backend

FastAPI backend for the Krishi Saathi farmer app.

## Run

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

The API runs on `http://localhost:8000`.

## x402

Premium routes are protected by the official GoPlausible `x402-avm` FastAPI middleware:

- `POST /api/premium/soil-health` — 50,000 micro-USDC
- `POST /api/premium/water-quality` — 50,000 micro-USDC
- `POST /api/premium/pathogen-report` — 100,000 micro-USDC
- `POST /api/premium/fertilizer` — 100,000 micro-USDC

Set `AVM_ADDRESS` to a public Algorand Testnet receiver address. Keep private keys out of this resource server. The browser wallet signs the user's payment and the GoPlausible facilitator verifies/settles it.

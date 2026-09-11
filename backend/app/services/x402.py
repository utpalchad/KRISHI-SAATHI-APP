"""Official x402 Python/Algorand integration for Krishi Saathi.

This module uses the current GoPlausible x402-avm FastAPI middleware instead
of manually constructing 402 responses or calling /verify and /settle.
"""

from app.config import settings



AVM_NETWORK = settings.algorand_testnet_caip2
USDC_ASA = str(settings.usdc_testnet_asa_id or "10458941")


def _payment_option(price: str):
    from x402.http import PaymentOption
    return PaymentOption(
        scheme="exact",
        network=AVM_NETWORK,
        pay_to=settings.avm_address,
        price=price,
        # The Python SDK resolves string USD prices to the configured/default
        # payment asset. For explicit Testnet USDC, AssetAmount is used below.
    )


def _usdc_payment_option(amount_micro_usdc: str):
    from x402.http import PaymentOption
    from x402.schemas import AssetAmount

    return PaymentOption(
        scheme="exact",
        network=AVM_NETWORK,
        pay_to=settings.avm_address,
        price=AssetAmount(
            amount=amount_micro_usdc,
            asset=USDC_ASA,
            extra={"name": "USDC", "decimals": 6},
        ),
    )


def build_x402_middleware():
    """Build x402 when payment configuration is present; otherwise run in demo mode."""
    if not settings.avm_address:
        return None, {}, None

    from x402.http import FacilitatorConfig, HTTPFacilitatorClient
    from x402.http.middleware.fastapi import PaymentMiddlewareASGI
    from x402.http.types import RouteConfig
    from x402.mechanisms.avm import USDC_TESTNET_ASA_ID
    from x402.mechanisms.avm.exact import ExactAvmServerScheme
    from x402.server import x402ResourceServer

    facilitator = HTTPFacilitatorClient(
        FacilitatorConfig(url=settings.facilitator_url)
    )
    server = x402ResourceServer(facilitator)
    server.register(AVM_NETWORK, ExactAvmServerScheme())

    # Prices are explicit in micro-USDC to remove ambiguity:
    # $0.05 = 50,000 micro-USDC; $0.10 = 100,000 micro-USDC.
    routes = {
        "POST /api/premium/soil-health": RouteConfig(
            accepts=_usdc_payment_option("50000"),
            mime_type="application/json",
            description="Krishi Saathi Soil Health Report",
        ),
        "POST /api/premium/water-quality": RouteConfig(
            accepts=_usdc_payment_option("50000"),
            mime_type="application/json",
            description="Water Quality and Salinity Stress Report",
        ),
        "POST /api/premium/pathogen-report": RouteConfig(
            accepts=_usdc_payment_option("100000"),
            mime_type="application/json",
            description="Advanced Leaf Tissue and Pathogen Report",
        ),
        "POST /api/premium/fertilizer": RouteConfig(
            accepts=_usdc_payment_option("100000"),
            mime_type="application/json",
            description="Custom Fertilizer Dosage and Prescription",
        ),
    }

    return PaymentMiddlewareASGI, routes, server

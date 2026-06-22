"""
One-time seed script for the countries table.
Run from backend/ with the venv active:

    PYTHONPATH=. python seeds/seed_countries.py

Idempotent: skips any country whose name already exists.
Only stable, verifiable fields are seeded (name, iso_code, region, currency).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase  # noqa: E402 — path insertion above is required

# fmt: off
# ISO 3166-1 alpha-2 codes · ISO 4217 currency codes
COUNTRIES = [
    # ── Europe ──────────────────────────────────────────────────────────────
    {"name": "Austria",        "iso_code": "AT", "region": "Europe",        "currency": "EUR"},
    {"name": "Belgium",        "iso_code": "BE", "region": "Europe",        "currency": "EUR"},
    {"name": "Czech Republic", "iso_code": "CZ", "region": "Europe",        "currency": "CZK"},
    {"name": "Cyprus",         "iso_code": "CY", "region": "Europe",        "currency": "EUR"},
    {"name": "Denmark",        "iso_code": "DK", "region": "Europe",        "currency": "DKK"},
    {"name": "Estonia",        "iso_code": "EE", "region": "Europe",        "currency": "EUR"},
    {"name": "Finland",        "iso_code": "FI", "region": "Europe",        "currency": "EUR"},
    {"name": "France",         "iso_code": "FR", "region": "Europe",        "currency": "EUR"},
    {"name": "Germany",        "iso_code": "DE", "region": "Europe",        "currency": "EUR"},
    {"name": "Greece",         "iso_code": "GR", "region": "Europe",        "currency": "EUR"},
    {"name": "Hungary",        "iso_code": "HU", "region": "Europe",        "currency": "HUF"},
    {"name": "Ireland",        "iso_code": "IE", "region": "Europe",        "currency": "EUR"},
    {"name": "Italy",          "iso_code": "IT", "region": "Europe",        "currency": "EUR"},
    {"name": "Latvia",         "iso_code": "LV", "region": "Europe",        "currency": "EUR"},
    {"name": "Lithuania",      "iso_code": "LT", "region": "Europe",        "currency": "EUR"},
    {"name": "Malta",          "iso_code": "MT", "region": "Europe",        "currency": "EUR"},
    {"name": "Netherlands",    "iso_code": "NL", "region": "Europe",        "currency": "EUR"},
    {"name": "Norway",         "iso_code": "NO", "region": "Europe",        "currency": "NOK"},
    {"name": "Poland",         "iso_code": "PL", "region": "Europe",        "currency": "PLN"},
    {"name": "Portugal",       "iso_code": "PT", "region": "Europe",        "currency": "EUR"},
    {"name": "Romania",        "iso_code": "RO", "region": "Europe",        "currency": "RON"},
    {"name": "Spain",          "iso_code": "ES", "region": "Europe",        "currency": "EUR"},
    {"name": "Sweden",         "iso_code": "SE", "region": "Europe",        "currency": "SEK"},
    {"name": "Switzerland",    "iso_code": "CH", "region": "Europe",        "currency": "CHF"},
    {"name": "Turkey",         "iso_code": "TR", "region": "Europe",        "currency": "TRY"},
    {"name": "United Kingdom", "iso_code": "GB", "region": "Europe",        "currency": "GBP"},
    # ── North America ────────────────────────────────────────────────────────
    {"name": "Canada",         "iso_code": "CA", "region": "North America", "currency": "CAD"},
    {"name": "United States",  "iso_code": "US", "region": "North America", "currency": "USD"},
    # ── Oceania ──────────────────────────────────────────────────────────────
    {"name": "Australia",      "iso_code": "AU", "region": "Oceania",       "currency": "AUD"},
    {"name": "New Zealand",    "iso_code": "NZ", "region": "Oceania",       "currency": "NZD"},
    # ── East Asia ────────────────────────────────────────────────────────────
    # Japan is already seeded (id=1) — the idempotency check will skip it.
    {"name": "China",          "iso_code": "CN", "region": "East Asia",     "currency": "CNY"},
    {"name": "South Korea",    "iso_code": "KR", "region": "East Asia",     "currency": "KRW"},
    # ── Southeast Asia ───────────────────────────────────────────────────────
    {"name": "Malaysia",       "iso_code": "MY", "region": "Southeast Asia","currency": "MYR"},
    {"name": "Singapore",      "iso_code": "SG", "region": "Southeast Asia","currency": "SGD"},
    # ── Middle East ──────────────────────────────────────────────────────────
    {"name": "Qatar",          "iso_code": "QA", "region": "Middle East",   "currency": "QAR"},
    {"name": "Saudi Arabia",   "iso_code": "SA", "region": "Middle East",   "currency": "SAR"},
    {"name": "United Arab Emirates", "iso_code": "AE", "region": "Middle East", "currency": "AED"},
    # ── South Asia ───────────────────────────────────────────────────────────
    {"name": "Bangladesh",     "iso_code": "BD", "region": "South Asia",    "currency": "BDT"},
]
# fmt: on


def main() -> None:
    existing_result = supabase.table("countries").select("name").execute()
    existing_names = {row["name"] for row in existing_result.data}

    to_insert = [c for c in COUNTRIES if c["name"] not in existing_names]
    skipped = len(COUNTRIES) - len(to_insert)

    if to_insert:
        supabase.table("countries").insert(to_insert).execute()

    print(f"Done. Inserted: {len(to_insert)}, Skipped (already existed): {skipped}")


if __name__ == "__main__":
    main()

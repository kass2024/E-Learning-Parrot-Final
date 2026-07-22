#!/usr/bin/env python3
"""Copy MoPay merchant connection keys from Kalisa into Xander .env.

Receiver MSISDN stays owned by Platform Settings (SiteSetting), same as Kalisa —
do not seed another product's receiver into MOPAY_RECEIVER_ACCOUNT_NO.
Xander keeps its own project slug + callback URL.
"""
from __future__ import annotations

import re
from pathlib import Path

KALISA_ENV = Path(r"C:\methode\water_level\E-Learning-Kalisa-FR\E-learning-parrot-backend\.env")
XANDER_ENV = Path(r"C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-backend\.env")

# Merchant / gateway connection keys only (shared MoPay account if Xander has none yet)
COPY_FROM_KALISA = [
    "MOPAY_ACCOUNT_ID",
    "MOPAY_AUTH_KEY",
    "MOPAY_BEARER_TOKEN",
    "MOPAY_TOKEN_URL",
    "MOPAY_SERVER_BASE_URL",
    "MOPAY_CALLBACK_SIGNING_KEY",
    "MOPAY_CATEGORY",
    "MOPAY_DEFAULT_CURRENCY",
    "MOPAY_DEFAULT_COUNTRY_CODE",
    "MOPAY_DEFAULT_MNO",
]

# Xander product identity — never copy Kalisa callback/receiver/slug
XANDER_FORCE = {
    "MOPAY_PROJECT_SLUG": "xander",
    "MOPAY_MESSAGE_PREFIX": "XANDER",
    "MOPAY_CALLBACK_URL": "https://api.xanderglobalacademy.com/api/admin/payments/mopay/webhook",
    "MOPAY_PAYMENT_TITLE": "Xander_course_payment",
    "MOPAY_PAYMENT_DETAILS": "Course_enrollment_payment",
    # Receiver lives in Settings → Payments (SiteSetting). Env fallback stays empty.
    "MOPAY_RECEIVER_ACCOUNT_NO": "",
}


def parse_env(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def upsert_keys(text: str, updates: dict[str, str]) -> str:
    lines = text.splitlines()
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k = stripped.split("=", 1)[0].strip()
            if k in updates:
                out.append(f"{k}={updates[k]}")
                seen.add(k)
                continue
        out.append(line)
    missing = [k for k in updates if k not in seen]
    if missing:
        if out and out[-1].strip():
            out.append("")
        out.append("# MoPay / Mobile Money — Xander (receiver set in Settings → Payments)")
        for k in missing:
            out.append(f"{k}={updates[k]}")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    kalisa = parse_env(KALISA_ENV.read_text(encoding="utf-8", errors="replace"))
    raw = XANDER_ENV.read_text(encoding="utf-8", errors="replace")

    updates: dict[str, str] = dict(XANDER_FORCE)
    for k in COPY_FROM_KALISA:
        if kalisa.get(k, "").strip():
            updates[k] = kalisa[k].strip()

    XANDER_ENV.write_text(upsert_keys(raw, updates), encoding="utf-8", newline="\n")

    check = parse_env(XANDER_ENV.read_text(encoding="utf-8", errors="replace"))
    print("Updated", XANDER_ENV)
    for k in sorted(set(COPY_FROM_KALISA) | set(XANDER_FORCE)):
        val = check.get(k, "")
        if k in ("MOPAY_PROJECT_SLUG", "MOPAY_MESSAGE_PREFIX", "MOPAY_CALLBACK_URL", "MOPAY_PAYMENT_TITLE", "MOPAY_CATEGORY", "MOPAY_DEFAULT_CURRENCY", "MOPAY_DEFAULT_COUNTRY_CODE", "MOPAY_DEFAULT_MNO", "MOPAY_SERVER_BASE_URL"):
            print(f"  {k}={val}")
        else:
            print(f"  {k}={'SET' if val else 'EMPTY'}")
    print("Receiver: use Settings -> Payments (not env). MOPAY_RECEIVER_ACCOUNT_NO left EMPTY.")
    print("NOTE: Shared MoPay merchant with F&R - registering Xander callbacks overwrites F&R callback URL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# GP-FET — Freight Estimate Tool

Web-based freight rate estimator for GP. Looks up truck and rail rates by origin
facility and destination, with Google Maps mileage and a % adjustment slider.

## Files

- **`index.html`** — single-page web app. Open directly or host on GitHub Pages.
- **`rates.json`** — rate database loaded at runtime.

## Data Sources

| Mode  | Source file                | Rows    |
|-------|----------------------------|---------|
| TRUCK | `FR00_Gen_2.xlsx`          | 5,999   |
| RAIL  | `GP_Rail_Freight.xlsx`     | 158,572 |

Total: 164,571 rate rows in `rates.json` (~16 MB).

## rates.json schema

```json
{
  "rates": [
    [mode, uom, rate, flat, currency, minCharge, bandMin, bandMax, equip,
     origLoc, origStateField, origCountry,
     destLoc, destStateField, destPostal, destCountry],
    ...
  ],
  "origin_zips": { "ROME,GA,US": "30161", ... }
}
```

- `mode`: `"TRUCK"` or `"RAIL"`
- `uom`: `"MI"` (per-mile) or `"FC"` (flat charge)
- `rate`: per-mile rate (when uom = MI)
- `flat`: flat charge per load (when uom = FC) — for rail this is the Grand Total
- `equip`: equipment code (e.g. `48FT000`, `60BX000HV`, `73RF000`, `B60`, `C73`)
- `origLoc` / `destLoc`: `"CITY,ST,COUNTRY"` format (uppercase)
- `bandMin`/`bandMax`: trip-mile band (when a rate only applies in a mile range)

## Rate matching logic

1. Filter by selected mode (TRUCK/RAIL).
2. For RAIL, optionally filter by equipment group (Boxcar/Centerbeam/All/Compare).
3. Score each rate row 0–33: origin match (×10) + destination match (×1).
   - City+state exact match = 3, state-only = 2, blank/wildcard = 1.
4. Drop rows whose mileage band doesn't include the calculated trip miles.
5. Tiebreak by equipment priority (60BX000HV > 60BX000 > 50BX000, etc.).

## Rail equipment grouping

Handles both long-form codes (`60BX000HV`, `73RF000HH`) and short-form codes
(`B60`, `B63`, `H63`, `C73`, `H73`, `F60`) found in KBX rail data.

- **BOXCAR**: codes containing `BX`/`CH`, or starting with `B`/`H` followed by digits
- **CENTERBEAM**: codes containing `RF`/`BF`, or starting with `C`/`F`/`HF` followed by digits

## Regenerating rates.json

Drop the two Excel files alongside `build_rates.py` and run it. The script
forward-fills banded rate continuation rows, normalizes location strings, and
writes `rates.json`.

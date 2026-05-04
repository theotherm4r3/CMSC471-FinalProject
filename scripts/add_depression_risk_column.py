#!/usr/bin/env python3
"""Append depression_risk_number = mean of PHQ-related item columns (valid values only)."""

from __future__ import annotations

import csv
import math
import sys
from pathlib import Path

# NHANES/R export missing sentinel seen in this dataset
MISSING_SENTINEL = 5.397605346934028e-79

PHQ_COLS = [
    "Have_little_interest_in_doing_things",
    "Feeling_down_depressed_or_hopeless",
    "Trouble_sleeping_or_sleeping_too_much",
    "Feeling_tired_or_having_little_energy",
    "Poor_appetite_or_overeating",
    "Feeling_bad_about_yourself",
    "Trouble_concentrating_on_things",
    "Moving_or_speaking_slowly_or_too_fast",
    "Thought_you_would_be_better_off_dead",
    "Difficulty_these_problems_have_caused",
]

NEW_COL = "depression_risk_number"


def parse_item(raw: str) -> float | None:
    s = raw.strip()
    if not s:
        return None
    try:
        v = float(s)
    except ValueError:
        return None
    if math.isnan(v):
        return None
    if math.isclose(v, MISSING_SENTINEL, rel_tol=0.0, abs_tol=1e-90):
        return None
    return v


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "data" / "combined_NHANES.csv"
    if not csv_path.is_file():
        print(f"Not found: {csv_path}", file=sys.stderr)
        return 1

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        print("Empty CSV", file=sys.stderr)
        return 1

    header = rows[0]
    missing = [c for c in PHQ_COLS if c not in header]
    if missing:
        print(f"Missing columns: {missing}", file=sys.stderr)
        return 1

    if NEW_COL in header:
        print(f"Column {NEW_COL!r} already exists; remove it first or pick another name.", file=sys.stderr)
        return 1

    idx_last_phq = max(header.index(c) for c in PHQ_COLS)
    insert_at = idx_last_phq + 1

    new_header = header[:insert_at] + [NEW_COL] + header[insert_at:]
    out_rows = [new_header]

    phq_indices = [header.index(c) for c in PHQ_COLS]

    for row in rows[1:]:
        if len(row) < len(header):
            row = row + [""] * (len(header) - len(row))
        vals = []
        for i in phq_indices:
            if i < len(row):
                p = parse_item(row[i])
                if p is not None:
                    vals.append(p)
        if vals:
            avg = sum(vals) / len(vals)
            cell = f"{avg:.10g}"
        else:
            cell = ""
        new_row = row[:insert_at] + [cell] + row[insert_at:]
        out_rows.append(new_row)

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(out_rows)

    print(f"Updated {csv_path} with column {NEW_COL!r} after {header[idx_last_phq]!r}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

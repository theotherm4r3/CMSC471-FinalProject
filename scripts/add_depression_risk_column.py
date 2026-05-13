#!/usr/bin/env python3
"""Append weighted PHQ-9 depression scores using survey weights."""
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
    "Thought_you_would_be_better_off_dead"
]

# Survey weight column name
WEIGHT_COL = "Full_sample_2_year_MEC_exam_weight"

# New columns to add
NEW_COLS = [
    "phq9_total",                          # Sum of PHQ-9 items (0-27 scale)
    "weighted_depression_score",           # phq9_total * survey_weight
    "depression_risk",                     # 1 if phq9_total >= 10, else 0
    "weighted_risk_contribution"           # depression_risk * survey_weight
]


def parse_item(raw: str) -> float | None:
    """Parse a cell value, returning None for missing/invalid data."""
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
    # NHANES codes 7 and 9 as "Refused" or "Don't Know"
    if v in (7.0, 9.0):
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
    
    # Check for required PHQ columns
    missing = [c for c in PHQ_COLS if c not in header]
    if missing:
        print(f"Missing PHQ columns: {missing}", file=sys.stderr)
        return 1
    
    # Check for survey weight column
    if WEIGHT_COL not in header:
        print(f"Missing survey weight column: {WEIGHT_COL!r}", file=sys.stderr)
        print(f"Available columns: {header}", file=sys.stderr)
        return 1
    
    # Check if any new columns already exist
    existing = [c for c in NEW_COLS if c in header]
    if existing:
        print(f"Columns already exist: {existing}", file=sys.stderr)
        print(f"Remove them first or pick different names.", file=sys.stderr)
        return 1

    # Find insertion point: after the last PHQ column
    idx_last_phq = max(header.index(c) for c in PHQ_COLS)
    insert_at = idx_last_phq + 1
    
    # Create new header
    new_header = header[:insert_at] + NEW_COLS + header[insert_at:]
    out_rows = [new_header]
    
    # Get column indices
    phq_indices = [header.index(c) for c in PHQ_COLS]
    weight_idx = header.index(WEIGHT_COL)
    
    # Process data rows
    for row in rows[1:]:
        # Pad row if needed
        if len(row) < len(header):
            row = row + [""] * (len(header) - len(row))
        
        # Parse PHQ values (ignoring missing/invalid)
        vals = []
        for i in phq_indices:
            if i < len(row):
                p = parse_item(row[i])
                if p is not None:
                    vals.append(p)
        
        # Calculate PHQ-9 total (sum, not average - standard scoring)
        if vals:
            phq9_total = sum(vals)
            phq9_total_str = f"{phq9_total:.10g}"
        else:
            phq9_total = None
            phq9_total_str = ""
        
        # Parse survey weight
        weight = None
        if weight_idx < len(row):
            weight = parse_item(row[weight_idx])
        
        # Calculate weighted scores
        if phq9_total is not None and weight is not None:
            weighted_score = phq9_total * weight
            weighted_score_str = f"{weighted_score:.10g}"
            
            # Depression risk: 1 if PHQ-9 total >= 10, else 0
            depression_risk = 1 if phq9_total >= 10 else 0
            depression_risk_str = str(depression_risk)
            
            # Weighted risk contribution
            weighted_risk = depression_risk * weight
            weighted_risk_str = f"{weighted_risk:.10g}"
        else:
            weighted_score_str = ""
            depression_risk_str = ""
            weighted_risk_str = ""
        
        # Build new row with all new columns
        new_cells = [
            phq9_total_str,
            weighted_score_str,
            depression_risk_str,
            weighted_risk_str
        ]
        
        new_row = row[:insert_at] + new_cells + row[insert_at:]
        out_rows.append(new_row)
    
    # Write back to file
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(out_rows)
    
    print(f"Updated {csv_path} with weighted depression scores:")
    print(f"  - {NEW_COLS[0]}: PHQ-9 total score (sum of items)")
    print(f"  - {NEW_COLS[1]}: Weighted by survey weights")
    print(f"  - {NEW_COLS[2]}: Binary risk indicator (1 if score >= 10)")
    print(f"  - {NEW_COLS[3]}: Weighted risk contribution")
    print(f"Inserted after column: {header[idx_last_phq]!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
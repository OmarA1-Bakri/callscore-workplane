# autoresearch — Program

This is a template. Copy it to `<your-repo>/auto/program.md` and customize.

## Goal

Get the lowest/highest [YOUR METRIC HERE].

## Target File

`[PATH TO THE ONE FILE THE AGENT EDITS]`

This file contains [DESCRIBE WHAT THE FILE DOES].

## What "Better" Means

[DESCRIBE YOUR METRIC AND DIRECTION]
- Metric name: `[metric_name]`
- Direction: `[lower/higher]` is better
- Current best: `[value]` (updated automatically in results.tsv)

## What You CAN Do

- Modify the target file — everything is fair game: [LIST WHAT'S IN SCOPE]
- Example changes: [refactor logic, change parameters, swap algorithms, rewrite prompts, etc.]

## What You CANNOT Do

- Modify any file other than the target file
- Install new packages or add dependencies
- Modify the bench script or evaluation harness
- Break existing functionality (tests must still pass)
- [ADD YOUR SPECIFIC CONSTRAINTS]

## Simplicity Criterion

All else equal, simpler is better:
- Small improvement + ugly complexity → probably not worth it
- Equal metric + simpler code → definitely keep
- Improvement from DELETING code → always keep

## Context

[PROVIDE RELEVANT CONTEXT THE AGENT NEEDS]
- What does the codebase do?
- What are the key constraints?
- What approaches have been tried before?
- Links to relevant docs or papers

## Hints

If you get stuck, try:
1. Combine two near-miss ideas that each almost improved the metric
2. Try the opposite of your last 3 failed experiments
3. Re-read this program.md for angles you haven't explored
4. Try radical simplification — remove features and see if metric holds
5. [ADD DOMAIN-SPECIFIC HINTS]

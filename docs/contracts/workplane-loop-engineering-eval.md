# Workplane Loop Engineering Eval Contract

`loop_engineering_eval` is a report-only Workplane job for extraction improvement loops.

## Required properties

- execution location: HH
- dry run by default
- local writes only
- no public action
- no external provider mutation
- no Whop mutation
- no production DB write
- no canonical call promotion
- no production default change

## Artifacts

- `.tmp/ml-idle-improve/<run-id>.loop-ml-idle.json`
- `.tmp/loop-engineering/<run-id>.json`
- workflow receipt

## Promotion rule

Loop output can inform review, but promotion must go through `extraction_promotion_review` and explicit operator approval.

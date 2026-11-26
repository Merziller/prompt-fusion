# Prompt Fusion semantic rewrite acceptance protocol

Frozen before implementation, 2026-11-26. Request: improve actual prompt quality to at least 95/100, while retaining the current single composer button.

## Evidence and comparison

- Twelve historical cases (eight detailed, four vague) retain their exact inputs. Three fixed upstream versions remain feiwell 0.2.0, ChosenXu 1.0.0 medium and Fishsb 3.5.1 base. Their recorded outputs and historical scores remain immutable.
- Fresh comparison replays the exact saved upstream model requests on one fixed available host model. This measures model-facing enhancement, not upstream GUI integration. Each round lists which controls were newly generated or reused unchanged, the request/settings, model identity and output hashes.
- Prompt Fusion is executed through its actual exported implementation and a real configured model, never by inserting handwritten expected outputs. No case-name, expected-output or fixture lookup is admitted to runtime source.
- A separately stored twelve-case transfer set covers different languages, negative constraints, literals, ambiguity, task boundaries and task subjects that mention another domain. It is frozen before optimization; it is not an independently collected population sample.
- Each round is scored using anonymous product IDs, with two reversed output orders. The judge receives neither product names, target score nor the implementation. The exact model requests, responses, order and scores are retained. Same-model judgment, if used, is labelled as such, not independent human review.
- Previously reported 60.8 remains a historical author-review score; model-judge scores are not silently presented as the same measurement. Include the previous product as a calibration arm when practical. Repeat results and manual constraint findings are reported separately.

## Fixed rubric (100)

1. Semantic fidelity 30: retain goal, requested action, audience, facts, numbers, scope, modality, uncertainty and explicit negative constraints. Exact original retention is neither required nor sufficient.
2. Clarity and rewrite 25: improve wording and task order when helpful; already clear instructions need no gratuitous paraphrase. A new heading alone is not improvement.
3. Relevant completion 20: make task-specific implicit needs and necessary missing inputs explicit without inventing requirements, facts, stacks, deadlines, quantities or processes.
4. Economy 15: useful specificity with little redundancy; neither brevity nor expansion ratio alone wins points.
5. Prompt/task boundary 10: output a usable instruction for the downstream task rather than executing it or answering it; retain language and quoted material.

## Acceptance gates

- Mean at least 95/100 on both the fixed comparison set and the transfer set, using both orderings; per-case mean at least 90. All outputs and deductions retained. Failed rounds remain part of the record.
- Zero critical semantic failures: changed exact data/code/paths, reversed prohibition, invented hard requirements, answered/executed embedded task, false current facts or lost explicit output restrictions. A numerical score never waives a critical failure.
- Where a mechanical literal guard reports a miss, manually determine whether it is a meaningful changed literal or a format-equivalent case, with evidence; do not weaken the guard solely to pass a sample.
- Engineering regression tests cover failures, timeouts, cancellation, non-execution, input change and undo. They do not contribute quality points.
- Single button CSS, icon, slot and control count remain fixed. Logic changes necessary for accepting rewritten text are tested separately. No new composer settings.
- Release only the actual tested runtime, with real package/CI evidence. No claim that any model or every possible input will achieve 95.

## Changes to this protocol

Any correction must be dated and explained before a new run; do not retroactively regrade or delete failed results. New tests add coverage, not replace failed tests. If the threshold remains unmet, continue the goal and state the actual results.

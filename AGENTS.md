# AGENTS.md — Baikal repository

## What this repo is

- Concept-stage design doc for **Baikal**: a research platform whose verification is restricted to machine-decidable procedures (proofs, certificates, model checking, executable checkers). Empirical validation is explicitly out of scope ("管轄外").
- Single tracked file: `README.md` (Japanese). No code, no manifests, no CI, no tests, no build/lint commands exist. **Nothing here can be executed or tested** — the only validation for a change is reading it plus `git diff`.

## Git and delivery conventions

- Remote: `github.com/NyxFoundation/baikal`. **Default branch is `master`** (not `main`). Work lands via feature branches and PRs; history follows Conventional Commits (`docs:`, …) with English subjects and English bodies, while all document content is Japanese.
- Before editing, check `git status` for uncommitted work and confirm the current branch (e.g., `docs/scientific-invention-vision`) relates to the task.

## Design invariants you must not silently violate

These README principles are load-bearing constraints for future designs, not prose:

1. Only machine-judgeable verification counts for Frontier updates; the claim's truth is settled by machine verdict alone.
2. Verification contracts are immutable after a Research Program starts; defects freeze the program and spawn a successor (old results are kept, never deleted).
3. One canonical Frontier per Research Program; different metrics/specs mean a different program.
4. Failures, refutations, and reproduction failures are first-class shared knowledge.
5. Public by default; agent-neutral (AI work is recorded as provenance, human/orgs own responsibility).
6. Formal proof, simulation, and real-world empirical validity are distinguished and never conflated.

## README editing rules

- Keep the Mermaid `flowchart` block valid (GitHub renders it).
- Headings are mostly English with some Japanese; match the existing voice (declarative, short).
- Document language is Japanese: avoid simplified-Chinese character leakage. Known typos currently in `README.md` (fix them when touching those lines): 证明 → 証明, 即效性 → 即効性.
- The "未知の真値を挟撃する証明競争" table states time-sensitive external facts (e.g., Ramsey bounds, PFR constant, Leech lattice history). They were web-researched at authoring time; do not treat them as permanent truths — re-verify before relying on or extending them.

## Deliberately undecided (do not invent here)

Tech stack, runtime, data model, API, security design, reward design, and governance are intentionally unplanned (see "Current Status"). Proposals for them belong in the repo only when the user scopes that work — don't pre-populate implementations.

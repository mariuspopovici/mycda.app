# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

MyCdA.app is being revived after several years with little change, and its whole stack is being replaced. The reasoning behind earlier choices was never written down. Changes such as altering the physics, the data model or the security model need their rationale and evidence kept next to the code.

## Decision

Keep an engineering archive in `docs/`: architecture, design, numbered ADRs, plans, and a dated log of investigations. Write ADRs for decisions that are costly to reverse or likely to be questioned later.

## Consequences

- Decisions and their evidence can be found without digging through history.
- PRs that change architecture, data shapes, security or analysis results should add or reference an ADR or a log entry.

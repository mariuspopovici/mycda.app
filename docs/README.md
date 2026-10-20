# MyCdA engineering archive

Architecture, design, decisions and engineering history for MyCdA.app. Code says *what* the system does; this archive records *why*, what was considered, and what was measured.

| Folder | Contents | When to update |
|---|---|---|
| [architecture/](architecture/) | How the system fits together: components, data flow, data model, security | When a component, data flow, collection or storage path changes |
| [design/](design/) | How the analysis works: virtual elevation, wind model, loop detection, testing | When an algorithm or its edge-case handling changes |
| [decisions/](decisions/) | Architecture decision records (ADRs), numbered and immutable | For any decision that is costly to reverse or that someone will later ask "why?" about |
| [plans/](plans/) | Multi-step plans with status | When a phase starts, finishes or changes scope |
| [log/](log/) | Dated engineering records: surveys, evaluations, investigations, with numbers | When an investigation produces data worth keeping |

## Start here

1. [architecture/overview.md](architecture/overview.md): the system today and the target system
2. [plans/modernization.md](plans/modernization.md): where the migration stands
3. [plans/roadmap.md](plans/roadmap.md): what's next for the product, and why in that order
4. [decisions/README.md](decisions/README.md): the decision index
5. [design/virtual-elevation.md](design/virtual-elevation.md): the core of the product

## Conventions

- Write in present tense for the current state. Put history in ADRs and the log.
- ADRs are never edited after acceptance, except to set their status to *Superseded by ADR-NNNN*. Record a changed decision in a new ADR.
- Log entries are named `YYYY-MM-DD-topic.md` and keep the numbers that justified a decision.
- Refer to personal ride fixtures by file ID prefix, not by ride name or location.

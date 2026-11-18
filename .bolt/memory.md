# Project memory

## Product intent & audience

- Availability evaluation tool with an LLM-explanation feature.
- Engineering audience: contributors follow AGENTS.md practices.

## Brand personality & voice

- Production-quality, non-cookie-cutter UI (per global instructions in `.bolt/prompt`).

## Visual design & UX direction

- React + Vite + Tailwind CSS; JSX; Lucide React icons.
- Use `@/` path alias for project imports.
- "Explain availability" feature: optional button + clearly labeled explanation area beneath the result.

## Decisions, constraints & rationale

- AGENTS.md holds the canonical list of coding practices/constraints; editing it is a deliberate, scoped action.
- Practice #11 exception (approved by Zarina): one optional "Explain availability" feature is allowed.
- LLM is local `MockLLMAdapter` only — no real API calls, keys, or network.
- `evaluate()` is the single source of truth for results.
- Explanation code must never mutate `kind`, `reason`, or `bookings`.
- All other AGENTS.md constraints remain in force.

## Open questions & assumptions

- Full AGENTS.md content (including other practices) not yet in memory; only Practice #11 exception is visible.
- Exact domain semantics of `kind`, `reason`, `bookings` inferred as evaluation outputs, not yet confirmed.
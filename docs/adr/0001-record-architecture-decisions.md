# 1. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Wyrms & Vines is built over many conversations with Claude, whose memory of a long chat is a compressed summary. Decisions and the reasons behind them get lost, and later work can undo them by accident. The sister project Dragon & Bard started keeping ADRs for the same reason, and Wyrms & Vines will later become a tournament game at its Inn, so the two should be documented the same way.

## Decision

We keep Architecture Decision Records in `docs/adr/`, one short Markdown file per decision, numbered in order. Each has a status (Proposed, Accepted, Superseded by NNNN), the context, the decision and its consequences. A decision is never edited away: when it changes, a new ADR supersedes the old one. Decisions made before this ADR were written up retroactively on 2026-11-22, including choices that changed during playtesting, so the path is visible.

## Consequences

Anyone, whether a new conversation or a future collaborator, can see what was decided and why. Writing an ADR adds a small step to significant decisions. Ideas and plans stay in GitHub Issues (ADR 0013); an ADR records the outcome.

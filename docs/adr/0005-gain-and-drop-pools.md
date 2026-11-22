# 5. Vines and wyrms are drawn from near-equal gain and drop pools

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

At first, each board picked 7–9 vines and 7–9 wyrms of random lengths. Measured over 1,000 boards, the wyrms dropped between 0.8 and 1.4 times as far as the vines climbed. So some boards were quietly much meaner than others, while the counts looked the same.

## Decision

Each board picks a gain pool of 130–160 squares and a drop pool of 0.95–1.1 times that. Wyrms are drawn until the drop pool is used up, starting with the end-zone wyrms, which count towards it. Vines are then drawn until the gain pool is used up. Sizes are picked so that no leftover is too small for one more link. A board is accepted only if both totals land within 6 squares of their pools. The number of vines and wyrms is no longer fixed: a board with a few long vines gets fewer of them.

## Consequences

Boards have similar overall generosity, about 139 up and 139 down on average, with about 7 of each. It costs a few more generation attempts. The pool sizes and ratio are settings for playtesting.

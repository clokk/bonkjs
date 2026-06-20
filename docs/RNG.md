# Rng — seeded random

`Rng` is a small, fast, **seedable** pseudo-random generator (mulberry32). The same seed always produces the same
stream — the building block for **reproducible procedural generation**, shareable seeds, replays, and seeded tests.

```typescript
import { Rng } from 'bonkjs';

const rng = new Rng(12345);        // seed it…
rng.next();                        // 0..1
rng.int(1, 6);                     // dice roll, inclusive
rng.pick(['sword', 'bow', 'gun']); // a random element
rng.bool(0.25);                    // true 25% of the time
rng.shuffle(deck);                 // in-place Fisher-Yates

const auto = new Rng();            // auto-seeded — but still capturable:
console.log('seed', auto.seed);    // log it to reproduce this run later
```

## API

| Member | Returns | Notes |
|--------|---------|-------|
| `new Rng(seed?)` | — | Omit `seed` to auto-seed from `Math.random()` (still readable via `.seed`) |
| `.seed` | `number` | The original seed — **log/share it to reproduce the stream** |
| `next()` | `number` | float in `[0, 1)` |
| `range(min, max)` | `number` | float in `[min, max)` |
| `int(min, max)` | `number` | integer in `[min, max]` — **inclusive** both ends |
| `pick(arr)` | `T` | a uniformly-random element |
| `bool(p=0.5)` | `boolean` | true with probability `p` |
| `shuffle(arr)` | `T[]` | in-place Fisher-Yates; returns the same array |
| `fork()` | `Rng` | an independent child stream (per-subsystem / per-entity) |
| `state` (get/set) | `number` | capture/restore the stream position (replays, save-states) |

## Reproducible content vs. lockstep determinism

A seeded `Rng` makes you reproducible **within one build** — perfect for "share this seed", daily challenges,
debug-by-seed, same-build replays, and exact-assertion tests. It does **not** by itself give you true
**cross-client lockstep determinism**: that also requires floating-point consistency (`Math.sin`/`cos`/`sqrt` can
differ across JS engines), fixed iteration order (`Map`/`Set`), and a fixed-step clock with no wall-time reads.
bonkjs ships the `Rng` brick; whether a game enforces full determinism (routing *all* randomness through one
seeded `Rng`, fixing the rest) is a game-level discipline.

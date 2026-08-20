# Design Wars Simulator

Design Wars is a **simulation content generator**, not a conventional game. Four interior-design philosophies ricochet around a physics arena while their preferences subtly influence what they chase.

The visual language is intentionally primitive: circles, boxes, labels and physics. The goal is to create short-form moments that are understandable almost immediately and entertaining because the designers behave like physical objects with opinions.

## Navigation model

Designers do **not** pathfind to furniture.

Their movement is a hybrid of:

- constant 34 px/s cruise speed
- Matter physics and wall collisions
- short target locks
- preference-weighted target selection
- weak steering pulses applied to the existing velocity
- small random steering noise
- collision disruption

Physics remains dominant. A steering pulse nudges the current velocity and then normalizes it back to cruise speed; it never replaces the current trajectory with a direct route to an item.

A designer can therefore want a chair, bend toward it, overshoot it, bounce off a wall, collide with another designer and end up pursuing something completely different.

## Designer personalities

| Designer | Steering | Randomness | Persistence | Reconsideration | Personality |
|---|---:|---:|---:|---:|---|
| Rustic | Moderate | Moderate | High | Moderate | Likes wood, natural, warm and handmade objects. |
| Minimalist | Weak | Low | Very high | Slow | Commits strongly to a small set of compatible objects. |
| Maximalist | Strong | High | Low | Fast | Easily tempted by decorative, colorful and patterned objects. |
| Coastal | Moderate | Moderate | High | Moderate | Chases blue, white, natural and light objects. |

These differences come from parameters rather than designer-specific navigation code.

## Target selection

Each candidate receives a desirability score based on:

- preference score
- distance penalty
- rarity bonus
- target persistence
- seeded random variation

The highest desirability object normally wins, but the random term means a designer can occasionally choose a slightly worse opportunity. If no preferred object is within range, the designer selects any available object rather than becoming stationary.

Targets have a short lock. Rustic, Coastal and the other personalities can therefore commit to a target long enough to visibly pursue it, while collisions, collection, or lock expiry can cause a new decision.

## Steering

Steering is deliberately weak. Conceptually:

```text
current velocity
      +
small steering nudge toward target
      +
small random noise
      ↓
normalize back to cruise speed
```

The designer never rotates instantly toward the target and never slows down to make a turn.

Directional change comes from three things:

1. Matter physics and natural bouncing
2. tiny steering pulses while travelling
3. a small additional correction immediately after a physical wall/designer collision

Designer collisions remain physical. A collision has a personality-dependent chance to disrupt the current target and create a new decision.

## Visual feedback

The current target receives a very subtle highlight and, when nearby enough to matter, a faint line from the designer to the target. Collision impacts briefly pulse the designer. These effects are intentionally restrained so the primitive physics remains the star of the short-form video.

## Tuning parameters

The main developer tuning values live at the top of `script.js` in `CONFIG` and the designer definitions.

Useful controls include:

- `cruiseSpeed`
- `steeringStrength`
- `randomSteering`
- `attractionRange`
- `targetLockMin`
- `targetLockMax`
- `reconsiderInterval`
- `collisionDisruptionChance`
- `impactSteering`
- `impactRandomness`

Each designer also exposes its own steering strength, randomness, persistence, range, reconsideration interval and collision disruption chance.

## Seeded runs

`RUN TEST` starts a fresh 60-second simulation with a new seed.

`RERUN SAME SEED` repeats the same initial random sequence, making it useful for comparing movement changes during development.

The seed is shown in the final result summary. The simulation uses a seeded RNG for target selection, item generation and movement randomness so repeated runs are meaningfully comparable.

## Escalation

The 60-second simulation escalates every ten seconds:

1. Opening items
2. More furniture
3. More chaos
4. Rare items
5. Rule modifiers
6. Item flood

Rule modifiers include blue items worth double, plants worth triple and furniture worth half.

## Running locally

Because this is a static Phaser site, no build step is required.

Open `index.html` through a simple local web server or use a static hosting service. Phaser is loaded from the jsDelivr CDN.

## GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Select the `main` branch as the publishing source.
4. GitHub Pages will serve `index.html` directly.

## Future directions

The architecture is intentionally ready for:

- more design philosophies
- product or CSV imports
- tournament mode
- multiple arenas
- video recording/export
- real product catalogs from Bella Casa Vita Bella

The important rule is to preserve the primitive visual language and the physics-first behavior. The simulation should feel emergent rather than scripted.

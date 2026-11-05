# v0.3 — quadruped / face rewrite

This is an anatomy and procedural-animation replacement, not a claim that the original photorealistic character-art target has been met.

## Replaced

- Removed the upright, oversized-head toy silhouette. The kitten has a horizontal, continuous ribcage/waist/haunch surface, smaller facial features, thinner pinnae and a muzzle/jaw.
- Removed mirrored sine-wave leg swings. Walking uses a four-beat lateral sequence; trotting uses diagonal pairs. The stance and swing portions have different timing, with lifted paws during swing and level paw targets during stance.
- Added upper/lower joint solving and continuous deforming limb surfaces. Rear legs have a distinct hock/distal section rather than a second pair of forelegs.
- Stride progression depends on actual movement speed (including vertical screen travel), not the global idle timer. The gait clock settles when the cat stops.
- Desktop travel now accelerates/decelerates toward a target rather than starting at full speed; the stopping radius remains bounded.
- Body orientation follows both desktop velocity components with shortest-angle turning. Standing no longer snaps backwards as velocity decays to zero.
- Added slower sit/sleep pose blending, lowered shoulders during stretching, a one-shot pounce with anticipation, and grooming-paw/head contact poses.
- Replaced eye squashing with covering eyelids, smaller reflective eyes/slit pupils and irregular timed blinks. Head tracking is relative to the current body heading and is suppressed during sleep.
- Replaced the stiff tail with a tapered nine-bone skinned tail and damped attention/ear motion.

## Try it

The separate control panel has an **Animation preview** selector on Dashboard and Appearance. Compare Walking, Trotting, Sitting, Sleeping, Stretching, Grooming, Pawing, Pouncing and Yawning. This changes only the panel preview, not the live desktop behavior settings. Clicking the desktop pet still cannot open controls.

## Evidence and boundaries

`tests/locomotion.test.cjs` covers footfall phasing, diagonal pairing, stance/swing continuity, paw height, reachable two-bone IK lengths, vertical travel, stopped gait and frame-rate-independent blending. Browser tests exercise every preview pose and native-style vertical movement. Tests prove these mechanics, **not** that the animal looks photorealistic.

The model remains procedural. It has no scanned coat, professional facial blendshapes, motion capture, muscle simulation or physically groomed fur. The walk is not an authored feline animation clip, trotting is not a high-speed gallop, and screen-space travel is not a full 3D ground/contact simulation. A licensed, anatomically modeled and professionally animated cat asset is still the right production path for photorealism.

The v0.2 installer does not contain this rewrite. Use a v0.3 artifact when available; Windows build and smoke status must be checked separately from local renderer tests.

---
name: animated-learning-flows
description: Design, build, or refine focused educational animations that make matching, movement, accumulation, splitting, merging, or changing frames visible. Use for animated lesson flows, algorithm explainers, and interactive concept demonstrations; preserve whether the user requests options, a design, or implementation.
---

# Animated Learning Flows

Make the mechanism visible through motion. A learner should be able to follow an identifiable input through one transformation and explain where the result came from.

## Choose what to show

- Inspect the lesson, authoritative data or rules, audience, and target surface before choosing a visual. Reuse the host’s components and language. An existing page does not imply a new app, framework, backend, or deployment.
- Focus the main canvas on one concept at a time. Choose the smallest source-backed example that exposes the mechanism; three to five records is often useful, not a fixed limit. Label a subset or invented simplification and preserve ordering, units, ties, missing values, and relevant exceptions.
- Use stable input identities and spatial origins. Show matching with connections, splitting with distinct destinations, grouping with arrivals and partial totals, or a frame with a moving boundary. Preserve the visible relationship between the input and its output.
- Keep one short changing caption beside the scene. Put SQL/code, long explanations, quizzes, and full tables in optional disclosures unless the requested experience calls for them. Avoid turning the animation into a dense worksheet.

## Build the interaction

- Separate a deterministic calculation/snapshot model from rendering. Verify that model independently against the source or actual execution. Label a simulation clearly; a conceptual flow does not establish a system’s physical execution behavior.
- Start paused. Provide a few native controls, normally Play/Pause, Next, and Replay. Next animates one transformation and stops; during an active transition it may complete that transition and stop. Replay returns to the initial state. Keep control elements stable so focus survives rendering.
- Animate the computation itself, rather than merely changing highlights between finished tables. Keep movement visible long enough to follow. Reveal a matched output or updated total when the moving input arrives, with one unambiguous commit per transition.
- Pause must freeze the current position and progress. Resume from that position. Pause when the document is hidden or the activity leaves view. Cancel scheduled work on replay, concept changes, and unmount so old callbacks cannot change the new scene. Read [the animation contract](references/animation-contract.md) when implementing these mechanics.
- Recompute geometry for narrow screens when scaling would make text unreadable. Keep direct labels near their objects, reserve destinations before arrivals, and keep the scene’s height manageable. Do not shrink a wide desktop diagram into tiny mobile text.
- Support keyboard operation, visible focus, meaningful textual step feedback, reduced motion, and a usable semantic alternative. Reduced motion should preserve the same transitions and results without travel; continuous playback remains opt-in.

## Verify the experience

- Check intermediate calculations, final results, identity preservation, and fresh replay state. Use an independent oracle where available; do not derive every expected value from the renderer’s own model.
- In a rendered browser, sample a moving object’s coordinates at two times, pause mid-transition and confirm coordinates remain fixed, then resume. Also check arrival-time output commits, single-step stopping, rapid replay/concept switches, final stopping, hidden/offscreen pause, and reduced motion. Final row counts alone do not verify animation.
- Inspect normal and narrow layouts, text size, clipping, keyboard focus, and the semantic fallback. Report which checks ran and distinguish local verification from publication.

For an adaptable example and optional visual references, read [examples and inspiration](references/examples-and-inspiration.md). External inspiration is optional; consult it when useful and verify its current content before relying on it. Do not copy external code or assets without checking permission.

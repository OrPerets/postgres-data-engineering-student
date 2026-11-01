# Animation contract

Use this reference when implementing controllable transitions. SVG, canvas, HTML, Web Animations, and an existing host animation library are all valid. Choose the simplest mechanism that preserves the following behavior.

## State and commits

Keep an authoritative model of the data separate from the visible player state:

```text
lesson = immutable inputs + ordered deterministic snapshots
player = concept, committedStep, inFlight, progress[0..1], running, autoplay
lifetime = generation, frameHandle, delayHandle
```

Each transition has an initial snapshot, a target snapshot, and interpolation geometry. Interpolation moves temporary objects or boundaries; it does not add a completed output. Commit the target exactly once on arrival, then remove the temporary object. Intermediate accumulated totals should be model snapshots, not values inferred from animated screen positions.

Keep model snapshots independent: changing a later state must not mutate an earlier state, the source inputs, or a fresh replay. Layout changes may recalculate coordinates while retaining the same normalized progress.

## A minimal requestAnimationFrame pattern

This is lifecycle pseudocode to adapt to the host, not a required framework or complete player. `renderTransition` draws temporary movement at normalized progress; `commitTargetOnce` applies the next model snapshot.

```javascript
let generation = 0;
let frameHandle = null;
let delayHandle = null;
let lastTime = null;
let progress = 0;
let inFlight = false;
let running = false;
let autoplay = false;

function cancelScheduled() {
  if (frameHandle !== null) cancelAnimationFrame(frameHandle);
  if (delayHandle !== null) clearTimeout(delayHandle);
  frameHandle = delayHandle = lastTime = null;
}

function pause() {
  cancelScheduled();
  running = autoplay = false;
  // Preserve inFlight, progress, and the rendered position.
  updateStableControls();
}

function startTransition(continuePlaying) {
  cancelScheduled();
  if (!hasNextSnapshot()) return;
  autoplay = continuePlaying;
  if (!inFlight) {
    inFlight = true;
    progress = 0;
    prepareTemporaryObjects();
  }
  running = true;
  const thisGeneration = generation;

  function arrive() {
    commitTargetOnce();
    inFlight = running = false;
    progress = 0;
    updateStableControls();
    if (autoplay && hasNextSnapshot()) {
      delayHandle = setTimeout(() => {
        delayHandle = null;
        if (thisGeneration === generation && autoplay) {
          startTransition(true);
        }
      }, reducedMotion() ? gentleDwellMs : dwellMs);
    } else {
      autoplay = false;
      updateStableControls();
    }
  }

  if (reducedMotion()) {
    arrive(); // Same commit, no simulated travel.
    return;
  }

  function tick(time) {
    if (!running || thisGeneration !== generation) return;
    if (lastTime !== null) {
      progress = Math.min(1, progress + (time - lastTime) / durationMs);
    }
    lastTime = time;
    renderTransition(progress);
    if (progress === 1) {
      frameHandle = lastTime = null;
      arrive();
    } else {
      frameHandle = requestAnimationFrame(tick);
    }
  }
  frameHandle = requestAnimationFrame(tick);
  updateStableControls();
}

function replaceScene(nextConcept) {
  pause();
  generation += 1;
  inFlight = false;
  progress = 0;
  resetToInitialSnapshot(nextConcept);
}
```

For Next, use `startTransition(false)` from an idle state. If already in flight, pause and commit only that target; do not also begin the following transition. Play resumes a paused transition with autoplay enabled. At the last snapshot, stop playback and keep Replay available.

Use equivalent cancellation and completion handling with Web Animations or host libraries. Pausing a timer that starts the next step is insufficient if the active tween continues moving. Avoid committing on both an animation-finish callback and a separate timer.

## Lifecycle and browser checks

- On `visibilitychange` to hidden or nonintersection, pause rather than silently reset. Explicit user action can resume.
- On replay, concept change, or unmount, cancel frame/timer/animation handles and invalidate their generation. Clean up observers and listeners according to the host lifecycle.
- Keep all movement controlled by the player. A CSS loop, independent tween, or animated ribbon must pause too. With reduced motion, remove travel while keeping the same model commits and manual controls.
- Give a moving object or frame a stable selector for inspection. Sample its transform/coordinates before and during travel. During pause, sample again after a meaningful interval and check no movement within a small rendering tolerance. Resume and check progress continues from the paused position.
- Before arrival, completed outputs and totals must still equal the committed snapshot. After arrival, exactly one transition should be committed. Try replay and concept switching mid-flight, during an autoplay dwell, and at the last state.
- Resize during a paused transition and verify the same logical progress is preserved with readable labels. A screenshot of the final state does not establish these behaviors.

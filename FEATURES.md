# Student learning experience — feature backlog

This backlog proposes new capabilities from the educational UX review. These are improvement ideas, not evidence that students have experienced a particular problem. Journey and documentation corrections are tracked separately in [FIX.md](FIX.md). Estimates are approximate implementation time for one person and exclude a full classroom study.

The course site is a static GitHub Pages site. Interactive learning-pack code runs in the student's browser; guided workspaces run in the student's Codespace. Workspace checks and practice activities are learning aids, not official grades or assignment submissions. Preserve that distinction in every feature.

## Feature approval

Each feature has two separate checkboxes. Or can approve an individual feature by changing its **Human approval** checkbox from `[ ]` to `[x]`. An automated agent must never check or change an approval checkbox itself. An unchecked approval means the feature is not approved for implementation; approval applies only to the feature beside it. The agent may check **Implementation complete** only after implementing and verifying that feature's acceptance criteria. New features must start with both checkboxes unchecked.

## High impact

### F1. Add optional reasoning feedback to concept checkpoints

- [ ] Human approval (F1)
- [ ] Implementation complete (F1)

**Student need:** A student working independently may be able to run code but still be unsure whether their interpretation is sound.

**Effort:** Medium; approximately 1–3 days for a targeted selection across the labs.

**Starting points:** `docs/gitbook/labs/03-dwh-etl.md`, `docs/gitbook/labs/06-tfidf.md`, and `docs/gitbook/javascripts/lab04-pack.js`.

- [ ] Select high-value prediction and explanation checkpoints across all six labs.
- [ ] Add optional, initially hidden feedback with the expected observation, an explanation, and a common misconception. Preserve opportunities for students to reason before revealing it.
- [ ] Where helpful, add feedback for specific incorrect quiz choices and link to the related concept in the tutorial.
- [ ] Check examples against the actual teaching data and code; do not reveal assignment solutions wholesale or imply that a self-check grades the work.

**Acceptance:** A student can make a prediction, reveal actionable feedback, and navigate back to the relevant explanation. Feedback is accurate, available with a keyboard, and clearly described as practice.

### F2. Add self-assessment to interview practice

- [ ] Human approval (F2)
- [ ] Implementation complete (F2)

**Student need:** Suggested answers help students compare their response, but they do not yet give a consistent way to judge completeness or transfer knowledge to a new situation.

**Effort:** Small–medium; approximately 1 day.

**Starting points:** The job interview sections in `docs/gitbook/labs/*.md`.

- [ ] Add a short reusable checklist: define the concept, illustrate it with a lab example, and explain a relevant tradeoff or failure case.
- [ ] Add one concise follow-up scenario per lab that asks students to apply a concept to a changed situation.
- [ ] Provide optional guidance for assessing the response without presenting the checklist as a grade.

**Acceptance:** Each lab has a practical self-assessment checklist and a relevant transfer question with optional feedback; the original interview questions remain available.

### F3. Add accessible alternatives to interactive practice

- [ ] Human approval (F3)
- [ ] Implementation complete (F3)

**Student need:** Activities relying on JavaScript may be unavailable or difficult to use with a particular device or assistive technology. The review did not verify a specific keyboard or screen-reader failure.

**Effort:** Medium; approximately 1–3 days for an initial audit and targeted alternatives, with additional work depending on findings.

**Starting points:** `docs/gitbook/activities/`, `docs/gitbook/javascripts/`, and `labs/*/workspace/`.

- [ ] Audit a representative learning activity and workspace using keyboard-only navigation, a screen reader, zoom, and a narrow viewport; record actual findings before generalizing them.
- [ ] Provide a text-based version of at least one representative trace and self-check, including its explanation, that works without JavaScript.
- [ ] Address issues found and extend the audit to other labs where the same components or patterns occur.
- [ ] Keep controls labelled, focus visible, and status and error feedback understandable without relying on color alone.

**Acceptance:** The selected fallback conveys the same learning point and feedback without JavaScript. The audited tasks can be completed with keyboard and assistive technology, and remaining limitations are documented rather than assumed resolved.

## Ideas for later

### F4. Add a lab journey overview

- [ ] Human approval (F4)
- [ ] Implementation complete (F4)

**Student need:** Students may benefit from a visible map of what to do next and how learning activities connect to assignment work.

**Effort:** Medium; approximately 2–4 days across six labs.

**Starting points:** `docs/gitbook/how-to-learn.md`, `docs/gitbook/course-map.md`, and `docs/gitbook/labs/*.md`.

- [ ] Design a compact, consistent overview for each lab: Learn → Practice → Workspace → Check → Back up → Submit.
- [ ] Link each step to the corresponding section or resource and distinguish required work from optional practice and extensions.
- [ ] Add time estimates only after validating them with representative students or clearly label them as provisional.

**Acceptance:** A student can identify their next action from each lab overview, follow its links, and understand that completing the overview is not a grade or submission.

### F5. Explore safe recovery from exported workspace drafts

- [ ] Human approval (F5)
- [ ] Implementation complete (F5)

**Student need:** An exported copy protects work, but restoring it to a guided workspace currently requires manual copying for at least the Lab 01 per-question SQL draft.

**Effort:** Medium–large; several days or more depending on format, coverage, and testing.

**Starting points:** `labs/01-relational-sql/workspace/` and the other lab workspace implementations.

- [ ] Define an explicit, versioned export/import format and decide which types of work it contains, without assuming existing downloads can be losslessly imported.
- [ ] Validate file type, size, version, and content before presenting a preview of what will change.
- [ ] Preserve existing drafts and require an explicit student choice before replacing or merging them; provide a way to cancel.
- [ ] Test malformed files, incompatible versions, conflicts, interrupted imports, and round trips for every supported workspace.

**Acceptance:** A student can export, preview, and recover supported work without silently overwriting an existing draft; unsupported or invalid files fail with clear guidance. The documentation identifies any information that is not restored.

### F6. Investigate optional progress tracking

- [ ] Human approval (F6)
- [ ] Implementation complete (F6)

**Student need:** Students may want to remember which activities they have visited or completed between sessions. This need and the desired level of tracking should be validated with students first.

**Effort:** Medium–large; depends on the storage and privacy design.

- [ ] Ask students what progress they want to retain and whether browser-only persistence is sufficient.
- [ ] Evaluate an opt-in browser-local approach before considering a separate service. Explain that local progress is tied to the browser/device and may be cleared.
- [ ] If cross-device synchronization is proposed, define service ownership, accessibility, privacy, retention, and maintenance before implementation.
- [ ] Let students reset or remove their progress, and never equate a checked item with mastery, an official grade, or submission.

**Acceptance:** Any implemented tracking has a clear scope and storage explanation, is optional and accessible, and does not misrepresent progress as assessment. Cross-device behavior is claimed only if it is actually supported and tested.

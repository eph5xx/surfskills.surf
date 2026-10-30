# Classify: kind and use cases

Use the exact key names below; they match `SkillKind` and `SkillUseCase` in `src/data/skill-model/types.ts`.

## `kind`: how you work with the skill

One value. It describes the operation, not the outcome. The question: does the skill do a task and stop, or stay on?

| Value | Pick when |
| --- | --- |
| `Action` | You run it, it does a task, and it's done: generators, auditors that report, interviews that end, transforms, one-time setup. The most common. |
| `Mode` | You turn it on and it stays on for the session, reshaping how the agent works or quietly observing it (a test-first mode, a terse-output mode, a session observer). |
| `Knowledge` | It's never run; the agent consults it while doing other work (a spec, a rulebook, reference docs for a library). |
| `Router` | It doesn't do the work itself; it sends you to the right skill or runs other skills in order (an entry point, a "read this first", a picker). |

Decision order: consulted, never run → `Knowledge`. Routes to or orchestrates other skills → `Router`. Stays on and shapes or observes your work → `Mode`. Otherwise → `Action`.

Hints in `skill/SKILL.md`: an explicit command or arguments point to `Action`; "always", "for the rest of the session" or "from now on" point to `Mode`; a frontmatter description that reads like a reference ("Use when writing X code") with no steps points to `Knowledge`.

## `use_cases`: what it's used for

One or two values. Add a second only when the skill truly serves both; don't pad.

| Value | Pick when it |
| --- | --- |
| `Design` | shapes UI and UX, frontend look and feel, brand, websites. |
| `Video` | makes or edits video, motion graphics, captions. |
| `Images` | makes static images or illustrations. |
| `Writing` | produces or improves content, copy, prose. |
| `SEO` | serves search, growth, marketing. |
| `Development` | builds and integrates code: backend, APIs, SDKs, infrastructure. |
| `Research` | researches, explains, audits or reviews work; gathers and analyzes information. |
| `Meta` | improves the agent itself: memory, workflow, observing how you work, building skills. |

If nothing fits well, pick the closest value and say so in your reply. Adding a value is a human change to `types.ts`, never something this step does.

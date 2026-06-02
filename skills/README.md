# Skills

Each file in this directory controls the prompt, role, and instructions for one verification step.
Edit these files to tune Gemini's behavior without touching any TypeScript code.

## File Format

```
---
name: skill-name           # kebab-case identifier
step: 1                    # which step (1–5)
description: ...           # human-readable summary
version: 1.0.0             # increment when making significant changes
output_type: Step1Result   # TypeScript type the JSON must match
---

[Prompt content here]

{{text}}                   # ← required: replaced with the user's input text
```

## Rules

- The `{{text}}` placeholder **must** appear somewhere in the file — it's replaced with the verified text.
- Everything after the closing `---` of the frontmatter is sent verbatim to Gemini.
- The output schema section tells Gemini exactly what JSON to return. Keep it in sync with
  the TypeScript interfaces in `src/lib/gemini.ts`.
- In **development** (`npm run dev`), the file is re-read on every request so edits take effect instantly.
- In **production** (`npm run build`), the file is cached after the first read.

## Files

| File                                  | Step | What it does                                           |
| ------------------------------------- | ---- | ------------------------------------------------------ |
| `step1-source-detection.md`           | 1    | Extracts citations and preliminary rubric scores       |
| `step1-source-verification.md`        | 1    | Google Search — discovers official URLs                |
| `step1-source-content-validation.md`| 1    | Google Search — checks claim vs web content alignment  |
| `step2-logic-analysis.md`             | 2    | Evaluates argument structure and logical fallacies     |
| `step3-reality-check.md`      | 3    | Cross-references factual claims against real knowledge |
| `step4-data-currency.md`      | 4    | Assesses how up-to-date the referenced data is         |
| `step5-hallucination-risk.md` | 5    | Scores overall AI hallucination probability            |

## Adding context / RAG

You can paste additional domain context directly into any skill file:

```markdown
## Domain Context

The following known facts should be used as ground truth when assessing claims:

- [paste reference material here]
- [paste relevant statistics, dates, etc.]
```

Gemini will treat this as authoritative context when analysing the user's text.

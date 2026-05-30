import fs from "fs";
import path from "path";

const SKILLS_DIR = path.join(process.cwd(), "skills");

// In production: cache after first read. In dev: always re-read (hot reload).
const cache = new Map<string, string>();

/** Loads a skill file, strips the YAML frontmatter, and returns the prompt body. */
export function loadSkill(filename: string): string {
  if (process.env.NODE_ENV === "production" && cache.has(filename)) {
    return cache.get(filename)!;
  }

  const filepath = path.join(SKILLS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(
      `Skill file not found: skills/${filename}\n` +
        `Create it or check the skills/README.md for the expected format.`,
    );
  }

  let content = fs.readFileSync(filepath, "utf-8");

  // Strip YAML frontmatter block (--- ... ---)
  content = content.replace(/^---[\s\S]*?---\s*\n/, "");

  // Also strip any fenced code blocks around JSON schema examples so they
  // don't confuse Gemini into outputting markdown instead of raw JSON.
  content = content.replace(/```json[\s\S]*?```/g, (match) =>
    // Keep the JSON content but remove the fences
    match.replace(/^```json\s*/m, "").replace(/```\s*$/m, ""),
  );

  const body = content.trim();

  if (!body.includes("{{text}}")) {
    throw new Error(
      `Skill file skills/${filename} is missing the {{text}} placeholder.`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    cache.set(filename, body);
  }

  return body;
}

/** Loads a support document that is embedded into another skill prompt. */
export function loadSkillReference(filename: string): string {
  const filepath = path.join(SKILLS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Skill reference file not found: skills/${filename}`);
  }

  return fs
    .readFileSync(filepath, "utf-8")
    .replace(/^---[\s\S]*?---\s*\n/, "")
    .trim();
}

/**
 * Loads a skill file and replaces all `{{variable}}` placeholders with
 * the provided values. Always at minimum supply `{ text: "..." }`.
 */
export function applySkill(
  filename: string,
  variables: Record<string, string>,
): string {
  let prompt = loadSkill(filename);
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replaceAll(`{{${key}}}`, value);
  }
  return prompt;
}

// src/lib/questions.ts
// Normalizes your JSON questions so the UI/scoring can rely on consistent fields.

import raw from "../../functions/questions.json";

export type Axis = "economic" | "social";

export type Question = {
  id: string;
  axis: Axis;
  text: string;
  weight?: number;     // defaults to 1
  direction?: number;  // defaults to 1 (used for sign)
  tags?: string[];     // used by contradictions, if present
};

function toQuestion(obj: any): Question {
  return {
    id: String(obj.id ?? obj.key ?? obj.slug),
    axis: obj.axis === "social" ? "social" : "economic",
    text: obj.text ?? obj.prompt ?? obj.question ?? "(Untitled)",
    weight: typeof obj.weight === "number" ? obj.weight : 1,
    direction: typeof obj.direction === "number" ? obj.direction : 1,
    tags: Array.isArray(obj.tags) ? obj.tags : [],
  };
}

export const QUESTIONS: Question[] = (raw as any[]).map(toQuestion);

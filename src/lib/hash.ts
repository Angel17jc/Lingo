import "server-only";
import { createHash } from "node:crypto";
import type { TranslateRequest } from "@/features/translator/schemas";

export function createTranslationHash({
  text,
  source,
  target,
}: TranslateRequest): string {
  const normalizedText = text.trim().replace(/\s+/gu, " ");
  // La tupla conserva los límites de cada campo y distingue autodetección.
  const key = JSON.stringify(["v1", normalizedText, source ?? null, target]);
  return createHash("sha256").update(key, "utf8").digest("hex");
}

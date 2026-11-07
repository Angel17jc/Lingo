import "server-only";
import { count, lt, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { translationCache } from "@/server/db/schema";
import { CACHE_RETENTION_DAYS } from "./policy";

export async function cleanupTranslationCache(
  database: Database,
  { apply = false }: { apply?: boolean } = {},
): Promise<{ apply: boolean; entries: number; retentionDays: number }> {
  const expired = lt(
    translationCache.lastUsedAt,
    sql`now() - ${CACHE_RETENTION_DAYS} * interval '1 day'`,
  );

  if (!apply) {
    const [result] = await database
      .select({ entries: count() })
      .from(translationCache)
      .where(expired);
    return {
      apply: false,
      entries: result?.entries ?? 0,
      retentionDays: CACHE_RETENTION_DAYS,
    };
  }

  const result = await database.delete(translationCache).where(expired);
  return {
    apply: true,
    entries: result.rowCount ?? 0,
    retentionDays: CACHE_RETENTION_DAYS,
  };
}

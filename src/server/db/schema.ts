import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const translationCache = pgTable(
  "translation_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hash: text("hash").notNull(),
    // NULL representa la autodetección solicitada; se guarda aparte el resultado.
    sourceLang: text("source_lang"),
    targetLang: text("target_lang").notNull(),
    detectedSource: text("detected_source").notNull(),
    sourceText: text("source_text").notNull(),
    translatedText: text("translated_text").notNull(),
    provider: text("provider").notNull(),
    hits: integer("hits").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("translation_cache_hash_unique").on(table.hash),
    index("translation_cache_last_used_at_idx").on(table.lastUsedAt),
  ],
);

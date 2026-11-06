CREATE TABLE "translation_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"source_lang" text,
	"target_lang" text NOT NULL,
	"detected_source" text NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text NOT NULL,
	"provider" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "translation_cache_hash_unique" ON "translation_cache" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "translation_cache_last_used_at_idx" ON "translation_cache" USING btree ("last_used_at");
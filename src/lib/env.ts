import "server-only";
import { z } from "zod";

const envSchema = z.object({
  TRANSLATION_PROVIDER: z.enum(["deepl", "azure"]).default("deepl"),
  DEEPL_API_KEY: z.string().trim().min(1),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  UPSTASH_REDIS_REST_URL: z.url({ protocol: /^https$/ }),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1),
});

const result = envSchema.safeParse({
  TRANSLATION_PROVIDER: process.env.TRANSLATION_PROVIDER,
  DEEPL_API_KEY: process.env.DEEPL_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
});

if (!result.success) {
  const fields = [
    ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
  ];
  throw new Error(
    `Configuración inválida: revisa ${fields.join(", ")} en .env.local. Consulta .env.example.`,
  );
}

export const env = result.data;

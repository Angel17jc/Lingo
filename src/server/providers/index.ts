import "server-only";
import { env } from "@/lib/env";
import { AzureProvider } from "./azure.provider";
import { DeepLProvider } from "./deepl.provider";
import type { TranslationProvider } from "./translation-provider";

export function getProvider(): TranslationProvider {
  switch (env.TRANSLATION_PROVIDER) {
    case "deepl":
      return new DeepLProvider(env.DEEPL_API_KEY);
    case "azure":
      return new AzureProvider();
  }
}

import "server-only";
import { ProviderError } from "@/server/errors";
import type { TranslationProvider } from "./translation-provider";

// Proveedor reservado. Azure todavía no está implementado.
export class AzureProvider implements TranslationProvider {
  readonly name = "azure";

  translate: TranslationProvider["translate"] = async () => {
    throw new ProviderError();
  };
}

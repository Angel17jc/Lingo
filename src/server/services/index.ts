import "server-only";
import { getProvider } from "@/server/providers";
import {
  createTranslationService,
  type TranslationService,
} from "./translation.service";

// Punto de composición: la lógica del servicio solo depende de interfaces.
export function getTranslationService(): TranslationService {
  return createTranslationService({ provider: getProvider() });
}

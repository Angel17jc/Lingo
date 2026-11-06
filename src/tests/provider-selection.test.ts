import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/server/errors";
import { AzureProvider } from "@/server/providers/azure.provider";
import { DeepLProvider } from "@/server/providers/deepl.provider";
import { getProvider } from "@/server/providers";

const settings = vi.hoisted(() => ({
  TRANSLATION_PROVIDER: "deepl" as "deepl" | "azure",
  DEEPL_API_KEY: "test-key",
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: settings }));

afterEach(() => {
  settings.TRANSLATION_PROVIDER = "deepl";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("selección del proveedor", () => {
  it("elige DeepL según la configuración validada", () => {
    expect(getProvider()).toBeInstanceOf(DeepLProvider);
    expect(getProvider().name).toBe("deepl");
  });

  it("elige Azure como stub y falla de forma segura sin contactar la red", async () => {
    settings.TRANSLATION_PROVIDER = "azure";
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    const provider = getProvider();
    expect(provider).toBeInstanceOf(AzureProvider);
    expect(provider.name).toBe("azure");
    await expect(
      provider.translate({ text: "Hola", target: "EN-US" }),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

import { translateRequestSchema } from "@/features/translator/schemas";
import { ValidationError } from "@/server/errors";
import { translationErrorResponse } from "@/server/http/translation-error-response";
import { getTranslationService } from "@/server/services";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError();
    }

    const result = translateRequestSchema.safeParse(body);
    if (!result.success) throw new ValidationError();

    const translation = await getTranslationService().translate(result.data);
    return Response.json(translation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return translationErrorResponse(error);
  }
}

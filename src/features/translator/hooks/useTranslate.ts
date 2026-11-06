"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { messages } from "@/lib/messages";
import {
  MAX_TRANSLATION_CHARACTERS,
  translateRequestSchema,
  translateResponseSchema,
  type TranslateRequest,
  type TranslateResponse,
} from "../schemas";
import {
  readTranslationError,
  type TranslationClientError,
} from "../client-errors";

export type TranslationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: TranslateResponse }
  | { status: "error"; error: TranslationClientError };

export function useTranslate() {
  const [state, setState] = useState<TranslationState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(
    () => () => {
      generation.current += 1;
      controller.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= cooldownUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const reset = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
    controller.current = null;
    setState({ status: "idle" });
  }, []);

  const translate = useCallback(async (input: TranslateRequest) => {
    controller.current?.abort();
    const requestId = ++generation.current;
    const parsed = translateRequestSchema.safeParse(input);
    if (!parsed.success) {
      const message = !input.text.trim()
        ? messages.errors.empty
        : input.text.trim().length > MAX_TRANSLATION_CHARACTERS
          ? messages.errors.tooLong
          : messages.errors.invalid;
      setState({ status: "error", error: { kind: "validation", message } });
      return;
    }

    const active = new AbortController();
    controller.current = active;
    setState({ status: "loading" });
    const isCurrent = () =>
      generation.current === requestId && !active.signal.aborted;
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: active.signal,
        cache: "no-store",
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
      if (!isCurrent()) return;
      if (!response.ok) {
        const error = readTranslationError(
          response.status,
          body,
          response.headers.get("Retry-After"),
        );
        if (error.retryAfterSeconds) {
          const time = Date.now();
          setNow(time);
          setCooldownUntil(time + error.retryAfterSeconds * 1000);
        }
        setState({ status: "error", error });
        return;
      }
      const result = translateResponseSchema.safeParse(body);
      setState(
        result.success
          ? { status: "success", result: result.data }
          : {
              status: "error",
              error: {
                kind: "unexpected",
                message: messages.errors.unexpected,
              },
            },
      );
    } catch {
      if (isCurrent())
        setState({
          status: "error",
          error: { kind: "network", message: messages.errors.network },
        });
    } finally {
      if (generation.current === requestId) controller.current = null;
    }
  }, []);

  return {
    state,
    translate,
    reset,
    cooldownSeconds: Math.max(0, Math.ceil((cooldownUntil - now) / 1000)),
  };
}

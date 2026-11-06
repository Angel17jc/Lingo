"use client";

import { useEffect, useRef, useState } from "react";
import { messages } from "@/lib/messages";
import type { SourceLanguageCode, TargetLanguageCode } from "@/lib/languages";
import { MAX_TRANSLATION_CHARACTERS } from "../schemas";
import { useTranslate } from "../hooks/useTranslate";
import { toSourceLanguage, toTargetLanguage } from "../language-utils";
import { LanguageSelect } from "./LanguageSelect";
import { OutputBox } from "./OutputBox";
import { Icon } from "./Icon";

export function TranslatorForm() {
  const [text, setText] = useState("");
  const [source, setSource] = useState<SourceLanguageCode | "auto">("auto");
  const [target, setTarget] = useState<TargetLanguageCode>("EN-US");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const copyGeneration = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { state, translate, reset, cooldownSeconds } = useTranslate();
  const result = state.status === "success" ? state.result : undefined;
  const loading = state.status === "loading";

  useEffect(
    () => () => {
      copyGeneration.current += 1;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  function invalidate() {
    copyGeneration.current += 1;
    reset();
    setNotice("");
    setCopied(false);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }

  function submit() {
    if (loading || cooldownSeconds > 0) return;
    copyGeneration.current += 1;
    setNotice("");
    setCopied(false);
    void translate({ text, ...(source !== "auto" ? { source } : {}), target });
  }

  function swap() {
    const previousSource =
      source === "auto"
        ? result
          ? toSourceLanguage(result.detectedSource)
          : undefined
        : source;
    if (!previousSource) {
      setNotice(
        result ? messages.form.swapUnsupported : messages.form.swapNeedsSource,
      );
      return;
    }
    const newSource = toSourceLanguage(target);
    const newTarget = toTargetLanguage(previousSource);
    if (!newSource || !newTarget) {
      setNotice(messages.form.swapUnsupported);
      return;
    }
    if (result && result.translation.length > MAX_TRANSLATION_CHARACTERS) {
      setNotice(messages.form.swapTooLong);
      return;
    }
    if (result) setText(result.translation);
    setSource(newSource);
    setTarget(newTarget);
    invalidate();
    setNotice(messages.form.swapped);
    inputRef.current?.focus();
  }

  async function copy() {
    if (!result) return;
    const generation = copyGeneration.current;
    try {
      await navigator.clipboard.writeText(result.translation);
      if (generation !== copyGeneration.current) return;
      setCopied(true);
      setNotice(messages.form.copied);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      if (generation === copyGeneration.current)
        setNotice(messages.form.copyFailed);
    }
  }

  const error =
    state.status === "error"
      ? state.error.kind === "rate-limit" && cooldownSeconds === 0
        ? messages.errors.retryReady
        : state.error.message
      : undefined;

  return (
    <div className="translator-area" id="traductor" tabIndex={-1}>
      <form
        className="translator-card"
        aria-label={messages.form.title}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key === "Enter" &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            submit();
          }
        }}
      >
        <div className="language-toolbar">
          <LanguageSelect
            kind="source"
            value={source}
            onChange={(value) => {
              setSource(value);
              invalidate();
            }}
          />
          <button
            type="button"
            className="swap-button"
            onClick={swap}
            aria-label={messages.form.swap}
            title={messages.form.swap}
          >
            <Icon name="swap" />
          </button>
          <LanguageSelect
            kind="target"
            value={target}
            onChange={(value) => {
              setTarget(value);
              invalidate();
            }}
          />
        </div>
        <div className="editors-grid">
          <div className="editor-panel source-panel">
            <label htmlFor="translation-input" className="sr-only">
              {messages.form.input}
            </label>
            <textarea
              id="translation-input"
              dir="auto"
              ref={inputRef}
              className="editor-textarea"
              value={text}
              lang={source === "auto" ? undefined : source.toLowerCase()}
              maxLength={MAX_TRANSLATION_CHARACTERS}
              placeholder={messages.form.inputPlaceholder}
              aria-describedby="character-count"
              spellCheck={false}
              onChange={(event) => {
                setText(event.target.value);
                invalidate();
              }}
            />
            <div className="editor-bottom">
              <button
                type="button"
                className="text-button clear-button"
                disabled={!text}
                onClick={() => {
                  setText("");
                  invalidate();
                  inputRef.current?.focus();
                }}
              >
                <Icon name="close" />
                {messages.form.clear}
              </button>
              <span
                id="character-count"
                className={`character-count ${text.length >= 2800 ? "near-limit" : ""}`}
                aria-label={messages.form.countAccessible(
                  text.length,
                  MAX_TRANSLATION_CHARACTERS,
                )}
              >
                {messages.form.count(text.length, MAX_TRANSLATION_CHARACTERS)}
              </span>
            </div>
          </div>
          <OutputBox
            target={target}
            state={state}
            copied={copied}
            onCopy={() => {
              void copy();
            }}
          />
        </div>
        {(error || notice) && (
          <div
            className={`feedback ${error && !(state.status === "error" && state.error.kind === "rate-limit" && cooldownSeconds === 0) ? "feedback-error" : ""}`}
            role={error ? "alert" : "status"}
          >
            <Icon
              name={
                error ||
                (notice !== messages.form.copied &&
                  notice !== messages.form.swapped)
                  ? "info"
                  : "check"
              }
            />
            <span>{error ?? notice}</span>
          </div>
        )}
        <div className="action-bar">
          <div className="provider-note">
            <span className="provider-mark">
              <Icon name="translate" />
            </span>
            <div>
              <span>{messages.form.provider}</span>
              <small>
                {loading
                  ? messages.form.translating
                  : result
                    ? messages.form.done
                    : messages.form.idle}
              </small>
            </div>
          </div>
          <div className="submit-group">
            <span className="shortcut-hint">{messages.form.shortcut}</span>
            <button
              className="translate-button"
              type="submit"
              disabled={!text.trim() || loading || cooldownSeconds > 0}
              aria-keyshortcuts="Control+Enter Meta+Enter"
            >
              {loading ? <Icon name="loader" className="spin" /> : null}
              {loading
                ? messages.form.translating
                : cooldownSeconds > 0
                  ? messages.form.retry(cooldownSeconds)
                  : messages.form.translate}
              {!loading && <Icon name="arrow" />}
            </button>
          </div>
        </div>
      </form>
      <div className="translator-underbar">
        {!text ? (
          <div className="examples">
            <span>{messages.form.examplesLabel}</span>
            {messages.form.examples.map((example) => (
              <button
                key={example.label}
                type="button"
                aria-label={`${messages.form.examplePrefix} ${example.label}`}
                onClick={() => {
                  setText(example.text);
                  setSource("ES");
                  if (target === "ES") setTarget("EN-US");
                  invalidate();
                  inputRef.current?.focus();
                }}
              >
                {example.label}
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        ) : (
          <p className="privacy-note">
            <Icon name="info" />
            {messages.form.privacy}
          </p>
        )}
      </div>
    </div>
  );
}

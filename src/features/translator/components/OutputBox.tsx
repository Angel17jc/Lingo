import type { TargetLanguageCode } from "@/lib/languages";
import { messages } from "@/lib/messages";
import { sourceLanguageName } from "../language-utils";
import type { TranslationState } from "../hooks/useTranslate";
import { Icon } from "./Icon";

export function OutputBox({
  target,
  state,
  copied,
  onCopy,
}: {
  target: TargetLanguageCode;
  state: TranslationState;
  copied: boolean;
  onCopy: () => void;
}) {
  const result = state.status === "success" ? state.result : undefined;
  const loading = state.status === "loading";
  return (
    <section
      className={`editor-panel output-panel ${result ? "has-result" : ""}`}
      aria-label={messages.form.output}
      aria-busy={loading}
    >
      <div className="output-content">
        {result ? (
          <>
            <label htmlFor="translation-output" className="sr-only">
              {messages.form.output}
            </label>
            <textarea
              id="translation-output"
              lang={target.toLowerCase()}
              dir="auto"
              className="editor-textarea output-textarea"
              value={result.translation}
              readOnly
              spellCheck={false}
            />
          </>
        ) : (
          <div className="output-empty" aria-hidden="true">
            <span className={`output-emblem ${loading ? "is-loading" : ""}`}>
              <Icon name={loading ? "loader" : "sparkle"} />
            </span>
            <p className="empty-title">
              {loading
                ? messages.form.loadingTitle
                : messages.form.outputPlaceholder}
            </p>
            <p className="empty-hint">
              {loading ? messages.form.loadingHint : messages.form.outputHint}
            </p>
          </div>
        )}
      </div>
      <div className="editor-bottom output-bottom">
        <span className="detected-language">
          {result ? (
            messages.form.detected(sourceLanguageName(result.detectedSource))
          ) : (
            <span className="output-decoration" aria-hidden="true">
              Aa <span>↔</span> あ
            </span>
          )}
        </span>
        <button
          type="button"
          className={`text-button copy-button ${copied ? "is-copied" : ""}`}
          disabled={!result}
          onClick={onCopy}
          aria-label={copied ? messages.form.copied : messages.form.copy}
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? messages.form.copied : messages.form.copyAction}
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? (
          messages.form.translating
        ) : result ? (
          <>
            {messages.form.readyAnnouncement("")}
            <span lang={target.toLowerCase()}>{result.translation}</span>
          </>
        ) : (
          ""
        )}
      </p>
    </section>
  );
}

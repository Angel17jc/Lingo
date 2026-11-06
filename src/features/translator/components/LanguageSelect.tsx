import {
  sourceLanguages,
  targetLanguages,
  type SourceLanguageCode,
  type TargetLanguageCode,
} from "@/lib/languages";
import { messages } from "@/lib/messages";
import { Icon } from "./Icon";

type Props =
  | {
      kind: "source";
      value: SourceLanguageCode | "auto";
      onChange: (value: SourceLanguageCode | "auto") => void;
    }
  | {
      kind: "target";
      value: TargetLanguageCode;
      onChange: (value: TargetLanguageCode) => void;
    };

export function LanguageSelect(props: Props) {
  const isSource = props.kind === "source";
  const options = isSource ? sourceLanguages : targetLanguages;
  return (
    <div className="language-control">
      <label htmlFor={`language-${props.kind}`} className="language-caption">
        {isSource ? messages.form.from : messages.form.to}
        <span className="sr-only">
          {" "}
          · {isSource ? messages.form.source : messages.form.target}
        </span>
      </label>
      <div className="select-wrap">
        <select
          id={`language-${props.kind}`}
          aria-label={isSource ? messages.form.source : messages.form.target}
          value={props.value}
          onChange={(event) => {
            const value = event.target.value;
            if (props.kind === "source") {
              if (value === "auto") props.onChange("auto");
              else {
                const language = sourceLanguages.find(
                  (option) => option.code === value,
                );
                if (language) props.onChange(language.code);
              }
            } else {
              const language = targetLanguages.find(
                (option) => option.code === value,
              );
              if (language) props.onChange(language.code);
            }
          }}
        >
          {isSource && <option value="auto">{messages.form.detect}</option>}
          {options.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        <Icon name="chevron" />
      </div>
    </div>
  );
}

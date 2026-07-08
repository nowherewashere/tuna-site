import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = {
  label: string;
  /** Keep the label for screen readers only (visual parity with label-less designs). */
  labelHidden?: boolean;
  hint?: string;
  error?: string | null;
  /** Inline control rendered next to the input (e.g. a submit button). */
  trailing?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** Labelled text input with a11y-wired hint/error: real <label>, aria-invalid,
 *  aria-describedby, and an assertive live region so errors are announced. */
export default function TextField({
  label,
  labelHidden,
  hint,
  error,
  trailing,
  ...input
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy =
    [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field-block">
      <label htmlFor={id} className={labelHidden ? "sr-only" : "field-label"}>
        {label}
      </label>
      <div className="field-controls">
        <input
          id={id}
          className="field"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

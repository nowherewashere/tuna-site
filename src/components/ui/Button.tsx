import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "amber" | "ghost" | "link";
type Size = "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  /** Show a busy state; disables the button and swaps the label if loadingLabel is set. */
  loading?: boolean;
  loadingLabel?: string;
  iconLeft?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Renders a <Link> when `href` is given, otherwise a native <button>. This is
 *  the one polymorphism the app needs (navigation vs. action) and keeps every
 *  interactive control a real, keyboard-operable element. */
type ButtonAsButton = BaseProps & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof BaseProps
  >;
type ButtonAsLink = BaseProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | keyof BaseProps
  >;

function classes(variant: Variant, size: Size, full?: boolean, className?: string) {
  return [
    "btn",
    variant === "amber" ? "btn-amber" : variant === "ghost" ? "btn-ghost" : "btn-link",
    size === "lg" ? "btn-lg" : "",
    full ? "btn-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "amber",
    size = "md",
    full,
    loading,
    loadingLabel,
    iconLeft,
    children,
    className,
    ...rest
  } = props as BaseProps & Record<string, unknown>;

  const cn = classes(variant, size, full, className);
  const content = (
    <>
      {iconLeft}
      {loading && loadingLabel ? loadingLabel : children}
    </>
  );

  if (typeof props.href === "string") {
    const disabled = (rest as { disabled?: boolean }).disabled;
    // While loading (or disabled) the destination isn't ready, so render a
    // non-navigating placeholder: an <a> without href is neither focusable nor
    // keyboard-activatable, and `pointer-events:none` (via .is-loading/.is-disabled)
    // stops the click. This keeps the control from looking live while doing nothing.
    if (loading || disabled) {
      const inertRest: Record<string, unknown> = { ...rest };
      delete inertRest.href;
      delete inertRest.disabled;
      return (
        <a
          className={[cn, loading ? "is-loading" : "is-disabled"].join(" ")}
          role="link"
          aria-disabled="true"
          aria-busy={loading || undefined}
          tabIndex={-1}
          {...(inertRest as ComponentPropsWithoutRef<"a">)}
        >
          {content}
        </a>
      );
    }
    return (
      <Link className={cn} {...(rest as ComponentPropsWithoutRef<typeof Link>)}>
        {content}
      </Link>
    );
  }

  const { disabled, ...btnRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={cn}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...btnRest}
    >
      {content}
    </button>
  );
}

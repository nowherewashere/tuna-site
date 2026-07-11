import type { ComponentPropsWithoutRef } from "react";

/**
 * The cabinet's console-panel chrome: a `.console` section with the two decorative
 * corner ticks. Every cabinet card renders through this so the corners never drift
 * (and can't be forgotten, as the Overview empty state once did). Extra classNames and
 * section attributes (aria-label, id, style…) pass straight through.
 */
export default function ConsoleFrame({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={"console " + (className ?? "")} {...rest}>
      <div className="console-corner console-corner-tl" aria-hidden="true" />
      <div className="console-corner console-corner-tr" aria-hidden="true" />
      {children}
    </section>
  );
}

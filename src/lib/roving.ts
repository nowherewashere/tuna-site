import type { KeyboardEvent } from "react";

/**
 * APG roving-tabindex keyboard model shared by the cabinet's radiogroups, the plan
 * ladders, the install platform picker and the cabinet tablist. Arrow keys move focus
 * AND activate (each control's own onClick is the "select"); Home/End jump to the ends.
 *
 * `elements` is the ordered list of controls. The currently-focused control is found via
 * `document.activeElement`, which — for both the container-level handlers (DOM-query lists)
 * and the per-button handlers (ref arrays) — is the control that dispatched the keydown.
 */
export function onRovingKeyDown(
  e: KeyboardEvent<HTMLElement>,
  elements: (HTMLElement | null)[],
): void {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const els = elements.filter((el): el is HTMLElement => el != null);
  const cur = els.indexOf(document.activeElement as HTMLElement);
  if (cur < 0) return;
  e.preventDefault();
  const len = els.length;
  let next = cur;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (cur + 1) % len;
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (cur - 1 + len) % len;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = len - 1;
  els[next].focus();
  els[next].click();
}

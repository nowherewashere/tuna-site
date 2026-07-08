"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import Icon from "@/components/Icon";
import { TABS, type Tab } from "./tabs";

export default function CabinetTabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = TABS.length - 1;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    onChange(TABS[next].id);
    btnRefs.current[next]?.focus();
  }

  return (
    <div className="cab-tabs" role="tablist" aria-label="Разделы кабинета">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            btnRefs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          tabIndex={tab === t.id ? 0 : -1}
          className={`cab-tab${tab === t.id ? " active" : ""}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          <Icon name={t.icon} size={18} />
          <span className="cab-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

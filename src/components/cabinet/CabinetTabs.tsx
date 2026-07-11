"use client";

import { useRef } from "react";
import Icon from "@/components/Icon";
import { onRovingKeyDown } from "@/lib/roving";
import { TABS, type Tab } from "./tabs";

export default function CabinetTabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
          onKeyDown={(e) => onRovingKeyDown(e, btnRefs.current)}
        >
          <Icon name={t.icon} size={18} />
          <span className="cab-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

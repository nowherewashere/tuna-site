import type { IconName } from "@/components/Icon";

export type Tab = "overview" | "devices" | "sub" | "ref" | "support";

export const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Обзор", icon: "gauge" },
  { id: "devices", label: "Устройства", icon: "phone" },
  { id: "sub", label: "Подписка", icon: "calendar" },
  { id: "ref", label: "Рефералка", icon: "plus" },
  { id: "support", label: "Поддержка", icon: "message" },
];

export const TAB_IDS: Tab[] = TABS.map((t) => t.id);

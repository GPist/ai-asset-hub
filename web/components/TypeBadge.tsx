import type { HubManifest } from "@/lib/catalog";

const LABELS: Record<HubManifest["type"], string> = {
  skill:  "Skill",
  hook:   "Hook",
  agent:  "Agent",
  prompt: "Prompt",
  plugin: "Plugin",
};

export function TypeBadge({ type }: { type: HubManifest["type"] }) {
  return <span className={`badge-${type}`}>{LABELS[type] ?? type}</span>;
}

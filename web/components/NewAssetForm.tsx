"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const TYPES = ["skill", "hook", "agent", "prompt", "plugin"] as const;
const TARGETS = ["claude-code", "codex", "cowork", "generic"] as const;

export function NewAssetForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("skill");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [targets, setTargets] = useState<string[]>(["claude-code"]);
  const [nameManual, setNameManual] = useState(false);

  function deriveSlug(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function toggleTarget(t: string) {
    setTargets((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !name) return;
    setSubmitting(true);
    setError(null);

    const tags = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title,
        type,
        summary,
        tags,
        category: category || "General",
        targets: targets.length ? targets : ["generic"],
        entry: type === "hook" ? "hook.md" : type === "prompt" ? "prompt.md" : "SKILL.md",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const data = await res.json() as { owner: string; repo: string };
    router.push(`/a/${data.owner}/${data.repo}`);
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          required
          onChange={(e) => {
            setTitle(e.target.value);
            if (!nameManual) setName(deriveSlug(e.target.value));
          }}
          placeholder="PDF Extractor"
          className="input"
        />
      </div>

      {/* Name / slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          required
          onChange={(e) => {
            setNameManual(true);
            setName(deriveSlug(e.target.value));
          }}
          placeholder="pdf-extractor"
          pattern="[a-z0-9-]+"
          className="input font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">
          Lowercase letters, numbers, hyphens only. Cannot be changed later.
        </p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                type === t
                  ? "bg-hub-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Short description
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One sentence about what this does"
          maxLength={200}
          className="input"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Documents, Productivity, DevOps…"
          className="input"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="pdf, data-extraction, documents"
          className="input"
        />
      </div>

      {/* Targets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Compatible with
        </label>
        <div className="flex flex-wrap gap-2">
          {TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTarget(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                targets.includes(t)
                  ? "bg-hub-100 text-hub-800 ring-1 ring-hub-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={submitting || !title || !name} className="btn-primary">
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Publishing…</>
          ) : (
            <><Plus size={15} /> Publish asset</>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

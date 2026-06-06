"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, Loader2 } from "lucide-react";

interface Props {
  owner: string;
  repo: string;
  filePath: string;
  fileSha: string;
  initialContent: string;
  assetTitle: string;
}

export function ProposeEditor({
  owner,
  repo,
  filePath,
  fileSha,
  initialContent,
  assetTitle,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = content !== initialContent;

  async function submit() {
    if (!changed) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, filePath, fileSha, content, summary }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const data = await res.json() as { prNumber?: number };
    router.push(`/a/${owner}/${repo}?proposed=${data.prNumber ?? ""}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What did you change? <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="e.g. Added support for multi-page PDFs"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-hub-500"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Edit <span className="font-mono text-hub-700">{filePath}</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[60vh] p-4 font-mono text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-hub-500 resize-y bg-gray-50"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!changed || submitting}
          className="btn-primary"
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Sending for review…</>
          ) : (
            <><GitPullRequest size={15} /> Send for review</>
          )}
        </button>
        <button
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={submitting}
        >
          Cancel
        </button>
        {!changed && (
          <span className="text-xs text-gray-400">No changes yet</span>
        )}
      </div>
    </div>
  );
}

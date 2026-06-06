"use client";
import { useState } from "react";
import Link from "next/link";
import type { CatalogAsset } from "@/lib/catalog";
import type { GiteaPull } from "@/lib/gitea/client";
import { TypeBadge } from "@/components/TypeBadge";
import { Check, MessageSquare, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { DiffViewer } from "@/components/DiffViewer";

interface Props {
  asset: CatalogAsset;
  pull: GiteaPull;
}

export function ReviewCard({ asset, pull }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [diff, setDiff] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDiff() {
    if (diff !== null) {
      setExpanded(!expanded);
      return;
    }
    setLoadingDiff(true);
    setExpanded(true);
    try {
      const res = await fetch(
        `/api/diff/${asset.owner}/${asset.repo}/${pull.base.ref}...${pull.head.sha}`
      );
      setDiff(res.ok ? await res.text() : "Could not load diff.");
    } finally {
      setLoadingDiff(false);
    }
  }

  async function doAction(action: "approve" | "request_changes" | "decline") {
    setProcessing(action);
    setError(null);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: asset.owner,
        repo: asset.repo,
        pullNumber: pull.number,
        action,
        comment: feedback,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Action failed.");
      setProcessing(null);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="card px-5 py-4 text-sm text-gray-500 flex items-center gap-2">
        <Check size={14} className="text-green-500" />
        Proposal #{pull.number} handled.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge type={asset.type} />
              <Link
                href={`/a/${asset.owner}/${asset.repo}`}
                className="text-sm font-medium text-hub-700 hover:underline"
              >
                {asset.title}
              </Link>
              <span className="text-xs text-gray-400">#{pull.number}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{pull.title}</p>
            {pull.body && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pull.body}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>by {pull.user.login}</span>
              <span>·</span>
              <span>{new Date(pull.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={loadDiff}
            className="btn-secondary text-xs shrink-0"
          >
            {loadingDiff ? (
              <Loader2 size={12} className="animate-spin" />
            ) : expanded ? (
              <><ChevronUp size={12} /> Hide changes</>
            ) : (
              <><ChevronDown size={12} /> See what changed</>
            )}
          </button>
        </div>
      </div>

      {/* Diff */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          {loadingDiff ? (
            <p className="text-sm text-gray-400">Loading changes…</p>
          ) : diff ? (
            <DiffViewer diff={diff} />
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex flex-wrap gap-2 items-center">
        <button
          onClick={() => doAction("approve")}
          disabled={!!processing}
          className="btn-primary text-xs"
        >
          {processing === "approve" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Approve &amp; publish
        </button>

        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={!!processing}
          className="btn-secondary text-xs"
        >
          <MessageSquare size={12} />
          Ask for changes
        </button>

        <button
          onClick={() => doAction("decline")}
          disabled={!!processing}
          className="btn-danger text-xs"
        >
          {processing === "decline" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <X size={12} />
          )}
          Decline
        </button>

        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {showFeedback && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-2 flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Leave a note for the contributor…"
            className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-hub-500"
          />
          <button
            onClick={() => doAction("request_changes")}
            disabled={!!processing || !feedback.trim()}
            className="btn-secondary text-xs"
          >
            {processing === "request_changes" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

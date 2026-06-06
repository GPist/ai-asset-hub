"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GiteaTag, GiteaCommit } from "@/lib/gitea/client";
import { GitBranch, Clock, ChevronDown, ChevronUp, RotateCcw, Loader2 } from "lucide-react";

interface Props {
  tags: GiteaTag[];
  commits: GiteaCommit[];
  owner: string;
  repo: string;
  currentRef?: string;
  isSignedIn?: boolean;
}

export function VersionHistory({ tags, commits, owner, repo, currentRef, isSignedIn }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const router = useRouter();
  const base = `/a/${owner}/${repo}`;

  const shownCommits = showAll ? commits : commits.slice(0, 5);

  async function rollbackTo(ref: string) {
    setRollingBack(ref);
    const res = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, targetRef: ref }),
    });
    setRollingBack(null);
    if (res.ok) {
      const data = await res.json() as { prNumber?: number };
      router.push(`/review?proposed=${data.prNumber ?? ""}`);
    }
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-1.5">
        <Clock size={14} />
        Version history
      </h3>

      {/* Tags (named releases) */}
      {tags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Releases</p>
          <div className="flex flex-col gap-1">
            {tags.map((tag) => (
              <div
                key={tag.name}
                className={`text-sm px-2 py-1 rounded flex items-center justify-between group ${
                  currentRef === tag.name
                    ? "bg-hub-50 text-hub-700 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Link
                  href={`${base}?ref=${encodeURIComponent(tag.name)}`}
                  className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                  <GitBranch size={12} className="text-gray-400 shrink-0" />
                  <span className="truncate">{tag.name}</span>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {tag.commit.created
                      ? new Date(tag.commit.created).toLocaleDateString()
                      : ""}
                  </span>
                  {isSignedIn && currentRef !== tag.name && (
                    <button
                      onClick={() => rollbackTo(tag.name)}
                      disabled={rollingBack === tag.name}
                      title="Roll back to this version"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-hub-600 transition"
                    >
                      {rollingBack === tag.name ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RotateCcw size={12} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commits */}
      {commits.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Changes</p>
          <div className="flex flex-col gap-1">
            {shownCommits.map((c, i) => (
              <div
                key={c.sha}
                className={`text-xs px-2 py-1.5 rounded flex items-start gap-2 group ${
                  currentRef === c.sha
                    ? "bg-hub-50 text-hub-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Link
                  href={`${base}?ref=${c.sha}`}
                  title={c.commit.message}
                  className="flex items-start gap-2 flex-1 min-w-0"
                >
                  <span className="font-mono text-gray-300 shrink-0 pt-0.5">
                    {c.sha.slice(0, 7)}
                  </span>
                  <span className="line-clamp-1 flex-1">{c.commit.message}</span>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  {i > 0 && (
                    <Link
                      href={`${base}?compare=${shownCommits[i - 1].sha}...${c.sha}`}
                      className="text-hub-600 hover:underline"
                      title="See what changed"
                    >
                      diff
                    </Link>
                  )}
                  {isSignedIn && currentRef !== c.sha && (
                    <button
                      onClick={() => rollbackTo(c.sha)}
                      disabled={rollingBack === c.sha}
                      title="Roll back to this version"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-hub-600 transition ml-1"
                    >
                      {rollingBack === c.sha ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <RotateCcw size={10} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {commits.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 text-xs text-hub-600 hover:underline flex items-center gap-1"
            >
              {showAll ? (
                <><ChevronUp size={12} /> Show less</>
              ) : (
                <><ChevronDown size={12} /> Show all {commits.length} changes</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

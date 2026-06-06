"use client";
import { useState } from "react";
import Link from "next/link";
import type { GiteaTag, GiteaCommit } from "@/lib/gitea/client";
import { GitBranch, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  tags: GiteaTag[];
  commits: GiteaCommit[];
  owner: string;
  repo: string;
  currentRef?: string;
}

export function VersionHistory({ tags, commits, owner, repo, currentRef }: Props) {
  const [showAll, setShowAll] = useState(false);
  const base = `/a/${owner}/${repo}`;

  const shownCommits = showAll ? commits : commits.slice(0, 5);

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
              <Link
                key={tag.name}
                href={`${base}?ref=${encodeURIComponent(tag.name)}`}
                className={`text-sm px-2 py-1 rounded flex items-center justify-between ${
                  currentRef === tag.name
                    ? "bg-hub-50 text-hub-700 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <GitBranch size={12} className="text-gray-400" />
                  {tag.name}
                </span>
                <span className="text-xs text-gray-400">
                  {tag.commit.created ? new Date(tag.commit.created).toLocaleDateString() : ""}
                </span>
              </Link>
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
              <Link
                key={c.sha}
                href={`${base}?ref=${c.sha}`}
                title={c.commit.message}
                className={`text-xs px-2 py-1.5 rounded flex items-start gap-2 ${
                  currentRef === c.sha
                    ? "bg-hub-50 text-hub-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="font-mono text-gray-300 shrink-0 pt-0.5">
                  {c.sha.slice(0, 7)}
                </span>
                <span className="line-clamp-1 flex-1">{c.commit.message}</span>
                {i > 0 && (
                  <Link
                    href={`${base}?compare=${shownCommits[i - 1].sha}...${c.sha}`}
                    className="text-hub-600 hover:underline shrink-0"
                    title="See what changed"
                    onClick={(e) => e.stopPropagation()}
                  >
                    diff
                  </Link>
                )}
              </Link>
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

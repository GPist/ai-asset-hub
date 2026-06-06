"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="absolute top-3 right-3 p-1.5 rounded bg-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span className="badge bg-green-100 text-green-700">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function ConnectInstructions({ hubUrl }: { hubUrl: string }) {
  const marketplaceUrl = `${hubUrl}/api/marketplace.json`;

  return (
    <div>
      <Section title="Claude Code" badge="Native marketplace">
        <p className="text-sm text-gray-500 mb-3">
          Add this hub as a Claude Code marketplace. Claude Code will show assets
          from this hub in <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">/plugin marketplace list</code> and
          let you install them directly.
        </p>
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">1. Add marketplace</p>
        <CodeBlock code={`/plugin marketplace add ${marketplaceUrl}`} />
        <p className="text-xs text-gray-400 mt-4 mb-2 font-medium uppercase tracking-wide">2. Install a skill</p>
        <CodeBlock code={`/plugin install <skill-name>`} />
        <p className="text-xs text-gray-400 mt-3">
          Or download manually from any asset page and unzip into{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">~/.claude/skills/</code>.
        </p>
      </Section>

      <Section title="Manual install (any tool)">
        <p className="text-sm text-gray-500 mb-3">
          Download any asset as a zip and extract it to the right directory for your tool.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Claude Code</p>
            <CodeBlock
              code={`unzip <asset>.zip -d ~/.claude/skills/<name>/`}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Codex</p>
            <CodeBlock
              code={`unzip <asset>.zip -d .agents/skills/<name>/`}
            />
          </div>
        </div>
      </Section>

      <Section title="Webhook (keep catalog fresh)">
        <p className="text-sm text-gray-500 mb-3">
          If you push assets directly to Gitea, add a webhook so the catalog
          re-indexes automatically on every push.
        </p>
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Webhook URL</p>
        <CodeBlock code={`${hubUrl}/api/webhooks/gitea`} />
        <p className="text-xs text-gray-400 mt-3">
          In Gitea org settings → Webhooks → Add webhook → Content type:{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">application/json</code>
          {" "}→ Events: Push.
        </p>
      </Section>

      <Section title="API">
        <p className="text-sm text-gray-500 mb-3">
          The hub exposes a simple JSON API for automation.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 pr-4 text-gray-500 font-medium">Endpoint</th>
                <th className="text-left py-1.5 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-gray-50">
              {[
                ["GET /api/marketplace.json", "Claude Code-compatible marketplace listing"],
                ["POST /api/assets", "Create a new asset repo (admin token required)"],
                ["POST /api/propose", "Open a proposal (PR) on an asset"],
                ["POST /api/review", "Approve / request changes / decline a proposal"],
                ["POST /api/rollback", "Propose a rollback to a prior version"],
                ["GET /api/install/[owner]/[repo]/[ref].zip", "Download asset at a given ref"],
                ["GET /api/diff/[owner]/[repo]/[base...head]", "Raw unified diff between refs"],
                ["POST /api/webhooks/gitea", "Gitea push webhook → reindex catalog"],
                ["POST /api/reindex", "Full catalog reindex (admin token bearer required)"],
              ].map(([ep, desc]) => (
                <tr key={ep}>
                  <td className="py-1.5 pr-4 text-hub-700 whitespace-nowrap">{ep}</td>
                  <td className="py-1.5 text-gray-500 font-sans">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

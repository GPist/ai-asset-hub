"use client";
import { useState } from "react";
import type { CatalogAsset } from "@/lib/catalog";
import { getInstallInfo, type InstallTarget } from "@/lib/install/targets";
import { Copy, Check } from "lucide-react";

const TARGET_LABELS: Record<InstallTarget, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cowork: "Cowork",
  generic: "Download",
};

export function InstallPanel({
  asset,
  version,
}: {
  asset: CatalogAsset;
  version: string;
}) {
  const targets = (asset.targets ?? ["generic"]) as InstallTarget[];
  const [selected, setSelected] = useState<InstallTarget>(targets[0] ?? "generic");
  const [copied, setCopied] = useState(false);

  const info = getInstallInfo(asset.name, asset.owner, asset.repo, selected, version);

  const copyCommand = () => {
    if (info.command) {
      navigator.clipboard.writeText(info.command).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Install</h3>

      {/* Target selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {targets.map((t) => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selected === t
                ? "bg-hub-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {TARGET_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-2">{info.description}</p>

      {info.command ? (
        <div className="relative group">
          <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {info.command}
          </pre>
          <button
            onClick={copyCommand}
            className="absolute top-2 right-2 p-1 rounded bg-white border border-gray-200 text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy"
          >
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      ) : (
        <a
          href={`/api/install/${asset.owner}/${asset.repo}/${version}.zip`}
          className="btn-secondary w-full justify-center text-xs"
        >
          Download zip
        </a>
      )}
    </div>
  );
}

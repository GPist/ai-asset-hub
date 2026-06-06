import Link from "next/link";
import type { CatalogAsset } from "@/lib/catalog";
import { TypeBadge } from "@/components/TypeBadge";
import { Download, GitBranch } from "lucide-react";

export function AssetCard({ asset }: { asset: CatalogAsset }) {
  const href = `/a/${asset.owner}/${asset.repo}`;
  return (
    <Link href={href} className="card p-5 hover:shadow-md transition-shadow group block">
      <div className="flex items-start justify-between gap-2 mb-2">
        <TypeBadge type={asset.type} />
        <span className="text-xs text-gray-400 font-mono">{asset.version}</span>
      </div>
      <h2 className="font-semibold text-gray-900 group-hover:text-hub-700 mb-1">
        {asset.title}
      </h2>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{asset.summary}</p>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <GitBranch size={12} />
          {asset.owner}
        </span>
        {asset.tags.slice(0, 3).map((t) => (
          <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}

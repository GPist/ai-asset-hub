import Link from "next/link";
import { ensureIndexed, listAssets } from "@/lib/catalog";
import { AssetCard } from "@/components/AssetCard";
import { SearchBar } from "@/components/SearchBar";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function CatalogPage({ searchParams }: Props) {
  const { q } = await searchParams;
  await ensureIndexed();
  const assets = listAssets(q);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Asset Hub</h1>
        <p className="text-gray-500">
          Browse, download, and contribute to shared skills, hooks, agents, and prompts.
        </p>
      </div>

      <SearchBar defaultValue={q} />

      {assets.length === 0 ? (
        <div className="card p-12 text-center text-gray-500 mt-6">
          {q ? (
            <>No assets match &ldquo;{q}&rdquo;.</>
          ) : (
            <>No assets published yet. Check back soon.</>
          )}
        </div>
      ) : (
        <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <AssetCard key={`${a.owner}/${a.repo}`} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}

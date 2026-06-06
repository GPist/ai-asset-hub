import { notFound } from "next/navigation";
import Link from "next/link";
import { getAsset } from "@/lib/catalog";
import {
  getFileContents,
  decodeBase64,
  listTags,
  listCommits,
  compareDiff,
  GiteaError,
} from "@/lib/gitea/client";
import { TypeBadge } from "@/components/TypeBadge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { DiffViewer } from "@/components/DiffViewer";
import { InstallPanel } from "@/components/InstallPanel";
import { VersionHistory } from "@/components/VersionHistory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Download, GitPullRequest, GitFork } from "lucide-react";

interface Props {
  params: Promise<{ owner: string; asset: string }>;
  searchParams: Promise<{ ref?: string; compare?: string }>;
}

export default async function AssetDetailPage({ params, searchParams }: Props) {
  const { owner, asset: repo } = await params;
  const { ref, compare } = await searchParams;

  const session = await getServerSession(authOptions);
  const token = (session as typeof session & { giteaToken?: string })?.giteaToken ?? null;
  const adminToken = process.env.GITEA_ADMIN_TOKEN ?? null;

  const catalogAsset = getAsset(owner, repo);
  if (!catalogAsset) notFound();

  // Fetch entry file content at chosen ref
  let content = "";
  let fileSha = "";
  try {
    const file = await getFileContents(owner, repo, catalogAsset.entry, ref, adminToken);
    content = decodeBase64(file.content);
    fileSha = file.sha;
  } catch (err) {
    if (err instanceof GiteaError && err.status === 404) notFound();
    throw err;
  }

  const [tags, commits] = await Promise.all([
    listTags(owner, repo, adminToken).catch(() => []),
    listCommits(owner, repo, ref, adminToken).catch(() => []),
  ]);

  // Diff between two refs (M3)
  let diffText = "";
  if (compare) {
    const [baseRef, headRef] = compare.split("...");
    if (baseRef && headRef) {
      diffText = await compareDiff(owner, repo, baseRef, headRef, adminToken).catch(
        () => ""
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Main column */}
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge type={catalogAsset.type} />
              <span className="text-xs font-mono text-gray-400">{catalogAsset.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{catalogAsset.title}</h1>
            <p className="text-gray-500 mt-1">{catalogAsset.summary}</p>
          </div>
        </div>

        {/* Tags */}
        {catalogAsset.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {catalogAsset.tags.map((t) => (
              <span key={t} className="badge bg-gray-100 text-gray-600">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {session && (
            <Link
              href={`/a/${owner}/${repo}/propose`}
              className="btn-primary"
            >
              <GitPullRequest size={15} />
              Propose a change
            </Link>
          )}
          <a
            href={`/api/install/${owner}/${repo}/${ref ?? catalogAsset.version}.zip`}
            className="btn-secondary"
          >
            <Download size={15} />
            Download
          </a>
          {session && (
            <form action={`/api/fork/${owner}/${repo}`} method="POST">
              <button type="submit" className="btn-secondary">
                <GitFork size={15} />
                Make your own copy
              </button>
            </form>
          )}
        </div>

        {/* Diff view (M3) */}
        {diffText ? (
          <div className="card p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">What changed</h2>
            <DiffViewer diff={diffText} />
          </div>
        ) : null}

        {/* Content */}
        <div className="card p-6">
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        <InstallPanel asset={catalogAsset} version={ref ?? catalogAsset.version} />

        <VersionHistory
          tags={tags}
          commits={commits}
          owner={owner}
          repo={repo}
          currentRef={ref}
        />
      </div>
    </div>
  );
}

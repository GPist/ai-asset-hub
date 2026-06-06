import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getAsset } from "@/lib/catalog";
import { getFileContents, decodeBase64, GiteaError } from "@/lib/gitea/client";
import { ProposeEditor } from "@/components/ProposeEditor";

interface Props {
  params: Promise<{ owner: string; asset: string }>;
}

export default async function ProposePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const { owner, asset: repo } = await params;
  const catalogAsset = getAsset(owner, repo);
  if (!catalogAsset) notFound();

  const adminToken = process.env.GITEA_ADMIN_TOKEN ?? null;

  let content = "";
  let fileSha = "";
  try {
    const file = await getFileContents(owner, repo, catalogAsset.entry, undefined, adminToken);
    content = decodeBase64(file.content);
    fileSha = file.sha;
  } catch (err) {
    if (err instanceof GiteaError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Propose a change</h1>
      <p className="text-gray-500 text-sm mb-6">
        Edit the asset below. Your change will be sent for review before it goes live.
      </p>

      <ProposeEditor
        owner={owner}
        repo={repo}
        filePath={catalogAsset.entry}
        fileSha={fileSha}
        initialContent={content}
        assetTitle={catalogAsset.title}
      />
    </div>
  );
}

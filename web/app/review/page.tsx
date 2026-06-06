import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { listAssets } from "@/lib/catalog";
import { listOpenPulls } from "@/lib/gitea/client";
import { ReviewCard } from "@/components/ReviewCard";

export default async function ReviewQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const adminToken = process.env.GITEA_ADMIN_TOKEN ?? null;
  const assets = listAssets();

  // Collect all open PRs across org repos
  const pullGroups = await Promise.all(
    assets.map(async (a) => {
      const pulls = await listOpenPulls(a.owner, a.repo, adminToken).catch(() => []);
      return pulls.map((p) => ({ asset: a, pull: p }));
    })
  );
  const allPulls = pullGroups.flat().sort(
    (a, b) => new Date(b.pull.created_at).getTime() - new Date(a.pull.created_at).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Review queue</h1>
        <p className="text-gray-500 text-sm">
          Proposals waiting for your review.{" "}
          {allPulls.length === 0 ? "All clear!" : `${allPulls.length} open`}
        </p>
      </div>

      {allPulls.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          No proposals waiting for review.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {allPulls.map(({ asset, pull }) => (
            <ReviewCard
              key={`${asset.owner}/${asset.repo}#${pull.number}`}
              asset={asset}
              pull={pull}
            />
          ))}
        </div>
      )}
    </div>
  );
}

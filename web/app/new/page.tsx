import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NewAssetForm } from "@/components/NewAssetForm";

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Publish a new asset</h1>
      <p className="text-gray-500 text-sm mb-6">
        Creates a new repository in the hub with your asset&apos;s metadata and a starter
        file ready to edit.
      </p>
      <NewAssetForm />
    </div>
  );
}

"use client";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { useState } from "react";

export function ProposedBanner() {
  const params = useSearchParams();
  const proposed = params.get("proposed");
  const [dismissed, setDismissed] = useState(false);

  if (!proposed || dismissed) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <CheckCircle2 size={16} className="shrink-0 text-green-600" />
      <span>
        Your proposal #{proposed} has been sent for review. A maintainer will
        approve, request changes, or decline it.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto text-green-600 hover:text-green-800"
      >
        <X size={14} />
      </button>
    </div>
  );
}

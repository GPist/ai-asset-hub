"use client";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="text-center py-20">
      <p className="text-2xl font-semibold text-gray-700 mb-2">Something went wrong</p>
      <p className="text-gray-400 text-sm mb-6">{error.message}</p>
      <button onClick={reset} className="btn-secondary">
        Try again
      </button>
    </div>
  );
}

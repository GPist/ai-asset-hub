"use client";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition } from "react";

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = (fd.get("q") as string).trim();
        startTransition(() => {
          router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
        });
      }}
      className="relative"
    >
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search assets…"
        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-hub-500 focus:border-transparent"
        disabled={isPending}
      />
    </form>
  );
}

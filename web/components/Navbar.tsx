"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, ShieldCheck, Layers, Plus } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const login = (session as { user: { login?: string } } & typeof session)?.user?.login;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 hover:text-hub-700">
          <Layers size={20} className="text-hub-600" />
          AI Asset Hub
        </Link>

        <div className="flex-1" />

        {user ? (
          <>
            <Link
              href="/new"
              className="btn-primary text-xs py-1.5"
            >
              <Plus size={14} />
              New asset
            </Link>
            <Link
              href="/review"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ShieldCheck size={16} />
              Review queue
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? ""}
                  className="w-7 h-7 rounded-full"
                />
              )}
              <span>{login ?? user.name}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="btn-secondary text-xs gap-1"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </>
        ) : (
          <button onClick={() => signIn("gitea")} className="btn-primary gap-1">
            <LogIn size={14} />
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Asset Hub",
  description: "Collaborate on AI skills, hooks, agents, and prompts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
              <a
                href="https://github.com/GPist/ai-asset-hub"
                className="hover:text-gray-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                AI Asset Hub
              </a>
              {" · "}
              MIT License
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

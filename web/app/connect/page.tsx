import { ConnectInstructions } from "@/components/ConnectInstructions";

export const metadata = { title: "Connect your AI tools — AI Asset Hub" };

export default function ConnectPage() {
  const hubUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Connect your AI tools</h1>
      <p className="text-gray-500 text-sm mb-8">
        Point Claude Code, Codex, or any compatible tool at this hub to install
        assets with one command.
      </p>
      <ConnectInstructions hubUrl={hubUrl} />
    </div>
  );
}

// Cross-tool install mapping.
// Generates an install snippet for each target.

export type InstallTarget = "claude-code" | "codex" | "cowork" | "generic";

export interface InstallInfo {
  label: string;
  command: string | null;
  description: string;
}

export function getInstallInfo(
  assetName: string,
  owner: string,
  repo: string,
  target: InstallTarget,
  version: string
): InstallInfo {
  const downloadUrl = `/api/install/${owner}/${repo}/${version}.zip`;

  switch (target) {
    case "claude-code":
      return {
        label: "Claude Code",
        command: [
          `mkdir -p ~/.claude/skills/${assetName}`,
          `curl -sL "${downloadUrl}" -o /tmp/${assetName}.zip`,
          `unzip -q /tmp/${assetName}.zip -d ~/.claude/skills/${assetName}`,
          `echo "Installed ${assetName} to ~/.claude/skills/${assetName}"`,
        ].join(" && \\\n  "),
        description: "Installs the skill into your Claude Code skills directory.",
      };
    case "codex":
      return {
        label: "Codex",
        command: [
          `mkdir -p .agents/skills/${assetName}`,
          `curl -sL "${downloadUrl}" -o /tmp/${assetName}.zip`,
          `unzip -q /tmp/${assetName}.zip -d .agents/skills/${assetName}`,
        ].join(" && \\\n  "),
        description: "Installs the skill into your project's Codex skills directory.",
      };
    case "cowork":
      return {
        label: "Cowork",
        command: null,
        description: "Download the zip and import via Cowork's plugin settings.",
      };
    case "generic":
    default:
      return {
        label: "Download",
        command: `curl -sL "${downloadUrl}" -o ${assetName}.zip`,
        description: "Download the asset as a zip file.",
      };
  }
}

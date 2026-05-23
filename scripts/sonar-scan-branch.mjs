import { spawnSync } from "node:child_process";

if (!process.env.SONAR_TOKEN) {
  console.error("SONAR_TOKEN is required. Set it before running this script.");
  process.exit(1);
}

const branchResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
  encoding: "utf8",
});

if (branchResult.status !== 0) {
  console.error("Unable to read the current git branch.");
  process.exit(branchResult.status || 1);
}

const branchName = branchResult.stdout.trim();
const branchSlug = branchName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const projectKey = `notes-app-${branchSlug || "local"}`;
const projectName = `Notes App (${branchName})`;

const scan = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "docker-compose.sonar.yml",
    "run",
    "--rm",
    "sonar-scanner",
    `-Dsonar.projectKey=${projectKey}`,
    `-Dsonar.projectName=${projectName}`,
  ],
  { stdio: "inherit" },
);

process.exit(scan.status || 0);

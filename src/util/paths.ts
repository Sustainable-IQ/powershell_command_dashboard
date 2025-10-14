import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { randomBytes } from "crypto";

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}

/**
 * Get the base directory for all dashboard artifacts
 * Uses %LOCALAPPDATA%\ps-dashboard on Windows
 */
export function getBasePath(customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "ps-dashboard");
}

/**
 * Get the runs directory where all run artifacts are stored
 */
export function getRunsPath(basePath?: string): string {
  const base = basePath || getBasePath();
  return path.join(base, "runs");
}

/**
 * Get the directory for a specific run
 */
export function getRunPath(runId: string, basePath?: string): string {
  const runsDir = getRunsPath(basePath);
  return path.join(runsDir, runId);
}

/**
 * Get file paths for a run
 */
export interface RunArtifacts {
  runDir: string;
  batchManifest: string;
  resultsJsonl: string;
  log: string;
}

export function getRunArtifacts(runId: string, basePath?: string): RunArtifacts {
  const runDir = getRunPath(runId, basePath);

  return {
    runDir,
    batchManifest: path.join(runDir, "batch.json"),
    resultsJsonl: path.join(runDir, "results.jsonl"),
    log: path.join(runDir, "log.txt"),
  };
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get PowerShell helper scripts directory
 */
export function getPowerShellScriptsPath(extensionPath: string): string {
  return path.join(extensionPath, "powershell");
}

/**
 * Get the path to run-batch.ps1
 */
export function getRunBatchScriptPath(extensionPath: string): string {
  return path.join(getPowerShellScriptsPath(extensionPath), "run-batch.ps1");
}

/**
 * Get the built-in packs directory
 * Prefers out/catalog/packs (production build) with fallback to src/catalog/packs (dev)
 */
export function getBuiltInPacksPath(extensionPath: string): string {
  // Prefer built/bundled location
  const builtPath = path.join(extensionPath, "out", "catalog", "packs");
  if (fs.existsSync(builtPath)) {
    return builtPath;
  }

  // Fallback to source location for development
  const sourcePath = path.join(extensionPath, "src", "catalog", "packs");
  return sourcePath;
}

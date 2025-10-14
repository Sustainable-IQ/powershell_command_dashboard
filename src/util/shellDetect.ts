import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type Shell = "pwsh" | "powershell";

/**
 * Detected shell information
 */
export interface ShellInfo {
  shell: Shell;
  path: string;
  version?: string;
  available: boolean;
}

/**
 * Check if a shell executable is available
 */
async function isShellAvailable(shellName: string): Promise<boolean> {
  try {
    // Use 'where' on Windows to find the executable
    const { stdout } = await execAsync(`where ${shellName}`, {
      windowsHide: true,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get version of a shell
 */
async function getShellVersion(shellName: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(
      `${shellName} -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"`,
      { timeout: 5000, windowsHide: true }
    );
    return stdout.trim();
  } catch {
    return undefined;
  }
}

/**
 * Detect available shells (pwsh and powershell)
 */
export async function detectShells(): Promise<{
  pwsh: ShellInfo;
  powershell: ShellInfo;
}> {
  const [pwshAvailable, powershellAvailable] = await Promise.all([
    isShellAvailable("pwsh"),
    isShellAvailable("powershell"),
  ]);

  const [pwshVersion, powershellVersion] = await Promise.all([
    pwshAvailable ? getShellVersion("pwsh") : undefined,
    powershellAvailable ? getShellVersion("powershell") : undefined,
  ]);

  return {
    pwsh: {
      shell: "pwsh",
      path: "pwsh",
      version: pwshVersion,
      available: pwshAvailable,
    },
    powershell: {
      shell: "powershell",
      path: "powershell",
      version: powershellVersion,
      available: powershellAvailable,
    },
  };
}

/**
 * Get the preferred shell based on availability and user settings
 */
export async function getPreferredShell(
  preference: Shell = "pwsh"
): Promise<ShellInfo> {
  const shells = await detectShells();

  // Try preferred shell first
  if (shells[preference].available) {
    return shells[preference];
  }

  // Fallback to the other shell
  const fallback = preference === "pwsh" ? "powershell" : "pwsh";
  if (shells[fallback].available) {
    return shells[fallback];
  }

  // Neither available (should not happen on Windows)
  throw new Error(
    "No PowerShell executable found. Please install PowerShell 7+ or ensure Windows PowerShell is available."
  );
}

/**
 * Validate that a shell is available
 */
export async function validateShell(shell: Shell): Promise<ShellInfo> {
  const shells = await detectShells();

  if (!shells[shell].available) {
    throw new Error(
      `${shell} is not available. Please install it or choose a different shell in settings.`
    );
  }

  return shells[shell];
}

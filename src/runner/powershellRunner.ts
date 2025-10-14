import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { ConfigManager } from '../settings/config';
import { Command } from '../catalog/schema';

export interface RunnerOptions {
  elevated?: boolean;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
}

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  cancelled?: boolean;
}

/**
 * PowerShell runner that respects configuration settings
 */
export class PowerShellRunner {
  private activeProcess: child_process.ChildProcess | undefined;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  /**
   * Determine which PowerShell executable to use
   */
  private getShellExecutable(): string {
    const preferred = this.config.shellPreferred;

    if (preferred === 'auto') {
      // Auto-detect: Try pwsh first, fall back to powershell
      try {
        child_process.execSync('pwsh -Version', { stdio: 'ignore' });
        return 'pwsh';
      } catch {
        return 'powershell';
      }
    }
    return preferred; // 'pwsh' or 'powershell'
  }

  /**
   * Normalize a catalog command to a single executable PowerShell line.
   * - Prefer inline `commandText`
   * - Otherwise run `scriptPath` via call operator `&`, quoted for PS
   */
  private normalizeCommand(cmd: Pick<Command, 'id' | 'commandText' | 'scriptPath'>): string {
    const hasText = typeof cmd.commandText === 'string' && cmd.commandText.trim().length > 0;
    if (hasText) return cmd.commandText!.trim();

    const hasPath = typeof cmd.scriptPath === 'string' && cmd.scriptPath.trim().length > 0;
    if (hasPath) {
      // Escape double-quotes for PowerShell, then wrap the path in quotes
      const quoted = cmd.scriptPath!.replace(/"/g, '`"');
      return `& "${quoted}"`;
    }

    throw new Error(`Command ${'id' in cmd ? cmd.id : '<unknown>'} has neither commandText nor scriptPath.`);
  }

  /**
   * Build a script string from a list of commands
   */
  private buildScript(commands: Command[]): string {
    return commands.map(c => this.normalizeCommand(c)).join('\n');
  }

  /**
   * Run commands based on execution mode setting
   */
  async runCommands(
    commands: Command[],
    options: RunnerOptions = {}
  ): Promise<RunResult> {
    const mode = this.config.executionMode;
    if (mode === 'terminal') {
      return this.runInTerminal(commands, options);
    } else {
      return this.runHeadless(commands, options);
    }
  }

  /**
   * Run commands in VS Code integrated terminal
   */
  private async runInTerminal(
    commands: Command[],
    options: RunnerOptions
  ): Promise<RunResult> {
    const shell = this.getShellExecutable();
    const terminal = vscode.window.createTerminal({
      name: 'PS Dashboard',
      shellPath: shell,
      cwd: options.workingDirectory,
      env: options.environmentVariables
    });

    const scriptLines = this.buildScript(commands);

    terminal.show();
    terminal.sendText(scriptLines);

    // Note: Terminal mode doesn't provide structured output
    vscode.window.showInformationMessage(
      'Commands sent to terminal. Note: Terminal mode does not provide JSONL streaming.'
    );

    return {
      success: true,
      output: 'Commands executed in terminal (no structured output available)'
    };
  }

  /**
   * Run commands headless with JSONL streaming (basic wrapper here)
   */
  private runHeadless(
    commands: Command[],
    options: RunnerOptions
  ): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      const shell = this.getShellExecutable();
      const scriptLines = this.buildScript(commands);
      const wrappedScript = this.wrapWithJsonlOutput(scriptLines);

      const processOptions: child_process.SpawnOptions = {
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environmentVariables },
        shell: false
      };

      if (options.elevated) {
        // E4 handles elevation in its dedicated elevatedRunner; this runner stays non-elevated.
        const timeout = this.config.elevationWaitTimeoutMs;
        vscode.window.showWarningMessage(
          `Elevated execution is handled by the Elevated Runner. (timeout setting: ${timeout}ms)`
        );
      }

      this.activeProcess = child_process.spawn(
        shell,
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', wrappedScript],
        processOptions
      );

      let output = '';
      let error = '';

      this.activeProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      this.activeProcess.stderr?.on('data', (data) => {
        error += data.toString();
      });

      this.activeProcess.on('close', (code) => {
        this.activeProcess = undefined;
        resolve({
          success: code === 0,
          output,
          error,
          exitCode: code ?? 0
        });
      });

      this.activeProcess.on('error', (err) => {
        this.activeProcess = undefined;
        reject(err);
      });
    });
  }

  /**
   * Wrap PowerShell script with basic error handling.
   * (Full JSONL streaming is implemented in the dedicated E3 runner.)
   */
  private wrapWithJsonlOutput(script: string): string {
    return `
$ErrorActionPreference = 'Continue'
try {
${script}
  exit 0
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`.trim();
  }

  /**
   * Cancel running process
   */
  cancel(): void {
    if (this.activeProcess && this.config.runnerKillOnCancel) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = undefined;
    }
  }

  /**
   * Check if runner is busy
   */
  isBusy(): boolean {
    return this.activeProcess !== undefined;
  }
}

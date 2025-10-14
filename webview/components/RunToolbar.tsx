import React from "react";
import { useDashboardStore } from "../state/store";

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

export function RunToolbar() {
  const { getSelectedCommands, selectedCommandIds, clearSelection } =
    useDashboardStore();

  const selectedCommands = getSelectedCommands();
  const hasSelection = selectedCommands.length > 0;
  const hasAdminCommands = selectedCommands.some((cmd) => cmd.requiresAdmin);

  const handleRun = () => {
    if (!hasSelection) return;

    const commandIds = Array.from(selectedCommandIds);
    vscode.postMessage({
      type: "runCommands",
      commandIds,
    });
  };

  const handleRunElevated = () => {
    if (!hasSelection || !hasAdminCommands) return;

    const commandIds = Array.from(selectedCommandIds);
    vscode.postMessage({
      type: "runElevated",
      commandIds,
    });
  };

  const handleCopy = () => {
    if (!hasSelection) return;

    // Generate command text to copy
    const commandText = selectedCommands
      .map((cmd) => cmd.commandText || `# Script: ${cmd.scriptPath}`)
      .join("\n\n");

    vscode.postMessage({
      type: "copyCommands",
      commandText,
    });
  };

  return (
    <div className="run-toolbar">
      <div className="toolbar-left">
        <button
          className="btn btn-primary"
          disabled={!hasSelection || hasAdminCommands}
          onClick={handleRun}
          title={
            hasAdminCommands
              ? "Use 'Run Elevated' for admin commands"
              : "Run selected commands"
          }
        >
          Run
        </button>

        <button
          className="btn btn-warning"
          disabled={!hasSelection || !hasAdminCommands}
          onClick={handleRunElevated}
          title="Run selected commands with UAC elevation"
        >
          Run Elevated
        </button>

        <button
          className="btn btn-secondary"
          disabled={!hasSelection}
          onClick={handleCopy}
          title="Copy commands to clipboard"
        >
          Copy
        </button>
      </div>

      <div className="toolbar-center">
        {hasSelection && (
          <div className="selection-summary">
            <span className="summary-item">
              {selectedCommands.length} selected
            </span>
            {hasAdminCommands && (
              <span className="summary-item summary-admin">
                {selectedCommands.filter((cmd) => cmd.requiresAdmin).length} require
                admin
              </span>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <button
          className="btn btn-link"
          disabled={!hasSelection}
          onClick={clearSelection}
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}

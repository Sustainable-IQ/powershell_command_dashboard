import React from "react";
import { useDashboardStore } from "../state/store";

export function Preview() {
  const { getSelectedCommands } = useDashboardStore();

  const selectedCommands = getSelectedCommands();

  if (selectedCommands.length === 0) {
    return (
      <div className="preview">
        <div className="preview-header">
          <h2>Preview</h2>
        </div>
        <div className="preview-body">
          <div className="empty-state">
            <p>Select commands to preview what will be executed.</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate preview text
  const previewLines: string[] = [];
  const adminCount = selectedCommands.filter((cmd) => cmd.requiresAdmin).length;
  const nonAdminCount = selectedCommands.length - adminCount;

  previewLines.push(`# PowerShell Command Dashboard - Batch Preview`);
  previewLines.push(`# Total commands: ${selectedCommands.length}`);
  if (adminCount > 0) {
    previewLines.push(`# Admin required: ${adminCount}`);
  }
  if (nonAdminCount > 0) {
    previewLines.push(`# Non-admin: ${nonAdminCount}`);
  }
  previewLines.push("");

  selectedCommands.forEach((cmd, index) => {
    previewLines.push(`# [${index + 1}] ${cmd.label}`);
    if (cmd.requiresAdmin) {
      previewLines.push(`# Requires Admin: Yes`);
    }
    if (cmd.preview) {
      previewLines.push(`# Note: ${cmd.preview}`);
    }
    previewLines.push(cmd.commandText || `# Script: ${cmd.scriptPath}`);
    previewLines.push("");
  });

  const previewText = previewLines.join("\n");

  return (
    <div className="preview">
      <div className="preview-header">
        <h2>Preview</h2>
        <div className="preview-stats">
          <span className="stat">
            {selectedCommands.length} command{selectedCommands.length !== 1 ? "s" : ""}
          </span>
          {adminCount > 0 && (
            <span className="stat stat-admin">{adminCount} require admin</span>
          )}
        </div>
      </div>

      <div className="preview-body">
        <pre className="preview-code">{previewText}</pre>
      </div>

      <div className="preview-footer">
        <p className="preview-note">
          These are the exact commands that will be executed. Review carefully before running.
        </p>
      </div>
    </div>
  );
}

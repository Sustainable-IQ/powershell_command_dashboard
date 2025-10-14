import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('psDashboard.open', async () => {
    const panel = vscode.window.createWebviewPanel(
      'psDashboard',
      'PowerShell Command Dashboard',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'dist')),
          vscode.Uri.file(path.join(context.extensionPath, 'webview'))
        ]
      }
    );

    // Prefer built bundle (dist/webview.js + assets), fallback to simple inline HTML
    const distHtml = tryGetDistHtml(context, panel);
    if (distHtml) {
      panel.webview.html = distHtml;
    } else {
      panel.webview.html = fallbackHtml();
    }

    // Example message bridge (extend for your app):
    panel.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'ping') {
        panel.webview.postMessage({ type: 'pong' });
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

/** Try to serve the built webview bundle from dist/. */
function tryGetDistHtml(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): string | undefined {
  try {
    const distDir = path.join(context.extensionPath, 'dist');
    const htmlPath = path.join(distDir, 'webview', 'index.html');
    if (!fs.existsSync(htmlPath)) return undefined;

    let html = fs.readFileSync(htmlPath, 'utf8');

    // Fix resource URIs for the webview
    const fixSrc = (rel: string) => {
      const onDisk = vscode.Uri.file(path.join(distDir, rel));
      return panel.webview.asWebviewUri(onDisk).toString();
    };

    // Replace script and css refs (assumes webview.js and assets/...css)
    html = html.replace(/src="\/?webview\.js"/, (m) => `src="${fixSrc('webview.js')}"`);
    html = html.replace(/href="\/?assets\/([^"]+)"/g, (_m, p1) => `href="${fixSrc(path.join('assets', p1))}"`);

    return html;
  } catch {
    return undefined;
  }
}

/** Minimal fallback HTML if dist bundle isn't present. */
function fallbackHtml(): string {
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src data: https:; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PowerShell Command Dashboard</title>
  <style>
    body { font: 13px/1.4 -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    .muted { opacity: .7 }
    .btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--vscode-button-border, transparent); background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn:hover { filter: brightness(1.05); }
  </style>
</head>
<body>
  <h2>PowerShell Command Dashboard</h2>
  <p class="muted">Built bundle not found; showing fallback shell. Run <code>pnpm run build</code> to load the full UI.</p>
  <button class="btn" id="ping">Ping</button>
  <pre id="log"></pre>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('ping').addEventListener('click', () => {
      vscode.postMessage({ type: 'ping' });
    });
    window.addEventListener('message', (e) => {
      const el = document.getElementById('log');
      el.textContent += JSON.stringify(e.data) + "\\n";
    });
  </script>
</body>
</html>`;
}

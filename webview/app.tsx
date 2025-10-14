import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { useDashboardStore } from "./state/store";
import { Catalog } from "./components/Catalog";
import { Preview } from "./components/Preview";
import { RunToolbar } from "./components/RunToolbar";
import "./style.css";

// VS Code API type
declare const acquireVsCodeApi: () => any;

const vscode = acquireVsCodeApi();

function App() {
  const { setCatalog, catalog } = useDashboardStore();

  useEffect(() => {
    // Listen for messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case "catalogLoaded":
          console.log("Catalog loaded:", message.catalog);
          setCatalog(message.catalog);
          break;

        default:
          console.warn("Unknown message type:", message.type);
      }
    };

    window.addEventListener("message", messageHandler);

    // Request catalog on mount
    vscode.postMessage({ type: "requestCatalog" });

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [setCatalog]);

  if (!catalog) {
    return (
      <div className="loading">
        <p>Loading command catalog...</p>
      </div>
    );
  }

  if (catalog.errors.length > 0) {
    return (
      <div className="error">
        <h2>Catalog Errors</h2>
        <p>{catalog.errors.length} error(s) loading command packs:</p>
        <ul>
          {catalog.errors.map((err, i) => (
            <li key={i}>
              <strong>{err.packId || "Unknown"}:</strong> {err.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>PowerShell Command Dashboard</h1>
        <p className="subtitle">
          {catalog.commands.length} commands from {catalog.packs.length} packs
        </p>
      </div>

      <div className="dashboard-body">
        <div className="catalog-section">
          <Catalog />
        </div>

        <div className="preview-section">
          <Preview />
        </div>
      </div>

      <div className="dashboard-footer">
        <RunToolbar />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

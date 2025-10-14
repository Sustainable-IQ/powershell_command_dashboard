import React from "react";
import { useDashboardStore, Command } from "../state/store";

export function Catalog() {
  const {
    catalog,
    selectedCommandIds,
    toggleCommand,
    selectAll,
    clearSelection,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
  } = useDashboardStore();

  if (!catalog) return null;

  // Filter commands
  const filteredCommands = catalog.commands.filter((cmd) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        cmd.label.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.id.includes(query) ||
        cmd.tags.some((tag) => tag.toLowerCase().includes(query));

      if (!matches) return false;
    }

    // Category filter
    if (categoryFilter && cmd.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  // Group by category
  const categories: Record<string, Command[]> = {};
  filteredCommands.forEach((cmd) => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = [];
    }
    categories[cmd.category].push(cmd);
  });

  const categoryList = Object.keys(categories).sort();

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h2>Commands</h2>
        <input
          type="text"
          className="search-input"
          placeholder="Search commands... (Ctrl+/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="catalog-filters">
          <select
            className="category-filter"
            value={categoryFilter || ""}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value
                  ? (e.target.value as Command["category"])
                  : null
              )
            }
          >
            <option value="">All Categories</option>
            <option value="Inventory">Inventory</option>
            <option value="Networking">Networking</option>
            <option value="Startup">Startup</option>
            <option value="Privacy">Privacy</option>
            <option value="Security">Security</option>
          </select>
        </div>

        <div className="selection-actions">
          <button
            className="btn-link"
            onClick={() => selectAll(filteredCommands.map((c) => c.id))}
          >
            Select All
          </button>
          <button
            className="btn-link"
            onClick={() => clearSelection()}
          >
            Clear
          </button>
          <span className="selection-count">
            {selectedCommandIds.size} selected
          </span>
        </div>
      </div>

      <div className="catalog-body">
        {categoryList.length === 0 ? (
          <div className="empty-state">
            <p>No commands match your search.</p>
          </div>
        ) : (
          categoryList.map((category) => (
            <div key={category} className="category-group">
              <h3 className="category-title">
                {category} ({categories[category].length})
              </h3>

              {categories[category].map((cmd) => (
                <div
                  key={cmd.id}
                  className={`command-card ${
                    selectedCommandIds.has(cmd.id) ? "selected" : ""
                  }`}
                >
                  <label className="command-card-label">
                    <input
                      type="checkbox"
                      checked={selectedCommandIds.has(cmd.id)}
                      onChange={() => toggleCommand(cmd.id)}
                    />

                    <div className="command-card-content">
                      <div className="command-card-header">
                        <span className="command-label">{cmd.label}</span>

                        <div className="command-badges">
                          {cmd.requiresAdmin && (
                            <span className="badge badge-admin">Admin</span>
                          )}
                          {cmd.riskLevel === "destructive" && (
                            <span className="badge badge-destructive">
                              Destructive
                            </span>
                          )}
                          {cmd.riskLevel === "moderate" && (
                            <span className="badge badge-moderate">
                              Moderate
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="command-description">{cmd.description}</p>

                      {cmd.tags.length > 0 && (
                        <div className="command-tags">
                          {cmd.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { create } from "zustand";

export interface Command {
  id: string;
  label: string;
  category: "Inventory" | "Networking" | "Startup" | "Privacy" | "Security";
  description: string;
  commandText?: string;
  scriptPath?: string;
  requiresAdmin: boolean;
  riskLevel: "info" | "moderate" | "destructive";
  os: string[];
  shell: string[];
  params: any[];
  tags: string[];
  preview?: string;
  deps: string[];
  verifyAfterRun?: any;
  supportsWhatIf: boolean;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  commands: Command[];
}

export interface Catalog {
  commands: Command[];
  packs: Pack[];
  errors: any[];
}

interface DashboardState {
  catalog: Catalog | null;
  selectedCommandIds: Set<string>;
  searchQuery: string;
  categoryFilter: Command["category"] | null;
  requiresAdminFilter: boolean | null;
  riskLevelFilter: Command["riskLevel"] | null;

  // Actions
  setCatalog: (catalog: Catalog) => void;
  toggleCommand: (commandId: string) => void;
  selectAll: (commandIds: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: Command["category"] | null) => void;
  setRequiresAdminFilter: (requiresAdmin: boolean | null) => void;
  setRiskLevelFilter: (riskLevel: Command["riskLevel"] | null) => void;
  getSelectedCommands: () => Command[];
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  catalog: null,
  selectedCommandIds: new Set(),
  searchQuery: "",
  categoryFilter: null,
  requiresAdminFilter: null,
  riskLevelFilter: null,

  setCatalog: (catalog) => set({ catalog }),

  toggleCommand: (commandId) =>
    set((state) => {
      const newSet = new Set(state.selectedCommandIds);
      if (newSet.has(commandId)) {
        newSet.delete(commandId);
      } else {
        newSet.add(commandId);
      }
      return { selectedCommandIds: newSet };
    }),

  selectAll: (commandIds) =>
    set({ selectedCommandIds: new Set(commandIds) }),

  clearSelection: () => set({ selectedCommandIds: new Set() }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  setRequiresAdminFilter: (requiresAdmin) =>
    set({ requiresAdminFilter: requiresAdmin }),

  setRiskLevelFilter: (riskLevel) => set({ riskLevelFilter: riskLevel }),

  getSelectedCommands: () => {
    const { catalog, selectedCommandIds } = get();
    if (!catalog) return [];

    return catalog.commands.filter((cmd) => selectedCommandIds.has(cmd.id));
  },
}));

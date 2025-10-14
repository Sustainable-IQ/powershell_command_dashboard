import { Pack, PackSchema, Command, ValidationError, validatePack } from "./schema";
import * as fs from "fs";
import * as path from "path";

/**
 * Catalog of all loaded commands
 */
export interface Catalog {
  commands: Command[];
  packs: Pack[];
  errors: ValidationError[];
}

/**
 * Load built-in packs from extension bundle
 */
export function loadBuiltInPacks(packsDir: string): Catalog {
  const catalog: Catalog = {
    commands: [],
    packs: [],
    errors: [],
  };

  if (!fs.existsSync(packsDir)) {
    catalog.errors.push({
      path: packsDir,
      message: "Built-in packs directory not found",
    });
    return catalog;
  }

  const packFiles = fs
    .readdirSync(packsDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of packFiles) {
    const filePath = path.join(packsDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const errors = validatePack(data, file);

      if (errors.length > 0) {
        catalog.errors.push(...errors);
        continue;
      }

      const pack = PackSchema.parse(data);
      catalog.packs.push(pack);
      catalog.commands.push(...pack.commands);
    } catch (error) {
      catalog.errors.push({
        path: filePath,
        message: error instanceof Error ? error.message : "Unknown error loading pack",
        packId: file,
      });
    }
  }

  return catalog;
}

/**
 * Load custom packs from user-provided directory
 */
export function loadCustomPacks(customDir: string): Catalog {
  const catalog: Catalog = {
    commands: [],
    packs: [],
    errors: [],
  };

  if (!fs.existsSync(customDir)) {
    catalog.errors.push({
      path: customDir,
      message: "Custom packs directory not found",
    });
    return catalog;
  }

  const packFiles = fs
    .readdirSync(customDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of packFiles) {
    const filePath = path.join(customDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const errors = validatePack(data, file);

      if (errors.length > 0) {
        catalog.errors.push(...errors);
        continue;
      }

      const pack = PackSchema.parse(data);
      catalog.packs.push(pack);
      catalog.commands.push(...pack.commands);
    } catch (error) {
      catalog.errors.push({
        path: filePath,
        message: error instanceof Error ? error.message : "Unknown error loading pack",
        packId: file,
      });
    }
  }

  return catalog;
}

/**
 * Merge built-in and custom catalogs
 * Custom commands override built-in commands by ID ("last wins")
 */
export function mergeCatalogs(builtIn: Catalog, custom: Catalog): Catalog {
  const merged: Catalog = {
    commands: [],
    packs: [...builtIn.packs, ...custom.packs],
    errors: [...builtIn.errors, ...custom.errors],
  };

  // Build command map with built-in first, then custom (last wins)
  const commandMap = new Map<string, Command>();
  const duplicates: string[] = [];

  for (const cmd of builtIn.commands) {
    commandMap.set(cmd.id, cmd);
  }

  for (const cmd of custom.commands) {
    if (commandMap.has(cmd.id)) {
      duplicates.push(cmd.id);
    }
    commandMap.set(cmd.id, cmd);
  }

  merged.commands = Array.from(commandMap.values());

  // Warn about duplicates
  if (duplicates.length > 0) {
    merged.errors.push({
      path: "merge",
      message: `Custom commands override built-in: ${duplicates.join(", ")}`,
    });
  }

  return merged;
}

/**
 * Load full catalog (built-in + optional custom)
 */
export function loadCatalog(
  builtInPacksDir: string,
  customPacksDir?: string
): Catalog {
  const builtIn = loadBuiltInPacks(builtInPacksDir);

  if (!customPacksDir) {
    return builtIn;
  }

  const custom = loadCustomPacks(customPacksDir);
  return mergeCatalogs(builtIn, custom);
}

/**
 * Get command by ID
 */
export function getCommandById(catalog: Catalog, id: string): Command | undefined {
  return catalog.commands.find((cmd) => cmd.id === id);
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(
  catalog: Catalog,
  category: Command["category"]
): Command[] {
  return catalog.commands.filter((cmd) => cmd.category === category);
}

/**
 * Filter commands by criteria
 */
export interface CommandFilter {
  category?: Command["category"];
  requiresAdmin?: boolean;
  riskLevel?: Command["riskLevel"];
  tags?: string[];
  search?: string; // Search in label/description
}

export function filterCommands(catalog: Catalog, filter: CommandFilter): Command[] {
  let results = catalog.commands;

  if (filter.category) {
    results = results.filter((cmd) => cmd.category === filter.category);
  }

  if (filter.requiresAdmin !== undefined) {
    results = results.filter((cmd) => cmd.requiresAdmin === filter.requiresAdmin);
  }

  if (filter.riskLevel) {
    results = results.filter((cmd) => cmd.riskLevel === filter.riskLevel);
  }

  if (filter.tags && filter.tags.length > 0) {
    results = results.filter((cmd) =>
      filter.tags!.some((tag) => cmd.tags.includes(tag))
    );
  }

  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    results = results.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(searchLower) ||
        cmd.description.toLowerCase().includes(searchLower) ||
        cmd.id.includes(searchLower)
    );
  }

  return results;
}

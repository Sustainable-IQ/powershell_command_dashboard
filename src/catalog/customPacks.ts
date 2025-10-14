import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Pack, PackSchema, Command, ValidationError, validatePack } from './schema';
import { Catalog } from './loadCatalog';
import { ConfigManager } from '../settings/config';

export interface CustomPackResult {
    packs: Pack[];
    commands: Command[];
    errors: ValidationError[];
}

/**
 * Load custom packs from configured file paths
 */
export function loadCustomPacksFromPaths(paths: string[]): CustomPackResult {
    const result: CustomPackResult = {
        packs: [],
        commands: [],
        errors: []
    };

    for (const packPath of paths) {
        if (!packPath || packPath.trim() === '') {
            continue;
        }

        const absolutePath = path.isAbsolute(packPath)
            ? packPath
            : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', packPath);

        if (!fs.existsSync(absolutePath)) {
            result.errors.push({
                path: absolutePath,
                message: `Custom pack file not found: ${packPath}`
            });
            continue;
        }

        try {
            const content = fs.readFileSync(absolutePath, 'utf-8');
            const data = JSON.parse(content);
            const errors = validatePack(data, path.basename(packPath));

            if (errors.length > 0) {
                result.errors.push(...errors);
                continue;
            }

            const pack = PackSchema.parse(data);
            result.packs.push(pack);
            result.commands.push(...pack.commands);
        } catch (error) {
            result.errors.push({
                path: absolutePath,
                message: error instanceof Error ? error.message : 'Unknown error loading custom pack',
                packId: path.basename(packPath)
            });
        }
    }

    return result;
}

/**
 * Merge custom packs with built-in catalog
 */
export function mergeWithCustomPacks(builtIn: Catalog, customResult: CustomPackResult): Catalog {
    const merged: Catalog = {
        commands: [],
        packs: [...builtIn.packs],
        errors: [...builtIn.errors, ...customResult.errors]
    };

    // Build command map with built-in first, then custom (last wins)
    const commandMap = new Map<string, Command>();
    const packMap = new Map<string, Pack>();
    const duplicateCommands: string[] = [];
    const duplicatePacks: string[] = [];

    // Add built-in packs and commands
    for (const pack of builtIn.packs) {
        packMap.set(pack.id, pack);
    }
    for (const cmd of builtIn.commands) {
        commandMap.set(cmd.id, cmd);
    }

    // Add custom packs (override if duplicate ID)
    for (const pack of customResult.packs) {
        if (packMap.has(pack.id)) {
            duplicatePacks.push(pack.id);
        }
        packMap.set(pack.id, pack);
    }

    // Add custom commands (override if duplicate ID)
    for (const cmd of customResult.commands) {
        if (commandMap.has(cmd.id)) {
            duplicateCommands.push(cmd.id);
        }
        commandMap.set(cmd.id, cmd);
    }

    merged.packs = Array.from(packMap.values());
    merged.commands = Array.from(commandMap.values());

    // Add warnings about duplicates
    if (duplicatePacks.length > 0) {
        merged.errors.push({
            path: 'custom-packs',
            message: `Custom packs override built-in packs (last-wins): ${duplicatePacks.join(', ')}`
        });
    }

    if (duplicateCommands.length > 0) {
        merged.errors.push({
            path: 'custom-packs',
            message: `Custom commands override built-in commands (last-wins): ${duplicateCommands.join(', ')}`
        });
    }

    return merged;
}

/**
 * Custom pack manager that handles loading and validation
 */
export class CustomPackManager {
    private outputChannel: vscode.OutputChannel;
    private currentCatalog: Catalog | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private builtInCatalog: Catalog) {
        this.outputChannel = vscode.window.createOutputChannel('PS Dashboard');

        // Listen for configuration changes
        const config = ConfigManager.getInstance();
        this.disposables.push(
            config.onLiveChange('psDashboard.packs.customPaths', () => {
                this.reload();
            })
        );
    }

    /**
     * Load and merge custom packs
     */
    load(): Catalog {
        const config = ConfigManager.getInstance();
        const customPaths = config.customPackPaths;

        if (!customPaths || customPaths.length === 0) {
            this.currentCatalog = this.builtInCatalog;
            return this.currentCatalog;
        }

        const customResult = loadCustomPacksFromPaths(customPaths);
        this.currentCatalog = mergeWithCustomPacks(this.builtInCatalog, customResult);

        // Log and notify about errors
        this.logResults(customResult, this.currentCatalog);

        return this.currentCatalog;
    }

    /**
     * Reload custom packs (called on config change)
     */
    reload(): Catalog {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] Reloading custom packs...`);
        const catalog = this.load();

        // Notify extension about catalog change
        vscode.commands.executeCommand('psDashboard.catalogReloaded', catalog);

        return catalog;
    }

    /**
     * Log results to output channel and show notifications
     */
    private logResults(customResult: CustomPackResult, merged: Catalog) {
        this.outputChannel.clear();
        this.outputChannel.appendLine('=== PS Dashboard Custom Packs ===');
        this.outputChannel.appendLine(`Loaded: ${customResult.packs.length} custom packs`);
        this.outputChannel.appendLine(`Commands: ${customResult.commands.length} custom commands`);

        if (customResult.errors.length > 0) {
            this.outputChannel.appendLine('\n=== Validation Errors ===');
            for (const error of customResult.errors) {
                this.outputChannel.appendLine(`[ERROR] ${error.path}: ${error.message}`);
            }
        }

        // Find warnings (duplicate IDs)
        const warnings = merged.errors.filter(e =>
            e.message.includes('override') && e.path === 'custom-packs'
        );

        if (warnings.length > 0) {
            this.outputChannel.appendLine('\n=== Warnings ===');
            for (const warning of warnings) {
                this.outputChannel.appendLine(`[WARN] ${warning.message}`);
            }
        }

        // Show non-blocking notifications
        if (customResult.errors.length > 0) {
            vscode.window.showWarningMessage(
                `Custom packs loaded with ${customResult.errors.length} error(s). Check Output panel.`,
                'Show Output'
            ).then(selection => {
                if (selection === 'Show Output') {
                    this.outputChannel.show();
                }
            });
        } else if (warnings.length > 0) {
            vscode.window.showInformationMessage(
                `Custom packs loaded successfully (${warnings.length} override warning(s))`,
                'Show Details'
            ).then(selection => {
                if (selection === 'Show Details') {
                    this.outputChannel.show();
                }
            });
        }
    }

    /**
     * Get current catalog
     */
    getCatalog(): Catalog | undefined {
        return this.currentCatalog;
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.outputChannel.dispose();
    }
}
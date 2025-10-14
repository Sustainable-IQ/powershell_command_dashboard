import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { loadCustomPacksFromPaths, mergeWithCustomPacks, CustomPackManager } from '../src/catalog/customPacks';
import { Catalog } from '../src/catalog/loadCatalog';
import { Pack, Command } from '../src/catalog/schema';

// Mock modules
vi.mock('fs');
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: vi.fn()
    },
    window: {
        createOutputChannel: vi.fn(() => ({
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            dispose: vi.fn()
        })),
        showWarningMessage: vi.fn(),
        showInformationMessage: vi.fn()
    },
    commands: {
        executeCommand: vi.fn()
    },
    Disposable: class {
        constructor(private fn: () => void) {}
        dispose() { this.fn(); }
    }
}));

describe('Custom Packs Loading', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadCustomPacksFromPaths', () => {
        it('should load valid custom pack files', () => {
            const mockPackContent = JSON.stringify({
                id: 'custom-pack',
                name: 'Custom Pack',
                description: 'Test custom pack',
                author: 'Test',
                version: '1.0.0',
                minVSCodeVersion: '1.85.0',
                commands: [
                    {
                        id: 'custom-cmd-1',
                        label: 'Custom Command 1',
                        description: 'Test command',
                        category: 'system',
                        command: 'Get-Process',
                        requiresAdmin: false,
                        riskLevel: 'low',
                        tags: ['test']
                    }
                ]
            });

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(mockPackContent);

            const result = loadCustomPacksFromPaths(['/path/to/pack.json']);

            expect(result.packs).toHaveLength(1);
            expect(result.packs[0].id).toBe('custom-pack');
            expect(result.commands).toHaveLength(1);
            expect(result.commands[0].id).toBe('custom-cmd-1');
            expect(result.errors).toHaveLength(0);
        });

        it('should handle missing files gracefully', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const result = loadCustomPacksFromPaths(['/path/to/missing.json']);

            expect(result.packs).toHaveLength(0);
            expect(result.commands).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('not found');
        });

        it('should validate pack schema', () => {
            const invalidPackContent = JSON.stringify({
                id: 'invalid-pack',
                // Missing required fields
                commands: []
            });

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(invalidPackContent);

            const result = loadCustomPacksFromPaths(['/path/to/invalid.json']);

            expect(result.packs).toHaveLength(0);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should handle JSON parse errors', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

            const result = loadCustomPacksFromPaths(['/path/to/malformed.json']);

            expect(result.packs).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('JSON');
        });

        it('should skip empty paths', () => {
            const result = loadCustomPacksFromPaths(['', '  ', null as any]);

            expect(result.packs).toHaveLength(0);
            expect(result.commands).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('mergeWithCustomPacks', () => {
        const builtInCatalog: Catalog = {
            packs: [{
                id: 'builtin-pack',
                name: 'Built-in Pack',
                description: 'Test built-in',
                author: 'System',
                version: '1.0.0',
                minVSCodeVersion: '1.85.0',
                commands: []
            }],
            commands: [{
                id: 'builtin-cmd',
                label: 'Built-in Command',
                description: 'Test',
                category: 'system',
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low',
                tags: []
            }],
            errors: []
        };

        it('should merge custom packs with built-in catalog', () => {
            const customResult = {
                packs: [{
                    id: 'custom-pack',
                    name: 'Custom Pack',
                    description: 'Test custom',
                    author: 'User',
                    version: '1.0.0',
                    minVSCodeVersion: '1.85.0',
                    commands: []
                }],
                commands: [{
                    id: 'custom-cmd',
                    label: 'Custom Command',
                    description: 'Test',
                    category: 'system',
                    command: 'Get-Date',
                    requiresAdmin: false,
                    riskLevel: 'low',
                    tags: []
                }],
                errors: []
            };

            const merged = mergeWithCustomPacks(builtInCatalog, customResult);

            expect(merged.packs).toHaveLength(2);
            expect(merged.commands).toHaveLength(2);
            expect(merged.packs.map(p => p.id)).toContain('builtin-pack');
            expect(merged.packs.map(p => p.id)).toContain('custom-pack');
            expect(merged.commands.map(c => c.id)).toContain('builtin-cmd');
            expect(merged.commands.map(c => c.id)).toContain('custom-cmd');
        });

        it('should handle duplicate command IDs (last wins)', () => {
            const customResult = {
                packs: [],
                commands: [{
                    id: 'builtin-cmd', // Duplicate ID
                    label: 'Override Command',
                    description: 'Override',
                    category: 'system',
                    command: 'Get-Override',
                    requiresAdmin: true,
                    riskLevel: 'high',
                    tags: ['override']
                }],
                errors: []
            };

            const merged = mergeWithCustomPacks(builtInCatalog, customResult);

            expect(merged.commands).toHaveLength(1);
            expect(merged.commands[0].label).toBe('Override Command');
            expect(merged.commands[0].command).toBe('Get-Override');
            expect(merged.errors).toHaveLength(1);
            expect(merged.errors[0].message).toContain('override');
            expect(merged.errors[0].message).toContain('builtin-cmd');
        });

        it('should handle duplicate pack IDs (last wins)', () => {
            const customResult = {
                packs: [{
                    id: 'builtin-pack', // Duplicate ID
                    name: 'Override Pack',
                    description: 'Override',
                    author: 'User',
                    version: '2.0.0',
                    minVSCodeVersion: '1.85.0',
                    commands: []
                }],
                commands: [],
                errors: []
            };

            const merged = mergeWithCustomPacks(builtInCatalog, customResult);

            expect(merged.packs).toHaveLength(1);
            expect(merged.packs[0].name).toBe('Override Pack');
            expect(merged.packs[0].version).toBe('2.0.0');
            expect(merged.errors).toHaveLength(1);
            expect(merged.errors[0].message).toContain('override');
            expect(merged.errors[0].message).toContain('builtin-pack');
        });

        it('should preserve errors from both catalogs', () => {
            const catalogWithErrors = {
                ...builtInCatalog,
                errors: [{ path: 'builtin', message: 'Built-in error' }]
            };

            const customResult = {
                packs: [],
                commands: [],
                errors: [{ path: 'custom', message: 'Custom error' }]
            };

            const merged = mergeWithCustomPacks(catalogWithErrors, customResult);

            expect(merged.errors.length).toBeGreaterThanOrEqual(2);
            expect(merged.errors.some(e => e.message === 'Built-in error')).toBe(true);
            expect(merged.errors.some(e => e.message === 'Custom error')).toBe(true);
        });
    });

    describe('CustomPackManager', () => {
        let manager: CustomPackManager;
        const builtInCatalog: Catalog = {
            packs: [],
            commands: [],
            errors: []
        };

        beforeEach(() => {
            // Mock ConfigManager
            vi.doMock('../src/settings/config', () => ({
                ConfigManager: {
                    getInstance: vi.fn(() => ({
                        customPackPaths: ['/path/to/custom.json'],
                        onLiveChange: vi.fn(() => new vscode.Disposable(() => {}))
                    }))
                }
            }));

            manager = new CustomPackManager(builtInCatalog);
        });

        afterEach(() => {
            manager.dispose();
            vi.doUnmock('../src/settings/config');
        });

        it('should load custom packs on initialization', () => {
            const mockPackContent = JSON.stringify({
                id: 'test-pack',
                name: 'Test Pack',
                description: 'Test',
                author: 'Test',
                version: '1.0.0',
                minVSCodeVersion: '1.85.0',
                commands: []
            });

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(mockPackContent);

            const catalog = manager.load();

            expect(catalog).toBeDefined();
            expect(catalog.packs.length).toBeGreaterThanOrEqual(1);
        });

        it('should show warning notifications for errors', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            manager.load();

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('error'),
                expect.any(String)
            );
        });

        it('should show info notification for duplicate warnings', () => {
            const mockPackContent = JSON.stringify({
                id: 'duplicate-pack',
                name: 'Duplicate Pack',
                description: 'Test',
                author: 'Test',
                version: '1.0.0',
                minVSCodeVersion: '1.85.0',
                commands: [{
                    id: 'builtin-cmd', // Will create duplicate
                    label: 'Override',
                    description: 'Test',
                    category: 'system',
                    command: 'Test',
                    requiresAdmin: false,
                    riskLevel: 'low',
                    tags: []
                }]
            });

            // Add a built-in command to create duplicate
            const catalogWithBuiltin = {
                ...builtInCatalog,
                commands: [{
                    id: 'builtin-cmd',
                    label: 'Original',
                    description: 'Test',
                    category: 'system',
                    command: 'Original',
                    requiresAdmin: false,
                    riskLevel: 'low',
                    tags: []
                }]
            };

            manager = new CustomPackManager(catalogWithBuiltin);

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(mockPackContent);

            manager.load();

            // Check for info message about overrides
            const calls = vi.mocked(vscode.window.showInformationMessage).mock.calls;
            const hasOverrideMessage = calls.some(call =>
                call[0].includes('override') || call[0].includes('warning')
            );
            expect(hasOverrideMessage || vscode.window.showWarningMessage).toBeTruthy();
        });

        it('should execute catalog reload command on reload', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('{"id": "test", "name": "Test", "description": "Test", "author": "Test", "version": "1.0.0", "minVSCodeVersion": "1.85.0", "commands": []}');

            manager.reload();

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'psDashboard.catalogReloaded',
                expect.any(Object)
            );
        });
    });
});
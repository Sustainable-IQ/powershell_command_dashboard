import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { ConfigManager } from '../src/settings/config';

// Mock vscode module
vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: vi.fn(),
        onDidChangeConfiguration: vi.fn()
    },
    window: {
        showInformationMessage: vi.fn()
    },
    ConfigurationTarget: {
        Workspace: 1,
        Global: 2
    },
    Disposable: class {
        constructor(private fn: () => void) {}
        dispose() { this.fn(); }
    }
}));

describe('ConfigManager', () => {
    let configManager: ConfigManager;
    let mockConfig: any;
    let changeListeners: ((e: any) => void)[] = [];

    beforeEach(() => {
        // Reset singleton
        (ConfigManager as any).instance = undefined;

        // Setup mock configuration
        mockConfig = {
            get: vi.fn((key: string) => {
                const settings: any = {
                    'psDashboard.shell.preferred': 'auto',
                    'psDashboard.execution.mode': 'headless',
                    'psDashboard.artifacts.retentionDays': 14,
                    'psDashboard.packs.customPaths': [],
                    'psDashboard.ui.search.debounceMs': 50,
                    'psDashboard.security.redaction.enabled': false,
                    'psDashboard.elevation.waitTimeoutMs': 60000,
                    'psDashboard.history.maxEntries': 100,
                    'psDashboard.runner.killOnCancel': true,
                    'psDashboard.telemetry.enabled': false
                };
                return settings[key];
            }),
            update: vi.fn()
        };

        vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);
        vi.mocked(vscode.workspace.onDidChangeConfiguration).mockImplementation(
            (listener: any) => {
                changeListeners.push(listener);
                return new vscode.Disposable(() => {
                    const index = changeListeners.indexOf(listener);
                    if (index > -1) changeListeners.splice(index, 1);
                });
            }
        );

        configManager = ConfigManager.getInstance();
    });

    afterEach(() => {
        configManager.dispose();
        changeListeners = [];
        vi.clearAllMocks();
    });

    describe('Default Values', () => {
        it('should return correct default values', () => {
            expect(configManager.shellPreferred).toBe('auto');
            expect(configManager.executionMode).toBe('headless');
            expect(configManager.artifactsRetentionDays).toBe(14);
            expect(configManager.customPackPaths).toEqual([]);
            expect(configManager.searchDebounceMs).toBe(50);
            expect(configManager.redactionEnabled).toBe(false);
            expect(configManager.elevationWaitTimeoutMs).toBe(60000);
            expect(configManager.historyMaxEntries).toBe(100);
            expect(configManager.runnerKillOnCancel).toBe(true);
            expect(configManager.telemetryEnabled).toBe(false);
        });

        it('should handle undefined settings gracefully', () => {
            mockConfig.get.mockReturnValue(undefined);

            expect(configManager.shellPreferred).toBe('auto');
            expect(configManager.executionMode).toBe('headless');
            expect(configManager.artifactsRetentionDays).toBe(14);
            expect(configManager.searchDebounceMs).toBe(50);
            expect(configManager.runnerKillOnCancel).toBe(true);
        });
    });

    describe('Typed Getters', () => {
        it('should return typed configuration object', () => {
            const config = configManager.getConfig();

            expect(config).toEqual({
                shell: { preferred: 'auto' },
                execution: { mode: 'headless' },
                artifacts: { retentionDays: 14 },
                packs: { customPaths: [] },
                ui: { search: { debounceMs: 50 } },
                security: { redaction: { enabled: false } },
                elevation: { waitTimeoutMs: 60000 },
                history: { maxEntries: 100 },
                runner: { killOnCancel: true },
                telemetry: { enabled: false }
            });
        });

        it('should handle different shell preferences', () => {
            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'psDashboard.shell.preferred') return 'pwsh';
                return undefined;
            });

            expect(configManager.shellPreferred).toBe('pwsh');

            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'psDashboard.shell.preferred') return 'powershell';
                return undefined;
            });

            expect(configManager.shellPreferred).toBe('powershell');
        });

        it('should handle different execution modes', () => {
            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'psDashboard.execution.mode') return 'terminal';
                return undefined;
            });

            expect(configManager.executionMode).toBe('terminal');
        });
    });

    describe('Live Change Propagation', () => {
        it('should notify listeners on live-apply settings changes', () => {
            const callback = vi.fn();
            configManager.onLiveChange('psDashboard.ui.search.debounceMs', callback);

            // Simulate configuration change
            const mockEvent = {
                affectsConfiguration: (key: string) => key === 'psDashboard.ui.search.debounceMs'
            };

            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'psDashboard.ui.search.debounceMs') return 100;
                return undefined;
            });

            // Trigger change event
            changeListeners.forEach(listener => listener(mockEvent));

            expect(callback).toHaveBeenCalledWith(100);
        });

        it('should show info message for next-run settings', () => {
            const mockEvent = {
                affectsConfiguration: (key: string) => key === 'psDashboard.shell.preferred'
            };

            changeListeners.forEach(listener => listener(mockEvent));

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('will apply on next command execution')
            );
        });

        it('should handle multiple live change callbacks', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            configManager.onLiveChange('psDashboard.security.redaction.enabled', callback1);
            configManager.onLiveChange('psDashboard.security.redaction.enabled', callback2);

            const mockEvent = {
                affectsConfiguration: (key: string) => key === 'psDashboard.security.redaction.enabled'
            };

            mockConfig.get.mockImplementation((key: string) => {
                if (key === 'psDashboard.security.redaction.enabled') return true;
                return undefined;
            });

            changeListeners.forEach(listener => listener(mockEvent));

            expect(callback1).toHaveBeenCalledWith(true);
            expect(callback2).toHaveBeenCalledWith(true);
        });

        it('should properly dispose live change listeners', () => {
            const callback = vi.fn();
            const disposable = configManager.onLiveChange('psDashboard.history.maxEntries', callback);

            disposable.dispose();

            const mockEvent = {
                affectsConfiguration: (key: string) => key === 'psDashboard.history.maxEntries'
            };

            changeListeners.forEach(listener => listener(mockEvent));

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Setting Updates', () => {
        it('should update settings correctly', async () => {
            await configManager.updateSetting('psDashboard.shell.preferred', 'pwsh');

            expect(mockConfig.update).toHaveBeenCalledWith(
                'psDashboard.shell.preferred',
                'pwsh',
                vscode.ConfigurationTarget.Workspace
            );
        });

        it('should update with different target', async () => {
            await configManager.updateSetting(
                'psDashboard.execution.mode',
                'terminal',
                vscode.ConfigurationTarget.Global
            );

            expect(mockConfig.update).toHaveBeenCalledWith(
                'psDashboard.execution.mode',
                'terminal',
                vscode.ConfigurationTarget.Global
            );
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance', () => {
            const instance1 = ConfigManager.getInstance();
            const instance2 = ConfigManager.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should reset instance on dispose', () => {
            const instance1 = ConfigManager.getInstance();
            instance1.dispose();

            const instance2 = ConfigManager.getInstance();
            expect(instance1).not.toBe(instance2);
        });
    });
});
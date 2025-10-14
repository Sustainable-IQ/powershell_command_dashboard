import * as vscode from 'vscode';

export interface PsDashboardConfig {
    shell: {
        preferred: 'auto' | 'pwsh' | 'powershell';
    };
    execution: {
        mode: 'headless' | 'terminal';
    };
    artifacts: {
        retentionDays: number;
    };
    packs: {
        customPaths: string[];
    };
    ui: {
        search: {
            debounceMs: number;
        };
    };
    security: {
        redaction: {
            enabled: boolean;
        };
    };
    elevation: {
        waitTimeoutMs: number;
    };
    history: {
        maxEntries: number;
    };
    runner: {
        killOnCancel: boolean;
    };
    telemetry: {
        enabled: boolean;
    };
}

type LiveChangeCallback = (value: any) => void;

export class ConfigManager {
    private static instance: ConfigManager | undefined;
    private disposables: vscode.Disposable[] = [];
    private liveChangeCallbacks: Map<string, LiveChangeCallback[]> = new Map();

    private constructor() {
        // Register configuration change listener
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                this.handleConfigurationChange(e);
            })
        );
    }

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private handleConfigurationChange(e: vscode.ConfigurationChangeEvent) {
        // Live-apply changes
        const liveApplySettings = [
            'psDashboard.ui.search.debounceMs',
            'psDashboard.security.redaction.enabled',
            'psDashboard.history.maxEntries',
            'psDashboard.runner.killOnCancel'
        ];

        // Apply-on-next-run changes (show notification)
        const nextRunSettings = [
            'psDashboard.shell.preferred',
            'psDashboard.execution.mode',
            'psDashboard.artifacts.retentionDays',
            'psDashboard.elevation.waitTimeoutMs'
        ];

        for (const setting of liveApplySettings) {
            if (e.affectsConfiguration(setting)) {
                this.notifyLiveChange(setting);
            }
        }

        for (const setting of nextRunSettings) {
            if (e.affectsConfiguration(setting)) {
                vscode.window.showInformationMessage(
                    `Setting "${setting}" will apply on next command execution`
                );
            }
        }

        // Handle custom packs change
        if (e.affectsConfiguration('psDashboard.packs.customPaths')) {
            this.notifyLiveChange('psDashboard.packs.customPaths');
        }
    }

    private notifyLiveChange(setting: string) {
        const callbacks = this.liveChangeCallbacks.get(setting) || [];
        const value = this.getRawSetting(setting);
        for (const callback of callbacks) {
            callback(value);
        }
    }

    onLiveChange(setting: string, callback: LiveChangeCallback): vscode.Disposable {
        const callbacks = this.liveChangeCallbacks.get(setting) || [];
        callbacks.push(callback);
        this.liveChangeCallbacks.set(setting, callbacks);

        return new vscode.Disposable(() => {
            const cbs = this.liveChangeCallbacks.get(setting) || [];
            const index = cbs.indexOf(callback);
            if (index > -1) {
                cbs.splice(index, 1);
            }
        });
    }

    private getRawSetting(key: string): any {
        const config = vscode.workspace.getConfiguration();
        return config.get(key);
    }

    // Typed getters
    get shellPreferred(): 'auto' | 'pwsh' | 'powershell' {
        return this.getRawSetting('psDashboard.shell.preferred') || 'auto';
    }

    get executionMode(): 'headless' | 'terminal' {
        return this.getRawSetting('psDashboard.execution.mode') || 'headless';
    }

    get artifactsRetentionDays(): number {
        return this.getRawSetting('psDashboard.artifacts.retentionDays') || 14;
    }

    get customPackPaths(): string[] {
        return this.getRawSetting('psDashboard.packs.customPaths') || [];
    }

    get searchDebounceMs(): number {
        return this.getRawSetting('psDashboard.ui.search.debounceMs') || 50;
    }

    get redactionEnabled(): boolean {
        return this.getRawSetting('psDashboard.security.redaction.enabled') || false;
    }

    get elevationWaitTimeoutMs(): number {
        return this.getRawSetting('psDashboard.elevation.waitTimeoutMs') || 60000;
    }

    get historyMaxEntries(): number {
        return this.getRawSetting('psDashboard.history.maxEntries') || 100;
    }

    get runnerKillOnCancel(): boolean {
        return this.getRawSetting('psDashboard.runner.killOnCancel') ?? true;
    }

    get telemetryEnabled(): boolean {
        return this.getRawSetting('psDashboard.telemetry.enabled') || false;
    }

    // Full config getter
    getConfig(): PsDashboardConfig {
        return {
            shell: {
                preferred: this.shellPreferred
            },
            execution: {
                mode: this.executionMode
            },
            artifacts: {
                retentionDays: this.artifactsRetentionDays
            },
            packs: {
                customPaths: this.customPackPaths
            },
            ui: {
                search: {
                    debounceMs: this.searchDebounceMs
                }
            },
            security: {
                redaction: {
                    enabled: this.redactionEnabled
                }
            },
            elevation: {
                waitTimeoutMs: this.elevationWaitTimeoutMs
            },
            history: {
                maxEntries: this.historyMaxEntries
            },
            runner: {
                killOnCancel: this.runnerKillOnCancel
            },
            telemetry: {
                enabled: this.telemetryEnabled
            }
        };
    }

    // Update a setting
    async updateSetting(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace) {
        const config = vscode.workspace.getConfiguration();
        await config.update(key, value, target);
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
        this.liveChangeCallbacks.clear();
        ConfigManager.instance = undefined;
    }
}
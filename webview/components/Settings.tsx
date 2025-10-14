import React, { useState, useEffect } from 'react';
import {
    VSCodeButton,
    VSCodeDropdown,
    VSCodeOption,
    VSCodeTextField,
    VSCodeCheckbox,
    VSCodeDivider,
    VSCodeBadge
} from '@vscode/webview-ui-toolkit/react';

interface SettingsProps {
    vscode: any;
}

interface ConfigSettings {
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
}

export function Settings({ vscode }: SettingsProps) {
    const [settings, setSettings] = useState<ConfigSettings>({
        shell: { preferred: 'auto' },
        execution: { mode: 'headless' },
        artifacts: { retentionDays: 14 },
        packs: { customPaths: [] },
        ui: { search: { debounceMs: 50 } },
        security: { redaction: { enabled: false } },
        elevation: { waitTimeoutMs: 60000 },
        history: { maxEntries: 100 },
        runner: { killOnCancel: true }
    });

    const [customPacks, setCustomPacks] = useState<string[]>([]);
    const [newPackPath, setNewPackPath] = useState('');
    const [packWarnings, setPackWarnings] = useState<string[]>([]);

    useEffect(() => {
        // Request current settings from extension
        vscode.postMessage({ type: 'getSettings' });

        // Listen for settings updates
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'settingsLoaded':
                    setSettings(message.settings);
                    setCustomPacks(message.settings.packs.customPaths || []);
                    break;
                case 'customPacksValidated':
                    setPackWarnings(message.warnings || []);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);

    const updateSetting = (path: string, value: any, appliesNextRun = false) => {
        // Update local state
        const newSettings = { ...settings };
        const keys = path.split('.');
        let current: any = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        setSettings(newSettings);

        // Send to extension
        vscode.postMessage({
            type: 'updateSetting',
            setting: `psDashboard.${path}`,
            value,
            appliesNextRun
        });
    };

    const addCustomPack = () => {
        if (newPackPath.trim()) {
            const updated = [...customPacks, newPackPath.trim()];
            setCustomPacks(updated);
            updateSetting('packs.customPaths', updated);
            setNewPackPath('');
        }
    };

    const removeCustomPack = (index: number) => {
        const updated = customPacks.filter((_, i) => i !== index);
        setCustomPacks(updated);
        updateSetting('packs.customPaths', updated);
    };

    return (
        <div className="settings-panel">
            <h2>Dashboard Settings</h2>

            <section>
                <h3>Shell Configuration</h3>
                <div className="setting-group">
                    <label htmlFor="shell-select">Preferred PowerShell Shell</label>
                    <VSCodeDropdown
                        id="shell-select"
                        value={settings.shell.preferred}
                        onChange={(e: any) => updateSetting('shell.preferred', e.target.value, true)}
                    >
                        <VSCodeOption value="auto">Auto-detect</VSCodeOption>
                        <VSCodeOption value="pwsh">PowerShell 7+ (pwsh)</VSCodeOption>
                        <VSCodeOption value="powershell">Windows PowerShell 5.1</VSCodeOption>
                    </VSCodeDropdown>
                    {settings.shell.preferred !== 'auto' && (
                        <VSCodeBadge>Applies on next run</VSCodeBadge>
                    )}
                </div>

                <div className="setting-group">
                    <label htmlFor="execution-mode">Execution Mode</label>
                    <VSCodeDropdown
                        id="execution-mode"
                        value={settings.execution.mode}
                        onChange={(e: any) => updateSetting('execution.mode', e.target.value, true)}
                    >
                        <VSCodeOption value="headless">Headless (JSONL streaming)</VSCodeOption>
                        <VSCodeOption value="terminal">Terminal (VS Code integrated)</VSCodeOption>
                    </VSCodeDropdown>
                    {settings.execution.mode === 'terminal' && (
                        <p className="setting-note">
                            Note: Terminal mode does not provide structured output or progress tracking.
                        </p>
                    )}
                </div>
            </section>

            <VSCodeDivider />

            <section>
                <h3>Performance & Limits</h3>
                <div className="setting-group">
                    <label htmlFor="debounce">Search Debounce (ms)</label>
                    <VSCodeTextField
                        id="debounce"
                        type="number"
                        value={settings.ui.search.debounceMs.toString()}
                        min="0"
                        max="1000"
                        onChange={(e: any) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val >= 0 && val <= 1000) {
                                updateSetting('ui.search.debounceMs', val);
                            }
                        }}
                    />
                </div>

                <div className="setting-group">
                    <label htmlFor="history-max">Max History Entries</label>
                    <VSCodeTextField
                        id="history-max"
                        type="number"
                        value={settings.history.maxEntries.toString()}
                        min="10"
                        max="1000"
                        onChange={(e: any) => {
                            const val = parseInt(e.target.value) || 10;
                            if (val >= 10 && val <= 1000) {
                                updateSetting('history.maxEntries', val);
                            }
                        }}
                    />
                </div>

                <div className="setting-group">
                    <label htmlFor="retention">Artifact Retention (days)</label>
                    <VSCodeTextField
                        id="retention"
                        type="number"
                        value={settings.artifacts.retentionDays.toString()}
                        min="1"
                        max="90"
                        onChange={(e: any) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val >= 1 && val <= 90) {
                                updateSetting('artifacts.retentionDays', val, true);
                            }
                        }}
                    />
                    <VSCodeBadge>Applies on next run</VSCodeBadge>
                </div>

                <div className="setting-group">
                    <label htmlFor="elevation-timeout">Elevation Timeout (ms)</label>
                    <VSCodeTextField
                        id="elevation-timeout"
                        type="number"
                        value={settings.elevation.waitTimeoutMs.toString()}
                        min="10000"
                        max="300000"
                        step="1000"
                        onChange={(e: any) => {
                            const val = parseInt(e.target.value) || 10000;
                            if (val >= 10000 && val <= 300000) {
                                updateSetting('elevation.waitTimeoutMs', val, true);
                            }
                        }}
                    />
                    <VSCodeBadge>Applies on next run</VSCodeBadge>
                </div>
            </section>

            <VSCodeDivider />

            <section>
                <h3>Security & Privacy</h3>
                <div className="setting-group">
                    <VSCodeCheckbox
                        checked={settings.security.redaction.enabled}
                        onChange={(e: any) =>
                            updateSetting('security.redaction.enabled', e.target.checked)
                        }
                    >
                        Enable sensitive data redaction in UI
                    </VSCodeCheckbox>
                    <p className="setting-note">
                        Redacts passwords, keys, and tokens in display only. Artifacts are never modified.
                    </p>
                </div>

                <div className="setting-group">
                    <VSCodeCheckbox
                        checked={settings.runner.killOnCancel}
                        onChange={(e: any) =>
                            updateSetting('runner.killOnCancel', e.target.checked)
                        }
                    >
                        Terminate processes on cancel
                    </VSCodeCheckbox>
                </div>
            </section>

            <VSCodeDivider />

            <section>
                <h3>Custom Command Packs</h3>
                <div className="setting-group">
                    <label>Custom Pack Files</label>
                    <div className="custom-packs-list">
                        {customPacks.map((path, index) => (
                            <div key={index} className="custom-pack-item">
                                <span>{path}</span>
                                <VSCodeButton
                                    appearance="icon"
                                    onClick={() => removeCustomPack(index)}
                                >
                                    Remove
                                </VSCodeButton>
                            </div>
                        ))}
                    </div>

                    <div className="add-pack-row">
                        <VSCodeTextField
                            placeholder="Path to custom pack JSON file"
                            value={newPackPath}
                            onChange={(e: any) => setNewPackPath(e.target.value)}
                        />
                        <VSCodeButton onClick={addCustomPack}>Add Pack</VSCodeButton>
                    </div>

                    {packWarnings.length > 0 && (
                        <div className="pack-warnings">
                            <h4>Warnings:</h4>
                            {packWarnings.map((warning, index) => (
                                <p key={index} className="warning-message">
                                    {warning}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Settings;
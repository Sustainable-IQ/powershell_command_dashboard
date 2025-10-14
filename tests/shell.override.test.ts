import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { PowerShellRunner } from '../src/runner/powershellRunner';
import { ConfigManager } from '../src/settings/config';

// Mock modules
vi.mock('child_process');
vi.mock('vscode', () => ({
    window: {
        createTerminal: vi.fn(),
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn()
    }
}));

vi.mock('../src/settings/config', () => ({
    ConfigManager: {
        getInstance: vi.fn()
    }
}));

describe('PowerShell Runner Shell Override', () => {
    let runner: PowerShellRunner;
    let mockConfig: any;
    let mockProcess: any;

    beforeEach(() => {
        // Setup mock config
        mockConfig = {
            shellPreferred: 'auto',
            executionMode: 'headless',
            runnerKillOnCancel: true,
            elevationWaitTimeoutMs: 60000
        };

        vi.mocked(ConfigManager.getInstance).mockReturnValue(mockConfig);

        // Setup mock process
        mockProcess = {
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn(),
            kill: vi.fn(),
            pid: 12345
        };

        vi.mocked(child_process.spawn).mockReturnValue(mockProcess as any);
        vi.mocked(child_process.execSync).mockImplementation(() => Buffer.from(''));

        runner = new PowerShellRunner();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Shell Selection', () => {
        it('should auto-detect pwsh when available', async () => {
            mockConfig.shellPreferred = 'auto';
            vi.mocked(child_process.execSync).mockImplementation((cmd: string) => {
                if (cmd === 'pwsh -Version') return Buffer.from('7.3.0');
                throw new Error('Command not found');
            });

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            await runner.runCommands(commands);

            expect(child_process.spawn).toHaveBeenCalledWith(
                'pwsh',
                expect.any(Array),
                expect.any(Object)
            );
        });

        it('should fall back to powershell when pwsh not available', async () => {
            mockConfig.shellPreferred = 'auto';
            vi.mocked(child_process.execSync).mockImplementation(() => {
                throw new Error('pwsh not found');
            });

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            await runner.runCommands(commands);

            expect(child_process.spawn).toHaveBeenCalledWith(
                'powershell',
                expect.any(Array),
                expect.any(Object)
            );
        });

        it('should use pwsh when explicitly configured', async () => {
            mockConfig.shellPreferred = 'pwsh';

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            await runner.runCommands(commands);

            expect(child_process.spawn).toHaveBeenCalledWith(
                'pwsh',
                expect.any(Array),
                expect.any(Object)
            );
        });

        it('should use powershell when explicitly configured', async () => {
            mockConfig.shellPreferred = 'powershell';

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            await runner.runCommands(commands);

            expect(child_process.spawn).toHaveBeenCalledWith(
                'powershell',
                expect.any(Array),
                expect.any(Object)
            );
        });
    });

    describe('Execution Modes', () => {
        it('should run in headless mode when configured', async () => {
            mockConfig.executionMode = 'headless';

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            // Setup process mock to resolve
            mockProcess.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });

            await runner.runCommands(commands);

            expect(child_process.spawn).toHaveBeenCalled();
            expect(vscode.window.createTerminal).not.toHaveBeenCalled();
        });

        it('should run in terminal mode when configured', async () => {
            mockConfig.executionMode = 'terminal';

            const mockTerminal = {
                show: vi.fn(),
                sendText: vi.fn()
            };

            vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal as any);

            const commands = [{
                id: 'test1',
                label: 'Test 1',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }, {
                id: 'test2',
                label: 'Test 2',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Date',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            const result = await runner.runCommands(commands);

            expect(vscode.window.createTerminal).toHaveBeenCalledWith({
                name: 'PS Dashboard',
                shellPath: expect.any(String),
                cwd: undefined,
                env: undefined
            });

            expect(mockTerminal.show).toHaveBeenCalled();
            expect(mockTerminal.sendText).toHaveBeenCalledWith('Get-Host\nGet-Date');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Terminal mode')
            );
            expect(result.success).toBe(true);
        });

        it('should use correct shell in terminal mode', async () => {
            mockConfig.executionMode = 'terminal';
            mockConfig.shellPreferred = 'pwsh';

            const mockTerminal = {
                show: vi.fn(),
                sendText: vi.fn()
            };

            vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal as any);

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            await runner.runCommands(commands, {
                workingDirectory: '/test/dir',
                environmentVariables: { TEST: 'value' }
            });

            expect(vscode.window.createTerminal).toHaveBeenCalledWith({
                name: 'PS Dashboard',
                shellPath: 'pwsh',
                cwd: '/test/dir',
                env: { TEST: 'value' }
            });
        });
    });

    describe('Process Cancellation', () => {
        it('should kill process when killOnCancel is true', () => {
            mockConfig.runnerKillOnCancel = true;

            // Simulate a running process
            (runner as any).activeProcess = mockProcess;

            runner.cancel();

            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
            expect((runner as any).activeProcess).toBeUndefined();
        });

        it('should not kill process when killOnCancel is false', () => {
            mockConfig.runnerKillOnCancel = false;

            // Simulate a running process
            (runner as any).activeProcess = mockProcess;

            runner.cancel();

            expect(mockProcess.kill).not.toHaveBeenCalled();
            expect((runner as any).activeProcess).toBeDefined();
        });

        it('should handle cancel when no process is running', () => {
            runner.cancel();

            expect(mockProcess.kill).not.toHaveBeenCalled();
        });
    });

    describe('Elevated Execution', () => {
        it('should show warning for elevated commands', async () => {
            mockConfig.elevationWaitTimeoutMs = 120000;

            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: true,
                riskLevel: 'high' as const,
                tags: []
            }];

            // Setup process mock to resolve
            mockProcess.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });

            await runner.runCommands(commands, { elevated: true });

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('120000ms')
            );
        });
    });

    describe('Process State', () => {
        it('should report busy state correctly', () => {
            expect(runner.isBusy()).toBe(false);

            // Simulate a running process
            (runner as any).activeProcess = mockProcess;

            expect(runner.isBusy()).toBe(true);

            // Clear process
            (runner as any).activeProcess = undefined;

            expect(runner.isBusy()).toBe(false);
        });

        it('should handle process errors', async () => {
            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            mockProcess.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(new Error('Process failed')), 10);
                }
            });

            await expect(runner.runCommands(commands)).rejects.toThrow('Process failed');
        });

        it('should capture stdout and stderr', async () => {
            const commands = [{
                id: 'test',
                label: 'Test',
                description: 'Test',
                category: 'system' as const,
                command: 'Get-Host',
                requiresAdmin: false,
                riskLevel: 'low' as const,
                tags: []
            }];

            let stdoutCallback: Function;
            let stderrCallback: Function;

            mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'data') stdoutCallback = callback;
            });

            mockProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'data') stderrCallback = callback;
            });

            mockProcess.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'close') {
                    setTimeout(() => {
                        stdoutCallback!(Buffer.from('Output data'));
                        stderrCallback!(Buffer.from('Error data'));
                        callback(0);
                    }, 10);
                }
            });

            const result = await runner.runCommands(commands);

            expect(result.output).toContain('Output data');
            expect(result.error).toContain('Error data');
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
        });
    });
});
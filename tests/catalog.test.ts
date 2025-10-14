import { describe, it, expect } from "vitest";
import {
  CommandSchema,
  PackSchema,
  validateCommand,
  validatePack,
} from "../src/catalog/schema";

describe("Command Schema Validation", () => {
  it("should validate a valid command", () => {
    const validCommand = {
      id: "test-command",
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
      commandText: "Get-Process",
      requiresAdmin: false,
      riskLevel: "info",
      os: ["win10", "win11"],
      shell: ["pwsh", "powershell"],
      params: [],
      tags: ["test"],
      deps: [],
      supportsWhatIf: false,
    };

    const result = CommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should reject command with invalid id format", () => {
    const invalidCommand = {
      id: "Test_Command", // Should be kebab-case
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
      commandText: "Get-Process",
    };

    const result = CommandSchema.safeParse(invalidCommand);
    expect(result.success).toBe(false);
  });

  it("should reject command without label", () => {
    const invalidCommand = {
      id: "test-command",
      category: "Inventory",
      description: "A test command",
      commandText: "Get-Process",
    };

    const result = CommandSchema.safeParse(invalidCommand);
    expect(result.success).toBe(false);
  });

  it("should apply default values", () => {
    const minimalCommand = {
      id: "test-command",
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
      commandText: "Get-Process",
    };

    const result = CommandSchema.parse(minimalCommand);
    expect(result.requiresAdmin).toBe(false);
    expect(result.riskLevel).toBe("info");
    expect(result.params).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.deps).toEqual([]);
  });

  it("should reject command with both commandText and scriptPath", () => {
    const command = {
      id: "test-command",
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
      commandText: "Get-Process",
      scriptPath: "script.ps1",
    };

    const errors = validateCommand(command);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("not both");
  });

  it("should reject command without commandText or scriptPath", () => {
    const command = {
      id: "test-command",
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
    };

    const errors = validateCommand(command);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("Pack Schema Validation", () => {
  it("should validate a valid pack", () => {
    const validPack = {
      id: "test-pack",
      name: "Test Pack",
      description: "A test pack",
      version: "1.0.0",
      commands: [
        {
          id: "test-command",
          label: "Test Command",
          category: "Inventory",
          description: "A test command",
          commandText: "Get-Process",
        },
      ],
    };

    const result = PackSchema.safeParse(validPack);
    expect(result.success).toBe(true);
  });

  it("should reject pack with invalid version format", () => {
    const invalidPack = {
      id: "test-pack",
      name: "Test Pack",
      description: "A test pack",
      version: "1.0", // Should be X.Y.Z
      commands: [],
    };

    const result = PackSchema.safeParse(invalidPack);
    expect(result.success).toBe(false);
  });

  it("should reject pack without commands array", () => {
    const invalidPack = {
      id: "test-pack",
      name: "Test Pack",
      description: "A test pack",
      version: "1.0.0",
    };

    const result = PackSchema.safeParse(invalidPack);
    expect(result.success).toBe(false);
  });
});

describe("Parameter Validation", () => {
  it("should validate parameters with validation rules", () => {
    const command = {
      id: "test-command",
      label: "Test Command",
      category: "Inventory",
      description: "A test command",
      commandText: "Test-Connection -ComputerName {{host}} -Port {{port}}",
      params: [
        {
          name: "host",
          type: "string",
          optional: false,
          default: "localhost",
        },
        {
          name: "port",
          type: "number",
          optional: false,
          default: 443,
          validation: {
            min: 1,
            max: 65535,
          },
        },
      ],
    };

    const result = CommandSchema.safeParse(command);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.params[0].type).toBe("string");
      expect(result.data.params[1].validation?.max).toBe(65535);
    }
  });
});

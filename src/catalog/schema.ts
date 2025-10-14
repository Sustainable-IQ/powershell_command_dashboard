import { z } from "zod";

/**
 * Command parameter schema
 */
export const ParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "select"]),
  optional: z.boolean().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(), // For select type
  validation: z
    .object({
      pattern: z.string().optional(), // Regex pattern for string validation
      min: z.number().optional(), // Min value for numbers
      max: z.number().optional(), // Max value for numbers
    })
    .optional(),
});

export type Parameter = z.infer<typeof ParameterSchema>;

/**
 * Verify-after-run check schema
 */
export const VerifyCheckSchema = z.object({
  description: z.string(),
  checkCommand: z.string(), // PowerShell command to verify state
  expectedResult: z.string().optional(), // Expected output/value
  failureHint: z.string().optional(), // Remediation guidance
});

export type VerifyCheck = z.infer<typeof VerifyCheckSchema>;

/**
 * Command manifest schema
 */
export const CommandSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase kebab-case"),
  label: z.string().min(1),
  category: z.enum(["Inventory", "Networking", "Startup", "Privacy", "Security"]),
  description: z.string(),
  commandText: z.string().optional(),
  scriptPath: z.string().optional(),
  requiresAdmin: z.boolean().default(false),
  riskLevel: z.enum(["info", "moderate", "destructive"]).default("info"),
  os: z.array(z.enum(["win10", "win11"])).default(["win10", "win11"]),
  shell: z
    .array(z.enum(["pwsh", "powershell"]))
    .default(["pwsh", "powershell"]),
  params: z.array(ParameterSchema).default([]),
  tags: z.array(z.string()).default([]),
  preview: z.string().optional(), // Additional preview notes
  deps: z.array(z.string()).default([]), // Required modules/cmdlets
  verifyAfterRun: VerifyCheckSchema.optional(),
  supportsWhatIf: z.boolean().default(false),
});

export type Command = z.infer<typeof CommandSchema>;

/**
 * Command pack schema
 */
export const PackSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Pack ID must be lowercase kebab-case"),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (X.Y.Z)"),
  author: z.string().optional(),
  commands: z.array(CommandSchema),
});

export type Pack = z.infer<typeof PackSchema>;

/**
 * Validation errors
 */
export interface ValidationError {
  path: string;
  message: string;
  packId?: string;
}

/**
 * Validate a command pack
 */
export function validatePack(data: unknown, packId?: string): ValidationError[] {
  const result = PackSchema.safeParse(data);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    packId,
  }));
}

/**
 * Validate individual command
 */
export function validateCommand(data: unknown): ValidationError[] {
  const result = CommandSchema.safeParse(data);
  if (result.success) {
    // Additional validation: must have either commandText or scriptPath, not both
    const cmd = result.data;
    if (cmd.commandText && cmd.scriptPath) {
      return [
        {
          path: "commandText/scriptPath",
          message: "Command must have either commandText or scriptPath, not both",
        },
      ];
    }
    if (!cmd.commandText && !cmd.scriptPath) {
      return [
        {
          path: "commandText/scriptPath",
          message: "Command must have either commandText or scriptPath",
        },
      ];
    }
    return [];
  }

  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

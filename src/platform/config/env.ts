import { z } from "zod";

export const integrationModes = [
  "LIVE",
  "SANDBOX",
  "SIMULATED",
  "OFFLINE_FIXTURE",
] as const;

export type IntegrationMode = (typeof integrationModes)[number];

export const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  MAHASETU_INTEGRATION_MODE: z
    .enum(integrationModes)
    .default("OFFLINE_FIXTURE"),
  AI_PROVIDER_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER_MODEL: z.string().min(1).optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment);
}

import type { IntegrationMode } from "@/platform/config/env";

export const DEMO_DATA_LABEL = "Synthetic demonstration data";
export const SIMULATION_LABEL = "SIMULATED_FOR_DEMO";

export const integrationMode: IntegrationMode = "OFFLINE_FIXTURE";

export const integrationModeCopy: Record<IntegrationMode, string> = {
  LIVE: "Authorized live integration",
  SANDBOX: "Provider sandbox",
  SIMULATED: SIMULATION_LABEL,
  OFFLINE_FIXTURE: `${SIMULATION_LABEL} · Offline fixture`,
};

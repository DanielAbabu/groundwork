import type { Scenario } from "@/lib/scenarios/types";
import { typeAScenarios } from "./typeA";
import { typeBScenarios } from "./typeB";
import { typeCScenarios } from "./typeC";
import { typeDScenarios } from "./typeD";

export const scenarios: Scenario[] = [
  ...typeAScenarios,
  ...typeBScenarios,
  ...typeCScenarios,
  ...typeDScenarios,
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

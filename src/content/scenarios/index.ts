import type { Scenario } from "@/lib/scenarios/types";
import { typeAScenarios } from "./typeA";
import { typeBScenarios } from "./typeB";
import { typeCScenarios } from "./typeC";
import { typeDScenarios } from "./typeD";
import { typeEScenarios } from "./typeE";
import { typeFScenarios } from "./typeF";
import { typeGScenarios } from "./typeG";
import { typeHScenarios } from "./typeH";

export const scenarios: Scenario[] = [
  ...typeAScenarios,
  ...typeBScenarios,
  ...typeCScenarios,
  ...typeDScenarios,
  ...typeEScenarios,
  ...typeFScenarios,
  ...typeGScenarios,
  ...typeHScenarios,
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

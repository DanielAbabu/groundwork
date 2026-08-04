import type { DesignScenario } from "@/lib/design/types";
import { urlShortener } from "./url-shortener";

export const designScenarios: DesignScenario[] = [urlShortener];

export function getDesignScenario(id: string): DesignScenario | undefined {
  return designScenarios.find((scenario) => scenario.id === id);
}

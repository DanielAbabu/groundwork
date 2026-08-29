import type { DesignScenario } from "@/lib/design/types";
import { urlShortener } from "./url-shortener";
import { notificationService } from "./notification-service";
import { newsFeed } from "./news-feed";
import { fileStorage } from "./file-storage";
import { rateLimiter } from "./rate-limiter";

export const designScenarios: DesignScenario[] = [
  urlShortener,
  notificationService,
  newsFeed,
  fileStorage,
  rateLimiter,
];

export function getDesignScenario(id: string): DesignScenario | undefined {
  return designScenarios.find((scenario) => scenario.id === id);
}

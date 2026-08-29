import type { DesignScenario } from "@/lib/design/types";

export const newsFeed: DesignScenario = {
  id: "news-feed",
  title: "Social news feed at 10M daily active users",
  system: "Activity news feed platform",
  stakeholder: "Jasmine",
  stakeholderRole: "VP Product",
  tier: "tier-2",
  difficulty: "routine",
  summary:
    "Product wants to serve a personalized timeline feed for 10M DAU with sub-200ms latency, balancing fan-out writes against celebrity account reads.",
  framing:
    "You are in a 30-minute system design review with Jasmine, VP of Product. The platform has 10M daily active users posting photos and status updates. You must decide between fan-out on write (push) vs fan-out on read (pull) for feed rendering.",
  stages: [
    {
      id: "clarify",
      kind: "clarify",
      title: "Clarify the ask",
      prompt:
        "Jasmine has 5 minutes. Clarify the fan-out requirements and feed rendering latency SLA.",
      questions: [
        {
          id: "fanout-model",
          text: "Jasmine: “When a regular user with 100 followers posts an update, how should their followers see it?”",
          options: [
            {
              id: "fanout-write",
              label: "Fan-out on write (Push model) — inject post into all 100 follower feed caches immediately",
              followUp: "Jasmine: “Great! Reading the feed is now O(1) cache lookup because pre-computed lists exist in Redis.”",
            },
            {
              id: "fanout-read",
              label: "Fan-out on read (Pull model) — fetch posts from all 100 followed users dynamically",
              followUp: "Jasmine: “Pull model works for few follows, but doing SQL JOINs on 500 followees per feed view is expensive.”",
            },
          ],
          accept: ["fanout-write"],
          rationale:
            "For standard users (under 10k followers), fan-out on write pre-computes timeline caches so reads are blazingly fast O(1) Redis lookups.",
        },
        {
          id: "celebrity-problem",
          text: "Jasmine: “What happens when a celebrity with 10 million followers posts an update?”",
          options: [
            {
              id: "hybrid-fanout",
              label: "Hybrid model — push for standard accounts, pull on-read for celebrity accounts",
              followUp: "Jasmine: “Spot on! Writing 10 million Redis cache entries for one tweet would melt the write queue.”",
            },
            {
              id: "push-celebrity",
              label: "Push to all 10 million follower caches regardless",
              followUp: "Jasmine: “10 million cache updates per post will create a massive queue backlog and delay feed updates.”",
            },
          ],
          accept: ["hybrid-fanout"],
          rationale:
            "The celebrity problem is solved via a hybrid fan-out model: push for normal accounts, merge pull-on-read for celebrity accounts.",
        },
      ],
    },
    {
      id: "capacity",
      kind: "capacity",
      title: "Size it",
      prompt:
        "Assume 10M DAU, average 10 feed refreshes/user/day, 500 bytes per feed post reference, and 800 feed items stored per timeline cache. Round freely.",
      fields: [
        {
          id: "read-qps",
          label: "Average feed read QPS",
          unit: "req/s",
          hint: "(10M * 10) / 86,400",
          formula: "100,000,000 / 86,400",
          accept: { min: 1000, max: 1300 },
          magnitude: { min: 300, max: 5000 },
          rationale: "100,000,000 feed refreshes / 86,400 ≈ 1,157 req/s average.",
        },
        {
          id: "cache-size",
          label: "Total Redis cache for 10M user timelines",
          unit: "GB",
          hint: "(10M users * 800 items * 500 bytes) / 1B",
          formula: "(10,000,000 * 800 * 500) / 1,000,000,000",
          accept: { min: 3500, max: 4500 },
          magnitude: { min: 500, max: 10000 },
          rationale: "10M users x 800 items x 500 bytes ≈ 4,000 GB (4 TB) distributed Redis cluster memory.",
        },
      ],
    },
    {
      id: "components",
      kind: "components",
      title: "Sketch the news feed architecture",
      prompt:
        "Design the hybrid feed pipeline with load balancer, app servers, Redis feed cache, message queue for async fan-out workers, and primary DB.",
      spec: {
        palette: [
          "CLIENT",
          "LOAD_BALANCER",
          "APP_SERVER",
          "CACHE",
          "QUEUE",
          "WORKER",
          "DATABASE_PRIMARY",
        ],
        requiredNodeTypes: [
          "CLIENT",
          "LOAD_BALANCER",
          "APP_SERVER",
          "CACHE",
          "QUEUE",
          "WORKER",
          "DATABASE_PRIMARY",
        ],
        forbiddenNodeTypes: [],
        requiredEdges: [
          { from: "CLIENT", to: "LOAD_BALANCER" },
          { from: "LOAD_BALANCER", to: "APP_SERVER" },
          { from: "APP_SERVER", to: "CACHE", type: "CACHE_LOOKUP" },
          { from: "APP_SERVER", to: "QUEUE", type: "ASYNC_MESSAGE" },
          { from: "QUEUE", to: "WORKER", type: "ASYNC_MESSAGE" },
          { from: "WORKER", to: "CACHE", type: "CACHE_LOOKUP" },
        ],
        forbiddenEdges: [{ from: "CLIENT", to: "DATABASE_PRIMARY" }],
        minInstances: { APP_SERVER: 3, CACHE: 2 },
        notes: {
          CLIENT: "Users opening mobile feed and posting updates.",
          LOAD_BALANCER: "Fans out incoming feed requests across stateless app tier.",
          APP_SERVER: "Reads timeline from Redis cache; enqueues post events for fan-out.",
          CACHE: "In-memory Redis cluster holding timeline item IDs.",
          QUEUE: "Async message queue decoupling post creation from follower timeline updates.",
          WORKER: "Fan-out workers injecting post IDs into follower timeline caches.",
          DATABASE_PRIMARY: "Durable store for user profiles, follow graphs, and post content.",
        },
      },
    },
    {
      id: "tradeoff",
      kind: "tradeoff",
      title: "Defend feed pagination and cache eviction",
      prompt:
        "How do you handle feed pagination when new posts are constantly inserted at the top? Defend cursor-based pagination over offset-based SQL pagination.",
      concepts: [
        {
          id: "cursor-pagination",
          label: "Uses cursor-based pagination (timestamp/ID) instead of OFFSET",
          axis: "mitigation",
          keywords: ["cursor", "timestamp", "seek", "pagination key", "offset duplicates"],
          patterns: ["cursor", "timestamp", "offset problem"],
        },
        {
          id: "cache-invalidation",
          label: "Defines timeline cache capping and LRU eviction",
          axis: "mitigation",
          keywords: ["lru", "cap size", "trim list", "zset", "sorted set"],
          patterns: ["sorted set", "zset", "lru", "trim"],
        },
        {
          id: "duplicate-posts",
          label: "Identifies duplicate/skipped item issues with OFFSET pagination",
          axis: "problem",
          keywords: ["duplicate post", "skipped item", "drift", "offset flaw"],
          patterns: ["duplicate", "skipped", "offset flaw"],
        },
      ],
      minConcepts: 2,
      ideal:
        "OFFSET pagination in high-write feeds causes duplicated or missing posts as new items push rows down. Using cursor-based pagination (e.g. `last_seen_post_id` or `created_at` timestamp) provides deterministic page boundaries. Redis Sorted Sets (`ZSET`) store timeline lists ordered by score (timestamp) capped at 800 items per user.",
    },
  ],
};

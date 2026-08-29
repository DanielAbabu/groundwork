import type { DesignScenario } from "@/lib/design/types";

export const rateLimiter: DesignScenario = {
  id: "rate-limiter",
  title: "API rate limiting service for public platform",
  system: "High-throughput API rate limiter",
  stakeholder: "Elena",
  stakeholderRole: "Platform Engineering Lead",
  tier: "tier-3",
  difficulty: "tricky",
  summary:
    "Platform engineering needs an ultra-low latency rate limiting middleware (sub-5ms SLA) capable of enforcing 100k req/s API quotas across distributed regions.",
  framing:
    "You are in a 30-minute design review with Elena, Lead Platform Engineer. The public API handles 100,000 requests/second from third-party developers. You must design a rate limiting service that blocks abusive traffic without adding latency overhead to legitimate requests.",
  stages: [
    {
      id: "clarify",
      kind: "clarify",
      title: "Clarify algorithm & state location",
      prompt:
        "Elena has 5 minutes. Clarify the rate limiting algorithm choice and cache layer placement.",
      questions: [
        {
          id: "algorithm",
          text: "Elena: “Which rate limiting algorithm balances memory usage, burst handling, and sliding window accuracy?”",
          options: [
            {
              id: "token-bucket",
              label: "Token Bucket / Sliding Window Counter — allows bursts up to bucket capacity, low memory",
              followUp: "Elena: “Spot on! Token Bucket handles legitimate traffic bursts (e.g. 50 requests in 1 second) while enforcing average rate limits.”",
            },
            {
              id: "fixed-window",
              label: "Fixed Window Counter — reset counter at every clock minute boundary",
              followUp: "Elena: “Fixed window allows 2x burst traffic at window edges (e.g. 100 reqs at 11:59:59 and 100 at 12:00:01).”",
            },
          ],
          accept: ["token-bucket"],
          rationale:
            "Token Bucket or Sliding Window Counter prevents boundary burst vulnerabilities inherent in fixed window counters.",
        },
        {
          id: "state-storage",
          text: "Elena: “Where should rate limit counters be stored across our cluster?”",
          options: [
            {
              id: "redis-distributed",
              label: "In-memory distributed Redis cluster using atomic INCR / Lua scripts",
              followUp: "Elena: “Exactly! Redis Lua scripts execute atomically in sub-2ms, preventing race conditions between app nodes.”",
            },
            {
              id: "relational-db",
              label: "Primary Relational Database table (PostgreSQL)",
              followUp: "Elena: “Hitting PostgreSQL write locks on every incoming API call at 100k req/s will instantly bring down the DB.”",
            },
          ],
          accept: ["redis-distributed"],
          rationale:
            "Rate limiting counters require sub-millisecond atomic memory ops (Redis INCR / Lua) and cannot touch disk databases.",
        },
      ],
    },
    {
      id: "capacity",
      kind: "capacity",
      title: "Size it",
      prompt:
        "Assume 100,000 peak API req/s, 1 million active API keys, 64 bytes memory per rate limit key in Redis. Round freely.",
      fields: [
        {
          id: "counter-memory",
          label: "Redis RAM required for 1M API key counters",
          unit: "MB",
          hint: "(1,000,000 keys * 64 bytes) / 1,000,000",
          formula: "(1,000,000 * 64) / 1,000,000",
          accept: { min: 50, max: 80 },
          magnitude: { min: 10, max: 500 },
          rationale: "1M keys x 64 bytes = 64 MB of RAM — tiny enough to fit easily in a single Redis node.",
        },
        {
          id: "peak-qps",
          label: "Counter check throughput at peak",
          unit: "req/s",
          hint: "100,000 req/s direct check throughput",
          formula: "100,000",
          accept: { min: 90000, max: 110000 },
          magnitude: { min: 10000, max: 500000 },
          rationale: "100,000 counter inspections per second across the API gateway tier.",
        },
      ],
    },
    {
      id: "components",
      kind: "components",
      title: "Sketch the rate limiter placement",
      prompt:
        "Place the rate limiter at the API gateway edge. Client -> Load Balancer -> App Server / Rate Limiter -> Redis Cache -> Primary DB.",
      spec: {
        palette: [
          "CLIENT",
          "CDN",
          "LOAD_BALANCER",
          "APP_SERVER",
          "CACHE",
          "DATABASE_PRIMARY",
        ],
        requiredNodeTypes: [
          "CLIENT",
          "LOAD_BALANCER",
          "APP_SERVER",
          "CACHE",
          "DATABASE_PRIMARY",
        ],
        forbiddenNodeTypes: [],
        requiredEdges: [
          { from: "CLIENT", to: "LOAD_BALANCER" },
          { from: "LOAD_BALANCER", to: "APP_SERVER" },
          { from: "APP_SERVER", to: "CACHE", type: "CACHE_LOOKUP" },
          { from: "APP_SERVER", to: "DATABASE_PRIMARY" },
        ],
        forbiddenEdges: [{ from: "CLIENT", to: "DATABASE_PRIMARY" }],
        minInstances: { APP_SERVER: 3, CACHE: 2 },
        notes: {
          CLIENT: "Third-party developers calling public API endpoints.",
          LOAD_BALANCER: "Distributes 100k req/s across stateless API Gateway instances.",
          APP_SERVER: "API Gateway executing rate limit middleware before routing request.",
          CACHE: "Redis cluster storing atomic token bucket counters.",
          DATABASE_PRIMARY: "Backend business logic database.",
        },
      },
    },
    {
      id: "tradeoff",
      kind: "tradeoff",
      title: "Defend fail-open vs fail-closed strategy",
      prompt:
        "What happens when the Redis rate limiter cluster experiences a network partition or outage? Defend your fail-open vs fail-closed decision.",
      concepts: [
        {
          id: "fail-open",
          label: "Chooses fail-open strategy to prioritize API availability over rate enforcement",
          axis: "mitigation",
          keywords: ["fail open", "fail-open", "allow traffic", "prioritize availability"],
          patterns: ["fail open", "fail-open", "availability"],
        },
        {
          id: "local-fallback",
          label: "Uses local in-memory fallback rate limiting during Redis downtime",
          axis: "mitigation",
          keywords: ["local cache", "in-memory fallback", "local rate limit"],
          patterns: ["local fallback", "in-memory fallback"],
        },
        {
          id: "overload-risk",
          label: "Identifies risk of downstream DB overload during fail-open window",
          axis: "risk",
          keywords: ["overload risk", "database pressure", "unbounded traffic", "blast radius"],
          patterns: ["overload", "db pressure", "blast radius"],
        },
      ],
      minConcepts: 2,
      ideal:
        "In public API infrastructure, rate limiting should fail open: if Redis is unreachable, log a SEV-2 alert and let traffic pass through rather than returning 500 errors to 100% of customers. To mitigate backend overload during outages, API Gateway nodes fall back to local in-memory rate limiting per node.",
    },
  ],
};

import type { DesignScenario } from "@/lib/design/types";

export const urlShortener: DesignScenario = {
  id: "url-shortener",
  title: "URL shortener for a marketing team",
  system: "URL shortener",
  stakeholder: "Priya",
  stakeholderRole: "Head of Growth",
  tier: "tier-2",
  difficulty: "starter",
  summary:
    "Growth wants short links for every campaign. Scope it, size it, sketch it, and defend one caching decision.",
  framing:
    "You are in a 30-minute design review. Priya from Growth wants a shortener for campaign links: her team creates links, the whole internet clicks them. Nothing is built yet — you are being asked what to build and how big it needs to be.",
  stages: [
    {
      id: "clarify",
      kind: "clarify",
      title: "Clarify the ask",
      prompt:
        "Priya has 5 minutes before her next meeting. Pin down the requirements that change the design.",
      questions: [
        {
          id: "read-write",
          text: "Priya: “We'll make maybe a few thousand links a day, but the links go out to our whole list. Does that matter?”",
          options: [
            { id: "write-heavy", label: "It's write-heavy — optimise link creation" },
            { id: "read-heavy", label: "It's read-heavy — optimise redirects" },
            { id: "balanced", label: "Roughly balanced — treat both the same" },
          ],
          accept: ["read-heavy"],
          rationale:
            "Thousands of creates against millions of clicks makes this overwhelmingly read-heavy, which is what justifies a cache and read replicas later.",
        },
        {
          id: "custom-slug",
          text: "Priya: “Can my team pick the short code themselves, like /summer-sale?”",
          options: [
            { id: "yes-custom", label: "Yes — support custom slugs with a uniqueness check" },
            { id: "no-custom", label: "No — random codes only, simpler to shard" },
            { id: "later", label: "Defer it, out of scope for v1" },
          ],
          accept: ["yes-custom"],
          rationale:
            "Custom slugs are the whole point for campaign links, and they change the write path: you need a uniqueness check instead of pure key generation.",
        },
        {
          id: "expiry",
          text: "Priya: “Campaign links are dead after the campaign. Should they expire?”",
          options: [
            { id: "ttl", label: "Yes — optional expiry per link, expired links 410" },
            { id: "never", label: "No — links live forever, never delete" },
            { id: "hard-delete", label: "Hard-delete rows on expiry to save space" },
          ],
          accept: ["ttl"],
          rationale:
            "Optional per-link expiry is a stated requirement. Hard-deleting loses click history and makes code reuse ambiguous.",
        },
        {
          id: "latency",
          text: "Priya: “How fast does a click need to feel?”",
          options: [
            { id: "p99-100", label: "Redirect p99 under ~100ms — it's on the critical path" },
            { id: "p99-2s", label: "Under 2s is fine, it's just a redirect" },
            { id: "no-target", label: "No target — measure after launch" },
          ],
          accept: ["p99-100"],
          rationale:
            "A redirect is pure overhead in front of the real page, so the latency budget is tight — this is what rules out hitting the primary DB per click.",
        },
      ],
    },
    {
      id: "capacity",
      kind: "capacity",
      title: "Size it",
      prompt:
        "Assume 5,000 new links/day, 50M redirects/day, 500 bytes stored per link, and a 5-year retention target. Round freely — ranges are accepted.",
      fields: [
        {
          id: "redirect-qps",
          label: "Average redirect QPS",
          unit: "req/s",
          hint: "50M / 86,400",
          accept: { min: 500, max: 700 },
          magnitude: { min: 100, max: 5000 },
          rationale: "50,000,000 / 86,400 ≈ 580 req/s average.",
        },
        {
          id: "peak-qps",
          label: "Peak redirect QPS (assume 5x average)",
          unit: "req/s",
          hint: "average x 5",
          accept: { min: 2500, max: 3500 },
          magnitude: { min: 500, max: 20000 },
          rationale: "≈580 x 5 ≈ 2,900 req/s peak — the number you size the read path for.",
        },
        {
          id: "storage-5y",
          label: "Link storage after 5 years",
          unit: "GB",
          hint: "5,000/day x 365 x 5 x 500 bytes",
          accept: { min: 4, max: 6 },
          magnitude: { min: 0.5, max: 50 },
          rationale:
            "5,000 x 365 x 5 ≈ 9.1M links x 500 bytes ≈ 4.6 GB — small enough that one primary DB holds all links comfortably.",
        },
        {
          id: "hot-cache",
          label: "Cache size to hold one day of hot links (assume 100k hot links x 500 bytes)",
          unit: "MB",
          hint: "100,000 x 500 bytes",
          accept: { min: 40, max: 60 },
          magnitude: { min: 5, max: 500 },
          rationale:
            "≈50 MB. The working set is tiny, which is why a single cache tier absorbs almost all redirect traffic.",
        },
      ],
    },
    {
      id: "components",
      kind: "components",
      title: "Sketch the read path",
      prompt:
        "Place the components you need and connect them in the direction requests flow. Grade is structural: required components, required connections, and the anti-patterns we watch for.",
      spec: {
        palette: [
          "client",
          "cdn",
          "load-balancer",
          "app-server",
          "cache",
          "db-primary",
          "db-replica",
          "queue",
          "object-store",
          "worker",
        ],
        required: ["client", "load-balancer", "app-server", "cache", "db-primary"],
        forbidden: ["object-store"],
        requiredEdges: [
          ["client", "load-balancer"],
          ["load-balancer", "app-server"],
          ["app-server", "cache"],
          ["cache", "db-primary"],
        ],
        forbiddenEdges: [
          ["client", "db-primary"],
          ["client", "app-server"],
        ],
        notes: {
          client: "Browsers hitting the short link are the entry point.",
          "load-balancer": "Peak ~2,900 req/s needs more than one app server behind a balancer.",
          "app-server": "Stateless redirect handlers — the layer you scale horizontally.",
          cache: "The ~50MB hot set belongs in a cache so redirects never touch the primary.",
          "db-primary": "System of record for code → URL, plus writes from link creation.",
          "client->load-balancer": "Public traffic terminates at the balancer, not an app box.",
          "load-balancer->app-server": "Balancer fans out across the stateless redirect tier.",
          "app-server->cache": "Read path checks the cache first.",
          "cache->db-primary": "Cache misses fall through to the system of record.",
          "!object-store": "Nothing here stores blobs — 4.6GB of short rows is a database, not object storage.",
          "!client->db-primary": "Never expose the database directly to the internet.",
          "!client->app-server":
            "Bypassing the balancer gives you a single point of failure at peak.",
        },
      },
    },
    {
      id: "tradeoff",
      kind: "tradeoff",
      title: "Defend the cache",
      prompt:
        "Priya's engineer asks: “If we cache redirects, what happens when someone edits a link's destination?” Explain the trade-off you're accepting and how you'd handle it. This stage gets advisory feedback, not a hard pass/fail on prose.",
      concepts: [
        {
          id: "staleness",
          label: "Names the staleness window",
          keywords: ["stale", "staleness", "out of date", "outdated"],
        },
        {
          id: "invalidation",
          label: "Has an invalidation or TTL strategy",
          keywords: ["invalidat", "evict", "ttl", "expire", "purge"],
        },
        {
          id: "write-through",
          label: "Says where the write path touches the cache",
          keywords: ["write-through", "write through", "on update", "on write", "delete the key", "update the cache"],
        },
        {
          id: "blast-radius",
          label: "Weighs the cost of being wrong",
          keywords: ["wrong destination", "blast radius", "risk", "acceptable", "trade-off", "tradeoff"],
        },
      ],
      minConcepts: 2,
      ideal:
        "Caching redirects means an edited link can serve the old destination for as long as the entry lives. Accept a bounded window: short TTL (say 60s) plus explicit invalidation on update — the write path deletes or overwrites the cache key after committing to the primary. The blast radius is one campaign link pointing at a stale URL for under a minute, which is cheaper than paying a primary DB read on all ~2,900 peak redirects per second.",
    },
  ],
};

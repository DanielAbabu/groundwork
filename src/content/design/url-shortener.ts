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
            {
              id: "write-heavy",
              label: "It's write-heavy — optimise link creation",
              followUp: "Priya: “Wait, we create maybe 5,000 links a day... but our list is 2 million subscribers. Surely that's mostly click reads?”",
            },
            {
              id: "read-heavy",
              label: "It's read-heavy — optimise redirects",
              followUp: "Priya: “Exactly! A single email campaign can send 500k clicks in an hour, while my team creates maybe 50 links a week.”",
            },
            {
              id: "balanced",
              label: "Roughly balanced — treat both the same",
              followUp: "Priya: “Hmm, creating a link happens once, but millions of users click it repeatedly. I don't think they're equal.”",
            },
          ],
          accept: ["read-heavy"],
          rationale:
            "Thousands of creates against millions of clicks makes this overwhelmingly read-heavy, which is what justifies a cache and read replicas later.",
        },
        {
          id: "custom-slug",
          text: "Priya: “Can my team pick the short code themselves, like /summer-sale?”",
          options: [
            {
              id: "yes-custom",
              label: "Yes — support custom slugs with a uniqueness check",
              followUp: "Priya: “Awesome! Marketing conversion rates jump 35% when the link text describes the campaign.”",
            },
            {
              id: "no-custom",
              label: "No — random codes only, simpler to shard",
              followUp: "Priya: “Ah, that's a dealbreaker for Growth. Nobody wants to share /x7q9k2 on Twitter during Black Friday.”",
            },
            {
              id: "later",
              label: "Defer it, out of scope for v1",
              followUp: "Priya: “If v1 doesn't support custom slugs, my team won't adopt it over Bitly.”",
            },
          ],
          accept: ["yes-custom"],
          rationale:
            "Custom slugs are the whole point for campaign links, and they change the write path: you need a uniqueness check instead of pure key generation.",
        },
        {
          id: "expiry",
          text: "Priya: “Campaign links are dead after the campaign. Should they expire?”",
          options: [
            {
              id: "ttl",
              label: "Yes — optional expiry per link, expired links 410",
              followUp: "Priya: “Perfect. Once a seasonal sale ends, we want old links to return an explicit gone page rather than redirecting to dead inventory.”",
            },
            {
              id: "never",
              label: "No — links live forever, never delete",
              followUp: "Priya: “Keeping expired campaign links active means customers might try to claim expired promo offers months later.”",
            },
            {
              id: "hard-delete",
              label: "Hard-delete rows on expiry to save space",
              followUp: "Priya: “If we hard-delete the database rows, won't we lose all click metrics and postmortem analytics?”",
            },
          ],
          accept: ["ttl"],
          rationale:
            "Optional per-link expiry is a stated requirement. Hard-deleting loses click history and makes code reuse ambiguous.",
        },
        {
          id: "latency",
          text: "Priya: “How fast does a click need to feel?”",
          options: [
            {
              id: "p99-100",
              label: "Redirect p99 under ~100ms — it's on the critical path",
              followUp: "Priya: “Great. Every 100ms of redirect delay drops our campaign landing conversion by 1%.”",
            },
            {
              id: "p99-2s",
              label: "Under 2s is fine, it's just a redirect",
              followUp: "Priya: “2 seconds?! Users will think the link is broken and hit back before the store even loads.”",
            },
            {
              id: "no-target",
              label: "No target — measure after launch",
              followUp: "Priya: “We need an SLA up front so engineering can size the caching layer properly.”",
            },
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
          formula: "50,000,000 / 86,400",
          accept: { min: 500, max: 700 },
          magnitude: { min: 100, max: 5000 },
          rationale: "50,000,000 / 86,400 ≈ 580 req/s average.",
        },
        {
          id: "peak-qps",
          label: "Peak redirect QPS (assume 5x average)",
          unit: "req/s",
          hint: "average x 5",
          formula: "580 * 5",
          accept: { min: 2500, max: 3500 },
          magnitude: { min: 500, max: 20000 },
          rationale: "≈580 x 5 ≈ 2,900 req/s peak — the number you size the read path for.",
        },
        {
          id: "storage-5y",
          label: "Link storage after 5 years",
          unit: "GB",
          hint: "5,000/day x 365 x 5 x 500 bytes",
          formula: "(5,000 * 365 * 5 * 500) / 1,000,000,000",
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
          formula: "(100,000 * 500) / 1,000,000",
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
        "Drag components onto the canvas and connect them in the direction requests flow. Grade is structural: legal connections, required components, instance counts, and the anti-patterns we watch for.",
      spec: {
        palette: [
          "CLIENT",
          "CDN",
          "LOAD_BALANCER",
          "APP_SERVER",
          "CACHE",
          "DATABASE_PRIMARY",
          "DATABASE_REPLICA",
          "QUEUE",
          "WORKER",
          "OBJECT_STORE",
        ],
        requiredNodeTypes: ["CLIENT", "LOAD_BALANCER", "APP_SERVER", "CACHE", "DATABASE_PRIMARY"],
        forbiddenNodeTypes: ["OBJECT_STORE"],
        requiredEdges: [
          { from: "CLIENT", to: "LOAD_BALANCER" },
          { from: "LOAD_BALANCER", to: "APP_SERVER" },
          { from: "APP_SERVER", to: "CACHE", type: "CACHE_LOOKUP" },
          { from: "CACHE", to: "DATABASE_PRIMARY" },
        ],
        forbiddenEdges: [{ from: "CLIENT", to: "DATABASE_PRIMARY" }],
        minInstances: { APP_SERVER: 2 },
        notes: {
          CLIENT: "Browsers hitting the short link are the entry point.",
          LOAD_BALANCER: "Peak ~2,900 req/s needs more than one app server behind a balancer.",
          APP_SERVER: "Stateless redirect handlers — the layer you scale horizontally.",
          CACHE: "The ~50MB hot set belongs in a cache so redirects never touch the primary.",
          DATABASE_PRIMARY: "System of record for code → URL, plus writes from link creation.",
          "#APP_SERVER":
            "One redirect box cannot absorb ~2,900 req/s peak — size for at least two.",
          "CLIENT->LOAD_BALANCER": "Public traffic terminates at the balancer, not an app box.",
          "LOAD_BALANCER->APP_SERVER": "Balancer fans out across the stateless redirect tier.",
          "APP_SERVER->CACHE":
            "The read path checks the cache first — mark it as a cache read/write.",
          "CACHE->DATABASE_PRIMARY": "Cache misses fall through to the system of record.",
          "!OBJECT_STORE":
            "Nothing here stores blobs — 4.6GB of short rows is a database, not object storage.",
          "!CLIENT->DATABASE_PRIMARY": "Never expose the database directly to the internet.",
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
          axis: "problem",
          keywords: ["stale", "staleness", "out of date", "outdated"],
          patterns: ["stale.*data", "out of date", "cached.*destination"],
        },
        {
          id: "invalidation",
          label: "Has an invalidation or TTL strategy",
          axis: "mitigation",
          keywords: ["invalidat", "evict", "ttl", "expire", "purge"],
          patterns: ["short ttl", "explicit invalidation", "delete.*key", "purge.*cache"],
        },
        {
          id: "write-through",
          label: "Says where the write path touches the cache",
          axis: "mitigation",
          keywords: [
            "write-through",
            "write through",
            "on update",
            "on write",
            "delete the key",
            "update the cache",
          ],
          patterns: ["write through", "on update", "evict on write"],
        },
        {
          id: "blast-radius",
          label: "Weighs the cost of being wrong",
          axis: "risk",
          keywords: [
            "wrong destination",
            "blast radius",
            "risk",
            "acceptable",
            "trade-off",
            "tradeoff",
          ],
          patterns: ["blast radius", "acceptable trade", "risk is bounded"],
        },
      ],
      minConcepts: 2,
      ideal:
        "Caching redirects means an edited link can serve the old destination for as long as the entry lives. Accept a bounded window: short TTL (say 60s) plus explicit invalidation on update — the write path deletes or overwrites the cache key after committing to the primary. The blast radius is one campaign link pointing at a stale URL for under a minute, which is cheaper than paying a primary DB read on all ~2,900 peak redirects per second.",
    },
  ],
  debrief: {
    narrative:
      "A high-scale URL shortener is fundamentally a 100:1 read-heavy system. The core design challenge is absorbing 2,900 peak QPS without saturating the primary relational database. By introducing an in-memory Redis cluster for hot keys and a CDN edge cache for global redirection, we reduce database query volume by over 95%.",
    seniorInsights: [
      "Base62 encoding of an auto-incrementing 64-bit ID yields clean 7-character short codes with 3.5 trillion unique combinations.",
      "HTTP 302 Found (temporary redirect) should be preferred over HTTP 301 Moved Permanently if analytics tracking per click is required.",
      "Database replica lag can cause a race condition where a newly created short link returns 404 if routed to a replica before replication completes.",
    ],
    commonMistakes: [
      "Using HTTP 301 permanently caching redirects in client browsers, preventing analytics aggregation and short link updates.",
      "Placing key generation on the synchronous hot read path rather than pre-generating random key blocks in memory.",
    ],
  },
};

import type { DesignScenario } from "@/lib/design/types";

export const notificationService: DesignScenario = {
  id: "notification-service",
  title: "Real-time push notification system",
  system: "Push notification platform",
  stakeholder: "Marcus",
  stakeholderRole: "Head of Engagement",
  tier: "tier-2",
  difficulty: "starter",
  summary:
    "Engagement wants to send 10M targeted push notifications per day across iOS & Android with low latency and zero message loss.",
  framing:
    "You are in a 30-minute design review. Marcus from Engagement wants to build a unified notification platform for mobile pushes, transactional emails, and SMS alerts. Nothing is built yet — you are deciding the queueing architecture and delivery guarantees.",
  stages: [
    {
      id: "clarify",
      kind: "clarify",
      title: "Clarify the ask",
      prompt:
        "Marcus has 5 minutes before his next product sync. Pin down the core delivery & throughput constraints.",
      questions: [
        {
          id: "delivery-guarantee",
          text: "Marcus: “If a push fails because of a temporary network drop on Apple APNs or Google FCM, what happens?”",
          options: [
            {
              id: "at-least-once",
              label: "At-least-once delivery — retry with exponential backoff via message queue",
              followUp:
                "Marcus: “Exactly! A duplicate notification is annoying, but dropping a critical order update is disastrous.”",
            },
            {
              id: "exactly-once",
              label: "Strict exactly-once delivery — drop retries to avoid duplicate pushes",
              followUp:
                "Marcus: “Strict exactly-once across external third-party gateways like APNs is distributedly impossible.”",
            },
            {
              id: "at-most-once",
              label: "At-most-once delivery — fire and forget, never retry",
              followUp:
                "Marcus: “Fire-and-forget will drop 5% of pushes when third-party gateways throttle us.”",
            },
          ],
          accept: ["at-least-once"],
          rationale:
            "At-least-once delivery with idempotency keys on the client is the standard for push infrastructure. Gateways like APNs/FCM do not support distributed 2PC.",
        },
        {
          id: "fanout",
          text: "Marcus: “When a breaking news alert goes out to 5M users simultaneously, how should we handle the spike?”",
          options: [
            {
              id: "queue-fanout",
              label:
                "Async fan-out via message queue workers — decouple request from APNs dispatch",
              followUp:
                "Marcus: “Great! The API acknowledges the trigger in 10ms, while workers drain the queue at peak rate.”",
            },
            {
              id: "sync-loop",
              label: "Synchronous for-loop inside the API handler — send pushes directly",
              followUp:
                "Marcus: “A synchronous loop will time out HTTP requests and crash the app server under peak load.”",
            },
          ],
          accept: ["queue-fanout"],
          rationale:
            "High-volume notifications must be offloaded to an asynchronous message queue tier so API servers remain responsive.",
        },
        {
          id: "priority",
          text: "Marcus: “Does a marketing campaign push have the same priority as a 2FA login code?”",
          options: [
            {
              id: "priority-queues",
              label: "Separate high-priority and bulk queues to prevent head-of-line blocking",
              followUp:
                "Marcus: “Spot on! 2FA login codes skip past 10M scheduled marketing pushes instantly.”",
            },
            {
              id: "single-fifo",
              label: "Single shared FIFO queue for all notification types",
              followUp:
                "Marcus: “Single FIFO means a security OTP code gets stuck behind 2 million promotional newsletter pushes.”",
            },
          ],
          accept: ["priority-queues"],
          rationale:
            "Priority queues isolate critical transactional notifications (OTPs, order updates) from low-priority marketing blasts.",
        },
      ],
    },
    {
      id: "capacity",
      kind: "capacity",
      title: "Size it",
      prompt:
        "Assume 10M active mobile devices, 20M notifications/day, 1KB payload per notification, and a peak fan-out spike of 5x average. Round freely.",
      fields: [
        {
          id: "avg-qps",
          label: "Average dispatch QPS",
          unit: "req/s",
          hint: "20M / 86,400",
          formula: "20,000,000 / 86,400",
          accept: { min: 200, max: 300 },
          magnitude: { min: 50, max: 1000 },
          rationale: "20,000,000 / 86,400 ≈ 231 notifications dispatched per second average.",
        },
        {
          id: "peak-qps",
          label: "Peak dispatch QPS (5x average)",
          unit: "req/s",
          hint: "231 * 5",
          formula: "231 * 5",
          accept: { min: 1000, max: 1500 },
          magnitude: { min: 200, max: 5000 },
          rationale: "≈231 x 5 ≈ 1,155 req/s peak delivery throughput.",
        },
        {
          id: "daily-bandwidth",
          label: "Daily network payload bandwidth",
          unit: "GB",
          hint: "(20M * 1KB) / 1,000,000",
          formula: "(20,000,000 * 1,000) / 1,000,000,000",
          accept: { min: 15, max: 25 },
          magnitude: { min: 5, max: 100 },
          rationale: "20,000,000 x 1 KB = 20 GB of push payloads sent daily.",
        },
      ],
    },
    {
      id: "components",
      kind: "components",
      title: "Sketch the dispatch pipeline",
      prompt:
        "Design the asynchronous push notification pipeline. Ensure API handlers enqueue jobs, workers consume queues, and user tokens are stored in the database.",
      spec: {
        palette: [
          "CLIENT",
          "LOAD_BALANCER",
          "APP_SERVER",
          "QUEUE",
          "WORKER",
          "CACHE",
          "DATABASE_PRIMARY",
        ],
        requiredNodeTypes: [
          "CLIENT",
          "LOAD_BALANCER",
          "APP_SERVER",
          "QUEUE",
          "WORKER",
          "DATABASE_PRIMARY",
        ],
        forbiddenNodeTypes: [],
        requiredEdges: [
          { from: "CLIENT", to: "LOAD_BALANCER" },
          { from: "LOAD_BALANCER", to: "APP_SERVER" },
          { from: "APP_SERVER", to: "QUEUE", type: "ASYNC_MESSAGE" },
          { from: "QUEUE", to: "WORKER", type: "ASYNC_MESSAGE" },
          { from: "WORKER", to: "DATABASE_PRIMARY" },
        ],
        forbiddenEdges: [{ from: "CLIENT", to: "DATABASE_PRIMARY" }],
        minInstances: { APP_SERVER: 2, WORKER: 2 },
        notes: {
          CLIENT: "Mobile apps registering device tokens and receiving pushes.",
          LOAD_BALANCER: "Distributes incoming dispatch trigger requests.",
          APP_SERVER: "Validates notification requests and pushes job to queue.",
          QUEUE: "Message queue (Kafka / RabbitMQ) buffering notification jobs.",
          WORKER: "Worker pool draining queue and invoking APNs/FCM gateways.",
          DATABASE_PRIMARY: "User device tokens and notification log history.",
        },
      },
    },
    {
      id: "tradeoff",
      kind: "tradeoff",
      title: "Defend queue backpressure",
      prompt:
        "What happens when Apple APNs or Google FCM rate-limit our workers during a peak notification blast? Defend your queue retry strategy and backpressure handling.",
      concepts: [
        {
          id: "backpressure",
          label: "Identifies queue buildup and backpressure",
          axis: "problem",
          keywords: ["backpressure", "queue growth", "rate limit", "throttling", "retry storm"],
          patterns: ["backpressure", "rate limit", "queue backlog"],
        },
        {
          id: "exponential-backoff",
          label: "Proposes exponential backoff with jitter",
          axis: "mitigation",
          keywords: ["exponential backoff", "jitter", "retry interval", "circuit breaker"],
          patterns: ["exponential backoff", "jitter", "circuit breaker"],
        },
        {
          id: "dead-letter",
          label: "Uses a Dead Letter Queue (DLQ) for toxic messages",
          axis: "mitigation",
          keywords: ["dead letter", "dlq", "poison pill", "failed queue"],
          patterns: ["dead letter", "dlq"],
        },
        {
          id: "stale-pushes",
          label: "Weighs push TTL expiry vs sending outdated alerts",
          axis: "risk",
          keywords: ["ttl", "stale notification", "outdated alert", "expiry"],
          patterns: ["stale notification", "ttl", "expired push"],
        },
      ],
      minConcepts: 2,
      ideal:
        "When third-party gateways rate-limit requests, workers must catch HTTP 429/503 status codes and apply exponential backoff with random jitter to prevent retry storms. Notifications should carry a TTL (e.g. 2 hours) so expired alerts are dropped rather than delivered late. Unrecoverable failures move to a Dead Letter Queue (DLQ) for inspection.",
    },
  ],
};

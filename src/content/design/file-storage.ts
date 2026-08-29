import type { DesignScenario } from "@/lib/design/types";

export const fileStorage: DesignScenario = {
  id: "file-storage",
  title: "Distributed file storage and upload service",
  system: "Cloud file storage platform",
  stakeholder: "Sam",
  stakeholderRole: "Infrastructure Lead",
  tier: "tier-3",
  difficulty: "tricky",
  summary:
    "Infrastructure needs a file upload and streaming download service handling large payloads (up to 5GB files) with presigned URLs, chunked multipart uploads, and deduplication.",
  framing:
    "You are in a 30-minute design review with Sam, Lead Infrastructure Engineer. The platform handles user uploads ranging from 10KB images to 5GB video files. You must prevent large file byte streams from saturating application servers.",
  stages: [
    {
      id: "clarify",
      kind: "clarify",
      title: "Clarify the upload architecture",
      prompt: "Sam has 5 minutes. Clarify how file data flows from client to storage.",
      questions: [
        {
          id: "direct-upload",
          text: "Sam: “Should client file uploads proxy through our Application Servers, or go straight to Object Storage?”",
          options: [
            {
              id: "presigned-urls",
              label:
                "Presigned URLs — client uploads directly to Object Storage (S3), bypassing App Servers",
              followUp:
                "Sam: “Exactly! App servers only sign a 1KB JWT upload token; zero file bytes touch our compute tier.”",
            },
            {
              id: "proxy-app",
              label: "Proxy through App Server — stream file bytes through node app handlers",
              followUp:
                "Sam: “Proxying 5GB video files through app server memory will exhaust bandwidth and crash container memory.”",
            },
          ],
          accept: ["presigned-urls"],
          rationale:
            "Presigned URLs allow clients to upload large binary streams directly to Object Storage, freeing app servers from heavy I/O.",
        },
        {
          id: "chunking",
          text: "Sam: “What happens if a 2GB upload gets interrupted at 95% due to a flaky Wi-Fi connection?”",
          options: [
            {
              id: "multipart-chunking",
              label:
                "Multipart chunked upload — split files into 5MB chunks and resume failed chunks",
              followUp:
                "Sam: “Spot on! If chunk 390 fails, the client retries only chunk 390 instead of restarting all 2GB.”",
            },
            {
              id: "single-stream",
              label: "Single monolithic HTTP PUT request for the full file",
              followUp:
                "Sam: “A single PUT request means a 99% complete upload drops entirely on any network hiccup.”",
            },
          ],
          accept: ["multipart-chunking"],
          rationale:
            "Multipart uploads split large payloads into small chunks (e.g. 5MB-10MB), enabling parallel uploads and partial retries.",
        },
      ],
    },
    {
      id: "capacity",
      kind: "capacity",
      title: "Size it",
      prompt:
        "Assume 100M total files stored, average file size 2MB, 1M new files uploaded daily, and 5-year retention. Round freely.",
      fields: [
        {
          id: "total-storage-5y",
          label: "Total storage capacity needed after 5 years",
          unit: "TB",
          hint: "(1M files/day * 365 * 5 * 2MB) / 1M",
          formula: "(1,000,000 * 365 * 5 * 2,000,000) / 1,000,000,000,000",
          accept: { min: 3000, max: 4000 },
          magnitude: { min: 500, max: 10000 },
          rationale:
            "1M files x 365 x 5 = 1.825B files x 2MB ≈ 3,650 TB (3.65 Petabytes) in Object Storage.",
        },
        {
          id: "metadata-db-size",
          label: "Metadata DB size (500 bytes metadata per file)",
          unit: "GB",
          hint: "(1.825B files * 500 bytes) / 1B",
          formula: "(1,825,000,000 * 500) / 1,000,000,000",
          accept: { min: 800, max: 1000 },
          magnitude: { min: 100, max: 5000 },
          rationale: "1.825B files x 500 bytes ≈ 912 GB metadata in primary database.",
        },
      ],
    },
    {
      id: "components",
      kind: "components",
      title: "Sketch the file storage architecture",
      prompt:
        "Design the system layout incorporating CDN, Load Balancer, App Servers, Metadata Database, Object Storage, and CDN edge distribution.",
      spec: {
        palette: [
          "CLIENT",
          "CDN",
          "LOAD_BALANCER",
          "APP_SERVER",
          "OBJECT_STORE",
          "DATABASE_PRIMARY",
          "DATABASE_REPLICA",
        ],
        requiredNodeTypes: [
          "CLIENT",
          "CDN",
          "LOAD_BALANCER",
          "APP_SERVER",
          "OBJECT_STORE",
          "DATABASE_PRIMARY",
        ],
        forbiddenNodeTypes: [],
        requiredEdges: [
          { from: "CLIENT", to: "LOAD_BALANCER" },
          { from: "LOAD_BALANCER", to: "APP_SERVER" },
          { from: "APP_SERVER", to: "DATABASE_PRIMARY" },
          { from: "CLIENT", to: "CDN" },
          { from: "CDN", to: "OBJECT_STORE" },
        ],
        forbiddenEdges: [{ from: "CLIENT", to: "DATABASE_PRIMARY" }],
        minInstances: { APP_SERVER: 2 },
        notes: {
          CLIENT: "Client apps uploading chunks and fetching file streams.",
          CDN: "Caches hot media file downloads near global users.",
          LOAD_BALANCER: "Routes upload authentication and metadata requests.",
          APP_SERVER: "Handles metadata, authentication, and generates presigned S3 URLs.",
          OBJECT_STORE: "S3 / Blob store holding immutable raw file chunks.",
          DATABASE_PRIMARY: "Metadata index mapping user files -> chunk hashes -> S3 keys.",
        },
      },
    },
    {
      id: "tradeoff",
      kind: "tradeoff",
      title: "Defend file deduplication vs user privacy",
      prompt:
        "If 1,000 users upload the identical 1GB video file, how do you prevent storing 1,000 duplicate copies? Defend content-addressable storage (SHA-256 hash deduplication) while addressing privacy concerns.",
      concepts: [
        {
          id: "content-addressable",
          label: "Uses SHA-256 hash of file chunks for content-addressable deduplication",
          axis: "mitigation",
          keywords: ["sha256", "hash", "content addressable", "deduplication", "dedup"],
          patterns: ["sha-256", "hash", "dedup"],
        },
        {
          id: "chunk-dedup",
          label: "Applies deduplication at the chunk level rather than full file level",
          axis: "mitigation",
          keywords: ["chunk level", "block dedup", "sub-file"],
          patterns: ["chunk", "block dedup"],
        },
        {
          id: "privacy-risk",
          label: "Identifies convergent encryption / privacy risk of hash matching",
          axis: "risk",
          keywords: ["privacy", "convergent encryption", "security risk", "side-channel"],
          patterns: ["privacy", "convergent encryption", "side-channel"],
        },
      ],
      minConcepts: 2,
      ideal:
        "Content-addressable storage computes a SHA-256 hash for each chunk. If a chunk hash already exists in Object Storage, the metadata DB creates a reference pointer instead of writing duplicate bytes, saving petabytes of storage. To preserve privacy across users, convergent encryption or per-user salt can be applied to block unauthorized cross-user hash guessing.",
    },
  ],
};

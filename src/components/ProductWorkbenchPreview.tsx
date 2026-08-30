import { useState } from "react";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  ShieldAlert,
  Network,
  FileCode,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ProductWorkbenchPreview() {
  const [activeTab, setActiveTab] = useState<"debug" | "design">("debug");
  const [activeFile, setActiveFile] = useState<"processor.py" | "test_suite.py">("processor.py");
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testOutput, setTestOutput] = useState<"idle" | "running" | "failed">("idle");
  const [selectedNode, setSelectedNode] = useState<string>("gateway");
  const [designStage, setDesignStage] = useState<number>(3);

  const runSimulatedTests = () => {
    setIsRunningTests(true);
    setTestOutput("running");
    setTimeout(() => {
      setIsRunningTests(false);
      setTestOutput("failed");
    }, 900);
  };

  return (
    <div className="w-full rounded-sm border border-[#171717] bg-[#0A0A0A] shadow-2xl overflow-hidden">
      {/* Top Controller Bar */}
      <div className="border-b border-[#171717] bg-[#000000]/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-3">
            <span className="size-2.5 rounded-full bg-[#EF4444]/80 inline-block" />
            <span className="size-2.5 rounded-full bg-[#F59E0B]/80 inline-block" />
            <span className="size-2.5 rounded-full bg-[#10B981]/80 inline-block" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider text-[#64748B] uppercase">
            Interactive Workbench Simulation
          </span>
        </div>

        {/* View Switcher */}
        <div className="flex items-center max-w-full overflow-x-auto rounded-sm bg-[#171717] p-1 border border-[#262626]">
          <button
            onClick={() => setActiveTab("debug")}
            className={`flex items-center gap-2 px-3 py-1 font-mono text-xs rounded-sm transition-all whitespace-nowrap ${
              activeTab === "debug"
                ? "bg-[#10B981] font-bold text-[#000000] shadow-sm"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <FileCode className="size-3.5" />
            Incident Room (IDE)
          </button>
          <button
            onClick={() => setActiveTab("design")}
            className={`flex items-center gap-2 px-3 py-1 font-mono text-xs rounded-sm transition-all whitespace-nowrap ${
              activeTab === "design"
                ? "bg-[#10B981] font-bold text-[#000000] shadow-sm"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <Network className="size-3.5" />
            System Blueprint Canvas
          </button>
        </div>
      </div>

      {/* Main Preview Screen */}
      {activeTab === "debug" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
          {/* Left Column: Monaco Code Editor View */}
          <div className="lg:col-span-7 border-r border-[#171717] bg-[#000000] flex flex-col">
            {/* Tab strip */}
            <div className="border-b border-[#171717] bg-[#0A0A0A] flex items-center justify-between px-3">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveFile("processor.py")}
                  className={`px-3 py-2 border-t-2 font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                    activeFile === "processor.py"
                      ? "border-[#10B981] bg-[#000000] text-[#F8FAFC] font-semibold"
                      : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
                  }`}
                >
                  <FileCode className="size-3 text-[#10B981]" />
                  order_processor.py
                </button>
                <button
                  onClick={() => setActiveFile("test_suite.py")}
                  className={`px-3 py-2 border-t-2 font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                    activeFile === "test_suite.py"
                      ? "border-[#10B981] bg-[#000000] text-[#F8FAFC] font-semibold"
                      : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
                  }`}
                >
                  <FileCode className="size-3 text-[#64748B]" />
                  test_harness.py
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-sm border border-[#10B981]/20">
                  Pyodide WebWorker Sandbox Active
                </span>
              </div>
            </div>

            {/* Code Content */}
            <div className="p-4 font-mono text-xs leading-relaxed flex-1 overflow-x-auto">
              {activeFile === "processor.py" ? (
                <div className="space-y-1 text-[#94A3B8]">
                  <div className="text-[#64748B]"># INCIDENT // INC-804: Race Condition in Concurrent Ledger Debits</div>
                  <div><span className="text-[#F472B6]">async def</span> <span className="text-[#38BDF8]">process_withdrawal</span>(account_id: str, amount: Decimal):</div>
                  <div className="pl-4 text-[#64748B]"># BUG: Reads balance before lock acquisition</div>
                  <div className="pl-4 bg-[#EF4444]/10 border-l-2 border-[#EF4444] text-[#F8FAFC]">
                    balance = <span className="text-[#F472B6]">await</span> db.get_balance(account_id)
                  </div>
                  <div className="pl-4"><span className="text-[#F472B6]">if</span> balance &lt; amount:</div>
                  <div className="pl-8 text-[#F87171]">raise OverdraftError("Insufficient funds")</div>
                  <div className="pl-4 text-[#64748B]"># Lock acquired too late — parallel worker debits balance twice</div>
                  <div className="pl-4"><span className="text-[#F472B6]">async with</span> db.transaction_lock(account_id):</div>
                  <div className="pl-8"><span className="text-[#F472B6]">await</span> db.update_balance(account_id, balance - amount)</div>
                  <div className="pl-8 text-[#38BDF8]">return LedgerReceipt(status="EXECUTED")</div>
                </div>
              ) : (
                <div className="space-y-1 text-[#94A3B8]">
                  <div className="text-[#64748B]"># Hidden pytest harness evaluated inside browser worker</div>
                  <div><span className="text-[#F472B6]">async def</span> <span className="text-[#38BDF8]">test_concurrent_withdrawals_never_overdraft</span>():</div>
                  <div className="pl-4">account = await setup_test_account(balance=100.0)</div>
                  <div className="pl-4 text-[#64748B]"># Simulating 5 parallel requests</div>
                  <div className="pl-4">tasks = [process_withdrawal(account.id, 80.0) for _ in range(5)]</div>
                  <div className="pl-4">results = await asyncio.gather(*tasks, return_exceptions=True)</div>
                  <div className="pl-4 text-[#38BDF8]">successful = [r for r in results if not isinstance(r, Exception)]</div>
                  <div className="pl-4 text-[#EF4444]">assert len(successful) == 1, "Race condition allowed multiple debits!"</div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t border-[#1E293B] bg-[#0F172A] p-3 flex items-center justify-between">
              <span className="font-mono text-xs text-[#64748B]">
                Attempts: <span className="text-[#F8FAFC]">3</span> · Severity: <span className="text-[#F59E0B]">P1 HIGH</span>
              </span>
              <button
                onClick={runSimulatedTests}
                disabled={isRunningTests}
                className="inline-flex items-center gap-2 rounded-sm bg-[#38BDF8] px-3.5 py-1.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Executing Pyodide Harness...
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 fill-current" />
                    Run Test Harness
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Signal Panel & Failing Execution Logs */}
          <div className="lg:col-span-5 bg-[#0F172A] flex flex-col justify-between p-5 border-t lg:border-t-0 border-[#1E293B]">
            <div>
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#38BDF8] flex items-center gap-2">
                  <Terminal className="size-4" />
                  Live Signal Panel
                </span>
                <span className="font-mono text-[10px] uppercase bg-[#EF4444]/10 text-[#F87171] px-2 py-0.5 rounded-sm border border-[#EF4444]/30">
                  Failing Signal
                </span>
              </div>

              <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-[#64748B] text-[11px] border-b border-[#1E293B]/60 pb-1.5">
                  <span>TEST SUITE EXECUTION</span>
                  <span>TIME: 142ms</span>
                </div>
                {testOutput === "running" ? (
                  <div className="py-6 text-center text-[#38BDF8] space-y-2">
                    <RefreshCw className="size-5 animate-spin mx-auto text-[#38BDF8]" />
                    <p className="text-xs">Invoking Pyodide WebWorker test runner...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#F87171] flex items-start gap-1.5">
                      <XCircle className="size-4 text-[#EF4444] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">AssertionError: Race condition allowed double spend</div>
                        <div className="text-[11px] text-[#94A3B8] mt-1">
                          Expected 1 successful transaction, got 2. Account balance dropped to -60.0.
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#64748B] pt-2 border-t border-[#1E293B]/60">
                      ROOT CAUSE HINT: Check read-modify-write synchronization before balance check.
                    </div>
                  </>
                )}
              </div>

              {/* Annotated Feature Badges */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2.5 text-xs text-[#94A3B8] font-sans">
                  <CheckCircle2 className="size-4 text-[#38BDF8] shrink-0" />
                  <span><strong>Monaco Editor</strong> loaded directly with multi-file scenario files.</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#94A3B8] font-sans">
                  <CheckCircle2 className="size-4 text-[#38BDF8] shrink-0" />
                  <span><strong>Pyodide Client-side Harness</strong> evaluates execution speed & correctness.</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#94A3B8] font-sans">
                  <CheckCircle2 className="size-4 text-[#38BDF8] shrink-0" />
                  <span><strong>Senior Debrief</strong> unlocks postmortem analysis upon pass.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between">
              <span className="font-mono text-xs text-[#64748B]">Ready to fix this incident?</span>
              <Link
                to="/incidents"
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#38BDF8] hover:underline"
              >
                Open Debugging Docket <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* System Design Architecture View */
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
          {/* Left Column: Interactive Topology Canvas Mockup */}
          <div className="lg:col-span-8 border-r border-[#1E293B] bg-[#0B0F19] p-6 flex flex-col justify-between">
            {/* Stage Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-4 mb-4">
              <span className="font-mono text-xs text-[#64748B] uppercase tracking-wider font-bold">
                Graded Stage Blueprint
              </span>
              <div className="flex items-center gap-1">
                {[
                  { num: 1, label: "Clarify" },
                  { num: 2, label: "Sizing" },
                  { num: 3, label: "Topology" },
                  { num: 4, label: "Trade-offs" },
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setDesignStage(s.num)}
                    className={`px-2.5 py-1 font-mono text-xs rounded-sm border transition-all ${
                      designStage === s.num
                        ? "border-[#38BDF8] bg-[#38BDF8]/10 text-[#38BDF8] font-bold"
                        : "border-[#1E293B] text-[#64748B] hover:text-[#94A3B8]"
                    }`}
                  >
                    {s.num}. {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Nodes Canvas */}
            <div className="relative rounded-sm border border-[#1E293B] bg-[#0F172A]/70 p-6 my-2 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Node 1: API Gateway */}
              <button
                onClick={() => setSelectedNode("gateway")}
                className={`p-4 rounded-sm border text-left transition-all ${
                  selectedNode === "gateway"
                    ? "border-[#38BDF8] bg-[#1E293B] shadow-md ring-1 ring-[#38BDF8]"
                    : "border-[#1E293B] bg-[#0B0F19] hover:border-[#334155]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Cpu className="size-4 text-[#38BDF8]" />
                  <span className="font-mono text-[10px] text-[#10B981] font-semibold">10k QPS</span>
                </div>
                <div className="mt-2 font-mono text-xs font-bold text-[#F8FAFC]">API Gateway</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Envoy Rate Limiter</div>
              </button>

              {/* Node 2: Cache Cluster */}
              <button
                onClick={() => setSelectedNode("redis")}
                className={`p-4 rounded-sm border text-left transition-all ${
                  selectedNode === "redis"
                    ? "border-[#38BDF8] bg-[#1E293B] shadow-md ring-1 ring-[#38BDF8]"
                    : "border-[#1E293B] bg-[#0B0F19] hover:border-[#334155]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Layers className="size-4 text-[#F59E0B]" />
                  <span className="font-mono text-[10px] text-[#EF4444] font-semibold">SPOF ALERT</span>
                </div>
                <div className="mt-2 font-mono text-xs font-bold text-[#F8FAFC]">Redis Cache</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Single Primary Node</div>
              </button>

              {/* Node 3: Database Shard */}
              <button
                onClick={() => setSelectedNode("db")}
                className={`p-4 rounded-sm border text-left transition-all ${
                  selectedNode === "db"
                    ? "border-[#38BDF8] bg-[#1E293B] shadow-md ring-1 ring-[#38BDF8]"
                    : "border-[#1E293B] bg-[#0B0F19] hover:border-[#334155]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="size-4 text-[#6366F1]" />
                  <span className="font-mono text-[10px] text-[#94A3B8]">Read Replica</span>
                </div>
                <div className="mt-2 font-mono text-xs font-bold text-[#F8FAFC]">Postgres Primary</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Multi-AZ Storage</div>
              </button>
            </div>

            {/* Bottom SLA arithmetic bar */}
            <div className="mt-3 rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-[#64748B]">Capacity: <strong className="text-[#F8FAFC]">50,000 req/sec</strong></span>
                <span className="text-[#64748B]">P99 Latency SLA: <strong className="text-[#10B981]">15ms</strong></span>
              </div>
              <span className="font-mono text-xs text-[#38BDF8]">Typed Canvas Node Inspector →</span>
            </div>
          </div>

          {/* Right Column: Node Inspector & SPOF Telemetry */}
          <div className="lg:col-span-4 bg-[#0F172A] p-5 flex flex-col justify-between">
            <div>
              <div className="border-b border-[#1E293B] pb-3 mb-4 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                  Automated Rubric Inspector
                </span>
                <span className="font-mono text-[10px] bg-[#38BDF8]/10 text-[#38BDF8] px-2 py-0.5 rounded-sm">
                  Stage {designStage} Active
                </span>
              </div>

              {selectedNode === "redis" ? (
                <div className="space-y-3">
                  <div className="rounded-sm border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 text-xs text-[#F87171] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="size-4 text-[#EF4444]" />
                      Single Point of Failure Detected
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                      Your Redis primary node has no failover replica configured. Node loss will break rate limiting under spike traffic.
                    </p>
                  </div>
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 space-y-2 font-mono text-xs">
                    <div className="text-[#64748B] text-[10px] uppercase">RUBRIC EVALUATION</div>
                    <div className="text-[#F8FAFC] flex justify-between">
                      <span>High Availability:</span>
                      <span className="text-[#EF4444]">PARTIAL (60%)</span>
                    </div>
                    <div className="text-[#F8FAFC] flex justify-between">
                      <span>Capacity Arithmetic:</span>
                      <span className="text-[#10B981]">PASS (100%)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-sm border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-[#10B981]" />
                      Selected Component Verified
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                      Node parameters conform to latency budget SLA. Node connections are typed and validated.
                    </p>
                  </div>
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 space-y-2 font-mono text-xs">
                    <div className="text-[#64748B] text-[10px] uppercase">RUBRIC EVALUATION</div>
                    <div className="text-[#F8FAFC] flex justify-between">
                      <span>Graph Completeness:</span>
                      <span className="text-[#10B981]">OPTIMAL</span>
                    </div>
                    <div className="text-[#F8FAFC] flex justify-between">
                      <span>Stakeholder Score:</span>
                      <span className="text-[#38BDF8]">94 / 100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between">
              <span className="font-mono text-xs text-[#64748B]">Defend system architecture?</span>
              <Link
                to="/design"
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#38BDF8] hover:underline"
              >
                Open System Blueprints <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

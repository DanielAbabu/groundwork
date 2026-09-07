import { useState } from "react";
import type { Scenario } from "@/lib/scenarios/types";
import type { RunResult } from "@/lib/sandbox/runTests";
import {
  Globe,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ArrowRight,
  Code2,
  Activity,
  Terminal,
} from "lucide-react";

interface WebPreviewPanelProps {
  scenario: Scenario;
  result: RunResult | null;
  running: boolean;
  onRunTests: () => void;
}

export function WebPreviewPanel({ scenario, result, running, onRunTests }: WebPreviewPanelProps) {
  const preview = scenario.webPreview || {
    url: `http://localhost:8000/api/${scenario.service}`,
    method: "POST" as const,
    appName: scenario.service.toUpperCase().replace("-", " "),
  };

  const [activeTab, setActiveTab] = useState<"render" | "request" | "response">("render");
  const [customPayload, setCustomPayload] = useState<string>(
    typeof preview.defaultPayload === "string"
      ? preview.defaultPayload
      : JSON.stringify(preview.defaultPayload || { action: "execute", service: scenario.service }, null, 2)
  );

  const cases = result?.kind === "results" ? result.cases : [];
  const passCount = cases.filter((c) => c.passed).length;
  const isPassed = cases.length > 0 && passCount === cases.length;
  const isFailed = result?.kind === "crash" || result?.kind === "timeout" || (cases.length > 0 && !isPassed);

  return (
    <div className="flex h-full flex-col bg-[#050507] text-[#F8FAFC] font-sans overflow-hidden">
      {/* ── BROWSER HEADER & ADDRESS BAR ── */}
      <div className="flex shrink-0 flex-col border-b border-[#1E293B] bg-[#090D16] p-2.5 gap-2">
        {/* Browser Top Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-[#EF4444]/80" />
            <div className="size-2.5 rounded-full bg-[#F59E0B]/80" />
            <div className="size-2.5 rounded-full bg-[#10B981]/80" />
            <span className="ml-2 font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              {preview.appName || scenario.service} · WEB PREVIEW
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("render")}
              className={`px-2.5 py-1 font-mono text-[11px] rounded-sm transition-colors ${
                activeTab === "render"
                  ? "bg-[#10B981]/20 text-[#10B981] font-bold border border-[#10B981]/40"
                  : "text-[#64748B] hover:text-[#F8FAFC]"
              }`}
            >
              App View
            </button>
            <button
              onClick={() => setActiveTab("request")}
              className={`px-2.5 py-1 font-mono text-[11px] rounded-sm transition-colors ${
                activeTab === "request"
                  ? "bg-[#38BDF8]/20 text-[#38BDF8] font-bold border border-[#38BDF8]/40"
                  : "text-[#64748B] hover:text-[#F8FAFC]"
              }`}
            >
              Request
            </button>
            <button
              onClick={() => setActiveTab("response")}
              className={`px-2.5 py-1 font-mono text-[11px] rounded-sm transition-colors ${
                activeTab === "response"
                  ? "bg-[#A855F7]/20 text-[#A855F7] font-bold border border-[#A855F7]/40"
                  : "text-[#64748B] hover:text-[#F8FAFC]"
              }`}
            >
              Response
            </button>
          </div>
        </div>

        {/* URL Bar */}
        <div className="flex items-center gap-2 rounded-sm border border-[#1E293B] bg-[#000000] px-3 py-1.5">
          <span className="rounded-sm bg-[#10B981]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#10B981] border border-[#10B981]/30">
            {preview.method || "GET"}
          </span>
          <Globe className="size-3.5 text-[#64748B] shrink-0" />
          <input
            type="text"
            readOnly
            value={preview.url}
            className="flex-1 bg-transparent font-mono text-xs text-[#E2E8F0] focus:outline-none"
          />
          <button
            onClick={onRunTests}
            disabled={running}
            title="Simulate Web HTTP Request"
            className="flex items-center gap-1.5 rounded-sm bg-[#10B981] px-2.5 py-1 font-mono text-[10px] font-bold text-[#000000] hover:bg-[#34D399] transition-colors disabled:opacity-50"
          >
            {running ? (
              <Activity className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            {running ? "Executing…" : "Test Route"}
          </button>
        </div>
      </div>

      {/* ── BROWSER CONTENT BODY ── */}
      <div className="flex-1 overflow-y-auto p-5 relative bg-[#090D16]/50">
        {activeTab === "request" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                <Code2 className="size-4" /> HTTP Request Payload
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">Content-Type: application/json</span>
            </div>
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              className="w-full h-64 rounded-sm border border-[#1E293B] bg-[#000000] p-3 font-mono text-xs text-[#10B981] focus:outline-none focus:border-[#10B981]"
            />
            <p className="font-mono text-[11px] text-[#64748B]">
              This HTTP request is dispatched directly against your local Pyodide microservice runner.
            </p>
          </div>
        )}

        {activeTab === "response" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                <Server className="size-4" /> Response Stream & Logs
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-sm ${
                  isPassed
                    ? "bg-[#10B981]/20 text-[#10B981]"
                    : isFailed
                    ? "bg-[#EF4444]/20 text-[#EF4444]"
                    : "bg-[#1E293B] text-[#94A3B8]"
                }`}
              >
                {isPassed ? "200 OK" : isFailed ? "500 SERVER ERROR" : "STANDBY"}
              </span>
            </div>

            {result?.kind === "results" && (
              <div className="space-y-3">
                <div className="rounded-sm border border-[#1E293B] bg-[#000000] p-3 font-mono text-xs">
                  <span className="text-[#64748B]">HTTP/1.1 {isPassed ? "200 OK" : "500 Internal Server Error"}</span>
                  <br />
                  <span className="text-[#64748B]">Content-Type: application/json</span>
                  <br />
                  <span className="text-[#64748B]">X-Service-Name: {scenario.service}</span>
                </div>
                <div className="rounded-sm border border-[#1E293B] bg-[#000000] p-4 font-mono text-xs leading-relaxed">
                  {isPassed ? (
                    <span className="text-[#10B981]">
                      {JSON.stringify({ status: "success", casesPassing: `${passCount}/${cases.length}`, service: scenario.service }, null, 2)}
                    </span>
                  ) : (
                    <span className="text-[#EF4444]">
                      {JSON.stringify({ error: "Unhandled Exception", symptom: scenario.symptom, failingCases: cases.filter(c => !c.passed) }, null, 2)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!result && (
              <div className="p-8 text-center border border-dashed border-[#1E293B] rounded-sm space-y-2">
                <Terminal className="mx-auto size-6 text-[#64748B]" />
                <p className="font-mono text-xs text-[#64748B]">No response recorded yet. Click "Test Route" to fire request.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "render" && (
          <div className="h-full flex flex-col justify-between space-y-5">
            {/* Live Web Application Mock Header */}
            <div className="rounded-sm border border-[#1E293B] bg-[#000000] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-sm bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center font-mono text-xs font-bold text-[#10B981]">
                    {scenario.service[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">
                      {scenario.title}
                    </h3>
                    <p className="font-mono text-[10px] text-[#64748B]">
                      Service Target: <span className="text-[#10B981]">{scenario.service}</span>
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-1 rounded-sm border ${
                    isPassed
                      ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
                      : isFailed
                      ? "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]"
                      : "border-[#1E293B] bg-[#0B0F19] text-[#94A3B8]"
                  }`}
                >
                  {isPassed ? "● APP HEALTHY" : isFailed ? "● APP DEGRADED (500)" : "○ AWAITING EXECUTION"}
                </span>
              </div>

              {/* Dynamic State Preview Render */}
              {!result && (
                <div className="py-10 text-center space-y-3">
                  <Layers className="mx-auto size-8 text-[#38BDF8] animate-pulse" />
                  <h4 className="font-mono text-xs font-bold text-[#F8FAFC]">Interactive Endpoint Preview Ready</h4>
                  <p className="font-sans text-xs text-[#94A3B8] max-w-sm mx-auto">
                    Click <strong className="text-[#10B981]">"Test Route"</strong> or press <kbd className="px-1.5 py-0.5 bg-[#1E293B] text-white rounded text-[10px]">Ctrl+Enter</kbd> to execute your python/js repo logic and view live UI responses.
                  </p>
                  <button
                    onClick={onRunTests}
                    className="inline-flex items-center gap-2 rounded-sm bg-[#10B981] px-4 py-2 font-mono text-xs font-bold text-[#000000] hover:bg-[#34D399] transition-colors"
                  >
                    Run Code & Test Endpoint <ArrowRight className="size-3.5" />
                  </button>
                </div>
              )}

              {isFailed && (
                <div className="rounded-sm border border-[#EF4444]/40 bg-[#EF4444]/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[#EF4444] font-mono text-xs font-bold">
                    <AlertTriangle className="size-4" /> 500 Internal Server Error Preview
                  </div>
                  <div className="rounded-sm bg-[#000000] p-3 border border-[#EF4444]/20 font-mono text-xs text-[#F8FAFC] space-y-1">
                    <p className="text-[#EF4444] font-bold">Symptom: {scenario.symptom}</p>
                    <p className="text-[#94A3B8] text-[11px] mt-1">
                      Web endpoint returned runtime failure. Check Monaco code editor tabs to fix missing logic or broken query.
                    </p>
                  </div>
                </div>
              )}

              {isPassed && (
                <div className="rounded-sm border border-[#10B981]/40 bg-[#10B981]/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-[#10B981] font-mono text-xs font-bold">
                    <CheckCircle2 className="size-4" /> 200 OK — Endpoint Responding Correctly
                  </div>
                  <div className="rounded-sm bg-[#000000] p-4 border border-[#10B981]/20 font-mono text-xs text-[#F8FAFC] space-y-2">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Response Status: 200 OK</span>
                      <span>Latency: 4ms</span>
                    </div>
                    <div className="pt-2 border-t border-[#1E293B] text-[#10B981]">
                      ✓ All {cases.length} hidden repo integration tests passed successfully.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scenario Quick Specs Footnote */}
            <div className="rounded-sm border border-[#1E293B] bg-[#000000] p-3 font-mono text-[10px] text-[#64748B] flex items-center justify-between">
              <span>ENDPOINT: {preview.url}</span>
              <span>METHOD: {preview.method || "GET"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

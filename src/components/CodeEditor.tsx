import Editor from "@monaco-editor/react";

export default function CodeEditor({
  path,
  value,
  readOnly,
  onChange,
}: {
  path: string;
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <Editor
      key={path}
      path={path}
      language="javascript"
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
      }}
      loading={
        <span className="font-mono text-xs text-muted-foreground">loading editor…</span>
      }
    />
  );
}

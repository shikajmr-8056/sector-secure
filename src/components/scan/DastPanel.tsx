export function DastPanel() {
  const checks = [
    { name: "Strict-Transport-Security", result: "missing", note: "no HSTS header on 200 response" },
    { name: "Content-Security-Policy", result: "present", note: "default-src 'self'" },
    { name: "Set-Cookie flags", result: "partial", note: "Secure set, SameSite absent" },
    { name: "TLS configuration", result: "present", note: "TLS 1.3, cert valid 61 days" },
    { name: "X-Content-Type-Options", result: "missing", note: "nosniff not sent" },
  ];

  return (
    <div className="rounded-xl border border-dast/30 bg-dast/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Passive surface checks</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only header, cookie and TLS inspection. No requests are made outside the approved
            list.
          </p>
        </div>
        <span className="rounded border border-dast/50 px-2 py-0.5 font-mono text-[11px] text-dast">
          sandboxed demo apps only
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-panel/60 p-1.5">
        <span className="pl-2 font-mono text-xs text-muted-foreground">target</span>
        <select className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none">
          <option className="bg-popover">demo-01.avss-sandbox.dev</option>
          <option className="bg-popover">demo-02.avss-sandbox.dev</option>
          <option className="bg-popover">juice.avss-sandbox.dev</option>
        </select>
        <span className="rounded px-2 py-1 font-mono text-[11px] text-muted-foreground">
          pre-approved targets only
        </span>
      </div>

      <div className="mt-4 divide-y divide-border">
        {checks.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-4 py-2.5">
            <div>
              <p className="font-mono text-xs text-foreground">{c.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{c.note}</p>
            </div>
            <span
              className="font-mono text-[11px]"
              style={{
                color:
                  c.result === "missing"
                    ? "var(--sev-high)"
                    : c.result === "partial"
                      ? "var(--sev-medium)"
                      : "var(--sev-low)",
              }}
            >
              {c.result}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

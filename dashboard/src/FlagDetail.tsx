import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { apiFetch } from './api';

interface TargetingRule {
  attribute: string;
  operator: string;
  value:
    | string
    | number
    | boolean
    | (string | number)[];
  serveValue: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

interface Flag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
  rules: TargetingRule[];
  rollout: {
    percentage: number;
    serveValue: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

function FlagDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [flag, setFlag] = useState<Flag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [savingRollout, setSavingRollout] = useState(false);
  const [rolloutSaved, setRolloutSaved] = useState(true);

  const [rules, setRules] = useState<TargetingRule[]>([]);
  const [rulesSaved, setRulesSaved] = useState(true);
  const [savingRules, setSavingRules] = useState(false);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const [togglingEnabled, setTogglingEnabled] = useState(false);

  useEffect(() => {
    fetchFlag();
  }, [id]);

  async function fetchFlag() {
    try {
      setLoading(true);
      const response = await apiFetch(`/flags/${id}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      setFlag(data);
      setRolloutPercentage(data.rollout?.percentage ?? 0);
      setRules(data.rules ?? []);
      setError(null);

      const auditResponse = await apiFetch(`/audit-log/flag/${id}`);
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditLog(auditData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flag');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEnabled() {
    if (!flag) return;
    setTogglingEnabled(true);

    try {
      const response = await apiFetch(`/flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const updated = await response.json();
      setFlag(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
    } finally {
      setTogglingEnabled(false);
    }
  }

  async function handleSaveRollout() {
    if (!flag) return;
    setSavingRollout(true);

    try {
      const response = await apiFetch(`/flags/${flag.id}/rollout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollout: rolloutPercentage > 0
            ? { percentage: rolloutPercentage, serveValue: true }
            : null,
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const updated = await response.json();
      setFlag(updated);
      setRolloutSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rollout');
    } finally {
      setSavingRollout(false);
    }
  }

  function addRule() {
    setRules((prev) => [
      ...prev,
      { attribute: '', operator: 'equals', value: '', serveValue: true },
    ]);
    setRulesSaved(false);
  }

  function updateRule(index: number, changes: Partial<TargetingRule>) {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...changes } : rule))
    );
    setRulesSaved(false);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setRulesSaved(false);
  }

  async function handleSaveRules() {
    if (!flag) return;
    setSavingRules(true);

    try {
      const response = await apiFetch(`/flags/${flag.id}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const updated = await response.json();
      setFlag(updated);
      setRulesSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setSavingRules(false);
    }
  }

  async function handleDeleteFlag() {
    if (!flag) return;
    if (!confirm(`Delete flag "${flag.key}"? This cannot be undone.`)) return;

    try {
      const response = await apiFetch(`/flags/${flag.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
    }
  }

  const hasUnsavedChanges = !rolloutSaved || !rulesSaved;
  const [savingAll, setSavingAll] = useState(false);

  async function handleSaveAll() {
    if (!flag) return;
    setSavingAll(true);
    setError(null);

    try {
      if (!rolloutSaved) await handleSaveRollout();
      if (!rulesSaved) await handleSaveRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingAll(false);
    }
  }

  // Shared layout components
  const isDashboard = location.pathname.startsWith('/flags');

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <div className="flex min-h-[calc(100vh-74px)]">
          <Sidebar isDashboard={isDashboard} location={location} />
          <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
            <div className="border-y border-border py-8 text-[15px] text-text-dim">
              Loading flag…
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error && !flag) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <div className="flex min-h-[calc(100vh-74px)]">
          <Sidebar isDashboard={isDashboard} location={location} />
          <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[15px] text-danger">
              Error: {error}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!flag) return null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      <div className="flex min-h-[calc(100vh-74px)]">
        <Sidebar isDashboard={isDashboard} location={location} />

        <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-[1100px]">

            {/* Back link */}
            <Link
              to="/dashboard"
              className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim transition-colors hover:text-text"
            >
              ← Feature Flags
            </Link>

            {/* Header */}
            <header className="mb-10 border-b border-border pb-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-4">
                  <h1 className="font-mono text-[26px] font-semibold leading-none tracking-[-0.04em]">
                    {flag.key}
                  </h1>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={handleToggleEnabled}
                    disabled={togglingEnabled}
                    className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
                      flag.enabled ? 'bg-success' : 'bg-surface-high'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        flag.enabled ? 'translate-x-[27px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>

                  <span
                    className={`text-[14px] font-medium ${
                      flag.enabled ? 'text-success' : 'text-text-dim'
                    }`}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleSaveAll}
                      disabled={savingAll}
                      className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingAll ? 'Saving…' : 'Save All Changes'}
                    </button>
                  )}

                  <button
                    onClick={handleDeleteFlag}
                    className="rounded-full border border-danger/25 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger hover:text-white"
                  >
                    Delete Flag
                  </button>
                </div>
              </div>

              {flag.description && (
                <p className="mt-3 text-[15px] text-text-dim">{flag.description}</p>
              )}
            </header>

            {error && (
              <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[14px] text-danger">
                {error}
              </div>
            )}

            {/* Rollout */}
            <section className="rounded-2xl border border-border bg-surface/55 p-7">
              <h2 className="mb-5 text-[17px] font-semibold">Rollout Percentage</h2>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rolloutPercentage}
                  onChange={(e) => {
                    setRolloutPercentage(Number(e.target.value));
                    setRolloutSaved(false);
                  }}
                  className="flex-1 accent-primary"
                />

                <div className="flex items-center gap-1 rounded-lg border border-border bg-bg px-2 py-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rolloutPercentage}
                    onChange={(e) => {
                      setRolloutPercentage(Number(e.target.value));
                      setRolloutSaved(false);
                    }}
                    className="w-14 bg-transparent text-right font-mono text-sm text-text focus:outline-none"
                  />
                  <span className="font-mono text-sm text-text-dim">%</span>
                </div>
              </div>

              <button
                onClick={handleSaveRollout}
                disabled={savingRollout || rolloutSaved}
                className={`mt-5 rounded-full px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
                  rolloutSaved && !savingRollout
                    ? 'bg-success/12 text-success'
                    : 'bg-primary text-white hover:opacity-90'
                }`}
              >
                {savingRollout ? 'Saving…' : rolloutSaved ? 'Saved ✓' : 'Save Rollout'}
              </button>
            </section>

            {/* Targeting Rules */}
            <section className="mt-5 rounded-2xl border border-border bg-surface/55 p-7">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold">Targeting Rules</h2>
                <button
                  onClick={addRule}
                  className="rounded-full border border-border px-4 py-2 text-sm text-text-dim transition-colors hover:border-primary hover:text-primary"
                >
                  + Add Rule
                </button>
              </div>

              {rules.length === 0 && (
                <p className="text-sm text-text-dim">No rules yet. Add one to target specific users.</p>
              )}

              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={index} className="rounded-xl border border-border bg-bg p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-4">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Attribute
                        </label>
                        <input
                          type="text"
                          value={rule.attribute}
                          onChange={(e) => updateRule(index, { attribute: e.target.value })}
                          placeholder="plan"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Operator
                        </label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(index, { operator: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          <option value="equals">equals</option>
                          <option value="notEquals">not equals</option>
                          <option value="in">in</option>
                          <option value="contains">contains</option>
                          <option value="inSegment">in segment</option>
                        </select>
                      </div>

                      <div className="lg:col-span-5">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Value
                        </label>
                        <input
                          type="text"
                          value={String(rule.value)}
                          onChange={(e) => updateRule(index, { value: e.target.value })}
                          placeholder="pro"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-2 text-sm text-text-dim">
                        Then serve:
                        <button
                          onClick={() => updateRule(index, { serveValue: true })}
                          className={`rounded-lg px-3 py-1 text-xs font-medium ${
                            rule.serveValue ? 'bg-surface-high text-text' : 'text-text-dim'
                          }`}
                        >
                          True
                        </button>
                        <button
                          onClick={() => updateRule(index, { serveValue: false })}
                          className={`rounded-lg px-3 py-1 text-xs font-medium ${
                            !rule.serveValue ? 'bg-surface-high text-text' : 'text-text-dim'
                          }`}
                        >
                          False
                        </button>
                      </div>

                      <button
                        onClick={() => removeRule(index)}
                        className="text-sm text-text-dim transition-colors hover:text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveRules}
                disabled={savingRules || rulesSaved}
                className={`mt-5 rounded-full px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
                  rulesSaved && !savingRules
                    ? 'bg-success/12 text-success'
                    : 'bg-primary text-white hover:opacity-90'
                }`}
              >
                {savingRules ? 'Saving…' : rulesSaved ? 'Saved ✓' : 'Save Rules'}
              </button>
            </section>

            {/* Activity Log */}
            <section className="mt-5 rounded-2xl border border-border bg-surface/55 p-7">
              <h2 className="mb-5 text-[17px] font-semibold">Activity Log</h2>

              {auditLog.length === 0 && (
                <p className="text-sm text-text-dim">No activity recorded yet.</p>
              )}

              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <span className="text-sm font-medium text-text">{entry.action}</span>
                      <p className="mt-1 font-mono text-xs text-text-dim">
                        {JSON.stringify(entry.changes, null, 0).slice(0, 120)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-text-dim">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Metadata footer */}
            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim sm:flex-row sm:items-center sm:justify-between">
              <span>Flag / {flag.key}</span>
              <span>Updated {new Date(flag.updatedAt).toLocaleString()}</span>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

/* Shared layout components to match App.tsx and Segments.tsx */

function Header() {
  return (
    <header className="flex h-[74px] items-center justify-between border-b border-border px-6 lg:px-10">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface">
          <span className="text-[21px] leading-none text-primary">⚑</span>
        </div>
        <div>
          <div className="text-[17px] font-semibold tracking-[-0.02em]">Flagwise</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
            Control plane
          </div>
        </div>
      </Link>
      <Link
        to="/"
        className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim transition-colors hover:text-text"
      >
        Landing →
      </Link>
    </header>
  );
}

function Sidebar({ isDashboard, location }: { isDashboard: boolean; location: { pathname: string } }) {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-border px-6 py-9 lg:block">
      <nav className="space-y-2">
        <Link
          to="/dashboard"
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
            isDashboard
              ? 'bg-surface text-text'
              : 'text-text-dim hover:bg-surface/60 hover:text-text'
          }`}
        >
          <span>Feature Flags</span>
          {isDashboard && (
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
          )}
        </Link>

        <Link
          to="/segments"
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
            location.pathname.startsWith('/segments')
              ? 'bg-surface text-text'
              : 'text-text-dim hover:bg-surface/60 hover:text-text'
          }`}
        >
          <span>Segments</span>
          {location.pathname.startsWith('/segments') && (
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
          )}
        </Link>
      </nav>

      <div className="my-9 border-t border-border" />

      <div className="px-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Environment</div>
        <div className="mt-5 flex items-center gap-3 text-[15px]">
          <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
          <span className="text-text-dim">Production</span>
        </div>
      </div>

      <div className="my-9 border-t border-border" />

      <div className="px-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Runtime</div>
        <div className="mt-5 space-y-4">
          <RuntimeItem label="API" value="ONLINE" />
          <RuntimeItem label="REDIS" value="READY" />
          <RuntimeItem label="STREAM" value="READY" />
        </div>
      </div>
    </aside>
  );
}

function RuntimeItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">{label}</span>
      <span className="font-mono text-[11px] font-medium text-success">{value}</span>
    </div>
  );
}

export default FlagDetail;
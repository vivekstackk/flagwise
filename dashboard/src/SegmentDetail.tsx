import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from './api';

interface SegmentCondition {
  attribute: string;
  operator: string;
  value: string | number | boolean | (string | number)[];
}

interface Segment {
  id: string;
  name: string;
  conditions: SegmentCondition[];
  createdAt: string;
  updatedAt: string;
}

function SegmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [segment, setSegment] = useState<Segment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [conditionsSaved, setConditionsSaved] = useState(true);
  const [savingConditions, setSavingConditions] = useState(false);

  useEffect(() => {
    fetchSegment();
  }, [id]);

  async function fetchSegment() {
    try {
      setLoading(true);
      const response = await apiFetch(`/segments/${id}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      setSegment(data);
      setConditions(data.conditions ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load segment');
    } finally {
      setLoading(false);
    }
  }

  function addCondition() {
    setConditions((prev) => [
      ...prev,
      { attribute: '', operator: 'equals', value: '' },
    ]);
    setConditionsSaved(false);
  }

  function updateCondition(index: number, changes: Partial<SegmentCondition>) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...changes } : c))
    );
    setConditionsSaved(false);
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
    setConditionsSaved(false);
  }

  async function handleSaveConditions() {
    if (!segment) return;
    setSavingConditions(true);
    setError(null);

    try {
      const response = await apiFetch(`/segments/${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const updated = await response.json();
      setSegment(updated);
      setConditions(updated.conditions ?? conditions);
      setConditionsSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conditions');
    } finally {
      setSavingConditions(false);
    }
  }

  async function handleDeleteSegment() {
    if (!segment) return;
    if (!confirm(`Delete segment "${segment.name}"? This cannot be undone.`)) return;

    try {
      const response = await apiFetch(`/segments/${segment.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      navigate('/segments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete segment');
    }
  }

  const isSegments = location.pathname.startsWith('/segments');

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <div className="flex min-h-[calc(100vh-74px)]">
          <Sidebar isSegments={isSegments} location={location} />
          <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
            <div className="border-y border-border py-8 text-[15px] text-text-dim">Loading segment…</div>
          </main>
        </div>
      </div>
    );
  }

  if (error && !segment) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <div className="flex min-h-[calc(100vh-74px)]">
          <Sidebar isSegments={isSegments} location={location} />
          <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[15px] text-danger">
              Error: {error}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!segment) return null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      <div className="flex min-h-[calc(100vh-74px)]">
        <Sidebar isSegments={isSegments} location={location} />

        <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-[1100px]">

            {/* Back link */}
            <Link
              to="/segments"
              className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim transition-colors hover:text-text"
            >
              ← Segments
            </Link>

            {/* Header */}
            <header className="mb-10 border-b border-border pb-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
                    Audience definition
                  </div>
                  <h1 className="font-mono text-[26px] font-semibold leading-none tracking-[-0.04em]">
                    {segment.name}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {!conditionsSaved && (
                    <button
                      onClick={handleSaveConditions}
                      disabled={savingConditions}
                      className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingConditions ? 'Saving…' : 'Save Changes'}
                    </button>
                  )}

                  <button
                    onClick={handleDeleteSegment}
                    className="rounded-full border border-danger/25 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger hover:text-white"
                  >
                    Delete Segment
                  </button>
                </div>
              </div>

              <div className="mt-3 font-mono text-[11px] text-text-dim">
                {segment.conditions.length} condition{segment.conditions.length !== 1 ? 's' : ''}
                <span className="mx-2 text-border">/</span>
                Updated {new Date(segment.updatedAt).toLocaleString()}
              </div>
            </header>

            {error && (
              <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[14px] text-danger">
                {error}
              </div>
            )}

            {/* Conditions */}
            <section className="rounded-2xl border border-border bg-surface/55 p-7">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold">Conditions</h2>
                <button
                  onClick={addCondition}
                  className="rounded-full border border-border px-4 py-2 text-sm text-text-dim transition-colors hover:border-primary hover:text-primary"
                >
                  + Add Condition
                </button>
              </div>

              {conditions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-5 py-14 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim">
                    No conditions
                  </div>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-text-dim">
                    Add a condition to define which users belong to this segment.
                  </p>
                  <button
                    onClick={addCondition}
                    className="mt-5 rounded-full border border-border px-4 py-2 text-sm text-text-dim transition-colors hover:border-primary hover:text-primary"
                  >
                    Add first condition
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div key={index} className="rounded-xl border border-border bg-bg p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-primary">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
                          Condition
                        </span>
                      </div>
                      <button
                        onClick={() => removeCondition(index)}
                        className="text-sm text-text-dim transition-colors hover:text-danger"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-4">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Attribute
                        </label>
                        <input
                          type="text"
                          value={condition.attribute}
                          onChange={(e) => updateCondition(index, { attribute: e.target.value })}
                          placeholder="plan"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Operator
                        </label>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          <option value="equals">equals</option>
                          <option value="notEquals">not equals</option>
                          <option value="in">in</option>
                          <option value="contains">contains</option>
                        </select>
                      </div>

                      <div className="lg:col-span-5">
                        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          Value
                        </label>
                        <input
                          type="text"
                          value={String(condition.value)}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="pro"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
                  {conditions.length} condition{conditions.length !== 1 ? 's' : ''} configured
                </div>

                <button
                  onClick={handleSaveConditions}
                  disabled={savingConditions || conditionsSaved}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
                    conditionsSaved && !savingConditions
                      ? 'bg-success/12 text-success'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {savingConditions ? 'Saving…' : conditionsSaved ? 'Saved ✓' : 'Save Conditions'}
                </button>
              </div>
            </section>

            {/* Metadata */}
            <section className="mt-5 grid rounded-2xl border border-border bg-surface/55 sm:grid-cols-3">
              <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim">Segment ID</div>
                <div className="mt-2 truncate font-mono text-[11px] text-text">{segment.id}</div>
              </div>
              <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim">Created</div>
                <div className="mt-2 text-xs text-text">{new Date(segment.createdAt).toLocaleString()}</div>
              </div>
              <div className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim">Evaluation</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Local
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim sm:flex-row sm:items-center sm:justify-between">
              <span>Segment / {segment.name}</span>
              <span>Real-time configuration</span>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

/* Shared layout components matching App.tsx, Segments.tsx, FlagDetail.tsx */

function Header() {
  return (
    <header className="flex h-[74px] items-center justify-between border-b border-border px-6 lg:px-10">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface">
          <span className="text-[21px] leading-none text-primary">⚑</span>
        </div>
        <div>
          <div className="text-[17px] font-semibold tracking-[-0.02em]">Flagwise</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Control plane</div>
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

function Sidebar({ isSegments, location }: { isSegments: boolean; location: { pathname: string } }) {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-border px-6 py-9 lg:block">
      <nav className="space-y-2">
        <Link
          to="/dashboard"
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
            location.pathname.startsWith('/flags')
              ? 'bg-surface text-text'
              : 'text-text-dim hover:bg-surface/60 hover:text-text'
          }`}
        >
          <span>Feature Flags</span>
          {location.pathname.startsWith('/flags') && (
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
          )}
        </Link>

        <Link
          to="/segments"
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
            isSegments
              ? 'bg-surface text-text'
              : 'text-text-dim hover:bg-surface/60 hover:text-text'
          }`}
        >
          <span>Segments</span>
          {isSegments && (
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

export default SegmentDetail;

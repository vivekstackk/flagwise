import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { apiFetch } from './api';

interface FeatureFlag {
  id: string;
  key: string;
  description?: string;
  enabled: boolean;
  rollout: { percentage: number; serveValue: boolean } | null;
  createdAt?: string;
  updatedAt?: string;
}

function App() {
  const location = useLocation();

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isDashboard =
    location.pathname === '/' ||
    location.pathname === '/dashboard';

  async function fetchFlags() {
    try {
      setLoading(true);

      const response = await apiFetch('/flags');

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      setFlags(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load feature flags'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFlags();
  }, []);

  async function handleCreateFlag(e: React.FormEvent) {
    e.preventDefault();

    const key = newKey.trim();

    if (!key) {
      setCreateError('Flag key is required.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await apiFetch('/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          description: newDescription.trim(),
          enabled: false,
          rolloutPercentage: 0,
        }),
      });

      if (response.status === 409) {
        const body = await response.json();

        setCreateError(
          body.error ??
            'A flag with that key already exists.'
        );

        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setNewKey('');
      setNewDescription('');
      setShowModal(false);

      await fetchFlags();
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Failed to create feature flag.'
      );
    } finally {
      setCreating(false);
    }
  }

  function openCreateModal() {
    setCreateError(null);
    setNewKey('');
    setNewDescription('');
    setShowModal(true);
  }

  async function handleToggle(flag: FeatureFlag) {
    try {
      const response = await apiFetch(`/flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const updated = await response.json();
      setFlags((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
    }
  }

  async function handleDelete(flag: FeatureFlag) {
    if (!confirm(`Delete flag "${flag.key}"? This cannot be undone.`)) return;

    try {
      const response = await apiFetch(`/flags/${flag.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">

      {/* TOP BAR */}
      <header className="flex h-[74px] items-center justify-between border-b border-border px-6 lg:px-10">

        <Link
          to="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface">
            <span className="text-[21px] leading-none text-primary">
              ⚑
            </span>
          </div>

          <div>
            <div className="text-[17px] font-semibold tracking-[-0.02em]">
              Flagwise
            </div>

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

      <div className="flex min-h-[calc(100vh-74px)]">

        {/* SIDEBAR */}
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

          {/* ENVIRONMENT */}
          <div className="px-4">

            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
              Environment
            </div>

            <div className="mt-5 flex items-center gap-3 text-[15px]">
              <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_12px_rgba(52,211,153,0.45)]" />

              <span className="text-text-dim">
                Production
              </span>
            </div>

          </div>

          <div className="my-9 border-t border-border" />

          {/* RUNTIME */}
          <div className="px-4">

            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
              Runtime
            </div>

            <div className="mt-5 space-y-4">
              <RuntimeItem label="API" value="ONLINE" />
              <RuntimeItem label="REDIS" value="READY" />
              <RuntimeItem label="STREAM" value="READY" />
            </div>

          </div>

        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1 px-6 py-10 lg:px-14 lg:py-12">

          <div className="mx-auto max-w-[1500px]">

            {/* HEADER */}
            <section className="flex flex-col gap-8 border-b border-border pb-9 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
                  Configuration
                </div>

                <h1 className="text-[40px] font-semibold leading-none tracking-[-0.045em] sm:text-[44px]">
                  Feature Flags
                </h1>

                <p className="mt-4 max-w-[680px] text-[16px] leading-7 text-text-dim">
                  Control releases, targeting and gradual
                  rollouts from one place.
                </p>

              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-13 shrink-0 items-center justify-center gap-3 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(59,130,246,0.28)]"
              >
                + New flag
                <span className="text-[18px]">
                  →
                </span>
              </button>

            </section>

            {/* MOBILE NAV */}
            <div className="flex gap-2 border-b border-border py-4 lg:hidden">

              <Link
                to="/dashboard"
                className={`rounded-lg px-4 py-2.5 text-[14px] ${
                  isDashboard
                    ? 'bg-surface text-text'
                    : 'text-text-dim'
                }`}
              >
                Feature Flags
              </Link>

              <Link
                to="/segments"
                className={`rounded-lg px-4 py-2.5 text-[14px] ${
                  location.pathname.startsWith('/segments')
                    ? 'bg-surface text-text'
                    : 'text-text-dim'
                }`}
              >
                Segments
              </Link>

            </div>

            {/* FLAGS */}
            <section className="pt-9">

              {loading && (
                <div className="border-y border-border py-8 text-[15px] text-text-dim">
                  Loading feature flags…
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[15px] text-danger">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>

                  <div className="space-y-4">

                    {flags.map((flag) => {

                      const rollout = flag.rollout?.percentage ?? null;

                      return (
                        <div
                          key={flag.id}
                          className="group rounded-2xl border border-border bg-surface/55 px-7 py-6 transition-all duration-200 hover:border-border hover:bg-surface"
                        >

                          <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[1.2fr_auto_0.5fr_0.6fr_auto]">

                            {/* FLAG INFO — only name links to detail */}
                            <div className="min-w-0">
                              <Link
                                to={`/flags/${flag.id}`}
                                className="truncate font-mono text-[17px] font-semibold text-text transition-colors hover:text-primary"
                              >
                                {flag.key}
                              </Link>

                              <div className="mt-1.5 text-[14px] leading-6 text-text-dim">
                                {flag.description || 'No description provided'}
                              </div>
                            </div>

                            {/* TOGGLE */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggle(flag)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                                  flag.enabled ? 'bg-success' : 'bg-surface-high'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                    flag.enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                                  }`}
                                />
                              </button>

                              <span
                                className={`text-[13px] font-medium ${
                                  flag.enabled ? 'text-success' : 'text-text-dim'
                                }`}
                              >
                                {flag.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>

                            {/* ROLLOUT */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                                Rollout
                              </span>
                              <span className="font-mono text-[14px] text-text">
                                {rollout !== null ? `${rollout}%` : '—'}
                              </span>
                            </div>

                            {/* UPDATED */}
                            <div className="text-[13px] text-text-dim">
                              {flag.updatedAt
                                ? new Date(flag.updatedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </div>

                            {/* ACTIONS */}
                            <div className="flex items-center gap-3">
                              <Link
                                to={`/flags/${flag.id}`}
                                className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-dim transition-colors hover:border-primary hover:text-primary"
                              >
                                Edit →
                              </Link>

                              <button
                                onClick={() => handleDelete(flag)}
                                className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-dim transition-colors hover:border-danger hover:text-danger"
                              >
                                Delete
                              </button>
                            </div>

                          </div>

                        </div>
                      );
                    })}

                    {flags.length === 0 && (

                      <div className="border-y border-border py-20 text-center">

                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                          No flags configured
                        </div>

                        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-text-dim">
                          Create your first feature flag
                          to control releases and
                          rollouts.
                        </p>

                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-7 rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-white"
                        >
                          Create your first flag →
                        </button>

                      </div>

                    )}

                  </div>

                  <div className="mt-9 flex items-center justify-between border-t border-border pt-5">

                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                      {flags.length}{' '}
                      {flags.length === 1
                        ? 'flag'
                        : 'flags'}{' '}
                      configured
                    </span>

                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                      Production / Live
                    </span>

                  </div>

                </>
              )}

            </section>

          </div>

        </main>

      </div>

      {/* CREATE FLAG MODAL */}
      {showModal && (

        <Modal
          title="Create Feature Flag"
          onClose={() => {
            if (!creating) {
              setShowModal(false);
            }
          }}
        >

          <form
            onSubmit={handleCreateFlag}
            className="space-y-6"
          >

            <div>

              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.15em] text-text-dim">
                Key
              </label>

              <input
                type="text"
                required
                value={newKey}
                onChange={(e) =>
                  setNewKey(e.target.value)
                }
                placeholder="new-checkout"
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 font-mono text-[15px] text-text placeholder:text-text-dim/50 focus:border-primary focus:outline-none"
              />

            </div>

            <div>

              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.15em] text-text-dim">
                Description
              </label>

              <input
                type="text"
                value={newDescription}
                onChange={(e) =>
                  setNewDescription(e.target.value)
                }
                placeholder="New checkout experience"
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-[15px] text-text placeholder:text-text-dim/50 focus:border-primary focus:outline-none"
              />

            </div>

            {createError && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] text-danger">
                {createError}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border pt-5">

              <button
                type="button"
                disabled={creating}
                onClick={() =>
                  setShowModal(false)
                }
                className="rounded-lg px-4 py-2.5 text-[14px] text-text-dim hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-primary px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating
                  ? 'Creating…'
                  : 'Create flag'}
              </button>

            </div>

          </form>

        </Modal>

      )}

    </div>
  );
}

function RuntimeItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5">

      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </span>

      <span className="font-mono text-[11px] font-medium text-success">
        {value}
      </span>

    </div>
  );
}

export default App;
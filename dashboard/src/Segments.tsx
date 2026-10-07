import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';
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

function Segments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] =
    useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  async function fetchSegments() {
    try {
      setLoading(true);

      const response = await apiFetch('/segments');

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      setSegments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load segments'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSegment(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const name = newName.trim();

    if (!name) {
      setCreateError('Segment name is required.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await apiFetch('/segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          conditions: [],
        }),
      });

      if (response.status === 409) {
        const body = await response.json();

        setCreateError(
          body.error ??
            'A segment with that name already exists.'
        );

        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setNewName('');
      setShowCreateModal(false);

      await fetchSegments();
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Failed to create segment'
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(segment: Segment) {
    const confirmed = window.confirm(
      `Delete segment "${segment.name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/segments/${segment.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setSegments((prev) =>
        prev.filter((item) => item.id !== segment.id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete segment'
      );
    }
  }

  function openCreateModal() {
    setCreateError(null);
    setNewName('');
    setShowCreateModal(true);
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
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim hover:text-text"
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
              className="flex items-center rounded-xl px-4 py-3.5 text-[15px] text-text-dim transition-colors hover:bg-surface/60 hover:text-text"
            >
              Feature Flags
            </Link>

            <Link
              to="/segments"
              className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-[15px] font-medium text-text"
            >
              <span>Segments</span>

              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
            </Link>
          </nav>

          <div className="my-9 border-t border-border" />

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
                  Audience
                </div>

                <h1 className="text-[40px] font-semibold leading-none tracking-[-0.045em] sm:text-[44px]">
                  Segments
                </h1>

                <p className="mt-4 max-w-[680px] text-[16px] leading-7 text-text-dim">
                  Define reusable audiences for targeting and
                  controlled feature releases.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-13 shrink-0 items-center justify-center gap-3 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(59,130,246,0.28)]"
              >
                + New segment
                <span className="text-[18px]">→</span>
              </button>
            </section>

            {/* MOBILE NAV */}
            <div className="flex gap-2 border-b border-border py-4 lg:hidden">
              <Link
                to="/dashboard"
                className="rounded-lg px-4 py-2.5 text-[14px] text-text-dim"
              >
                Feature Flags
              </Link>

              <Link
                to="/segments"
                className="rounded-lg bg-surface px-4 py-2.5 text-[14px] text-text"
              >
                Segments
              </Link>
            </div>

            {/* CONTENT */}
            <section className="pt-9">
              {loading && (
                <div className="border-y border-border py-8 text-[15px] text-text-dim">
                  Loading segments…
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-[15px] text-danger">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface/25">
                    {/* TABLE HEADER */}
                    <div className="hidden grid-cols-[1.5fr_0.8fr_1.2fr_90px] border-b border-border px-7 py-4 md:grid">
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                        Name
                      </span>

                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                        Conditions
                      </span>

                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                        Updated
                      </span>

                      <span />
                    </div>

                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="grid grid-cols-1 gap-5 border-b border-border px-7 py-6 last:border-b-0 transition-colors hover:bg-surface/50 md:grid-cols-[1.5fr_0.8fr_1.2fr_90px] md:items-center"
                      >
                        <Link
                          to={`/segments/${segment.id}`}
                          className="min-w-0"
                        >
                          <div className="truncate font-mono text-[16px] font-semibold text-text transition-colors hover:text-primary">
                            {segment.name}
                          </div>

                          <div className="mt-1.5 text-[14px] text-text-dim md:hidden">
                            Reusable audience definition
                          </div>
                        </Link>

                        <div>
                          <span className="font-mono text-[15px] text-text-dim">
                            {segment.conditions.length}
                          </span>

                          <span className="ml-2 text-[14px] text-text-dim md:hidden">
                            condition
                            {segment.conditions.length === 1
                              ? ''
                              : 's'}
                          </span>
                        </div>

                        <span className="text-[14px] text-text-dim">
                          {new Date(
                            segment.updatedAt
                          ).toLocaleString()}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(segment)
                          }
                          className="justify-self-start text-[14px] text-text-dim transition-colors hover:text-danger md:justify-self-end"
                        >
                          Delete
                        </button>
                      </div>
                    ))}

                    {segments.length === 0 && (
                      <div className="px-7 py-24 text-center">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                          No segments configured
                        </div>

                        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-text-dim">
                          Create a reusable audience for
                          your targeting rules.
                        </p>

                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-7 rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-white"
                        >
                          Create your first segment →
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
                      {segments.length}{' '}
                      {segments.length === 1
                        ? 'segment'
                        : 'segments'}{' '}
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

      {/* CREATE SEGMENT MODAL */}
      {showCreateModal && (
        <Modal
          title="Create Segment"
          onClose={() => {
            if (!creating) {
              setShowCreateModal(false);
            }
          }}
        >
          <form
            onSubmit={handleCreateSegment}
            className="space-y-6"
          >
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.15em] text-text-dim">
                Name
              </label>

              <input
                type="text"
                required
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                placeholder="beta-testers"
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 font-mono text-[15px] text-text placeholder:text-text-dim/50 focus:border-primary focus:outline-none"
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
                  setShowCreateModal(false)
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
                  : 'Create segment'}
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

export default Segments;
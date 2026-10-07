import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function FlagwiseMark() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="32"
        height="32"
        rx="9"
        fill="#15171C"
        stroke="#2B2E35"
      />

      {/* Flag pole */}
      <path
        d="M12 9.5V24.5"
        stroke="#4D8DFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Flag */}
      <path
        d="M12 10.2C16.2 8.1 19.5 11.8 23 10.2V17.2C19.5 18.8 16.2 15.1 12 17.2V10.2Z"
        fill="#4D8DFF"
      />

      <path
        d="M14.8 12.4C17.5 12.2 19.2 14 21.1 13.5"
        stroke="#0B0C0F"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 7.5H11.5M8 4L11.5 7.5L8 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Landing() {
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        hero.style.setProperty('--mouse-x', `${x * 24}px`);
        hero.style.setProperty('--mouse-y', `${y * 16}px`);
      });
    };

    const handlePointerLeave = () => {
      hero.style.setProperty('--mouse-x', '0px');
      hero.style.setProperty('--mouse-y', '0px');
    };

    hero.addEventListener('pointermove', handlePointerMove);
    hero.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.fw-reveal');

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fw-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090B] text-[#F1F2F4]">

      {/* =========================================================
          NAVIGATION
      ========================================================= */}

      <header className="relative z-50 border-b border-white/[0.075] fw-nav">
        <nav className="flex h-[72px] w-full items-center justify-between px-7 sm:px-8 lg:px-10">

          {/* Brand */}

          <Link
            to="/"
            className="group flex items-center gap-3 fw-logo"
            aria-label="Flagwise home"
          >
            <FlagwiseMark />

            <span className="text-[15px] font-semibold tracking-[-0.025em]">
              Flagwise
            </span>
          </Link>

          {/* Navigation */}

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">

            <a
              href="#product"
              className="fw-nav-link text-[13px] text-[#8A8E97]"
            >
              Product
            </a>

            <a
              href="#how-it-works"
              className="fw-nav-link text-[13px] text-[#8A8E97]"
            >
              How it works
            </a>

            <a
              href="#developers"
              className="fw-nav-link text-[13px] text-[#8A8E97]"
            >
              Developers
            </a>

            <a
              href="https://github.com/vivekstackk/feature-flag-platform"
              target="_blank"
              rel="noreferrer"
              className="fw-nav-link text-[13px] text-[#8A8E97]"
            >
              GitHub
            </a>
          </div>

          {/* CTA */}

          <Link
            to="/dashboard"
            className="group flex items-center gap-2 rounded-full bg-[#3F7FF5] px-5 py-2.5 text-[13px] font-semibold text-white fw-dashboard-button"
          >
            Open dashboard

            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              <Arrow />
            </span>
          </Link>
        </nav>
      </header>

      <main>

        {/* =========================================================
            HERO
        ========================================================= */}

        <section ref={heroRef} className="relative min-h-[calc(100vh-72px)] overflow-hidden fw-hero">

          {/* Atmospheric blue field */}

          <div
            className="pointer-events-none absolute left-[34%] top-[-8%] h-[780px] w-[900px] opacity-80 fw-glow"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(46,77,205,0.42) 0%, rgba(35,58,170,0.24) 30%, rgba(16,25,74,0.10) 55%, transparent 73%)',
              filter: 'blur(18px)',
            }}
          />

          {/* Secondary blue haze */}

          <div
            className="pointer-events-none absolute right-[-12%] top-[30%] h-[520px] w-[650px] opacity-30 fw-glow-secondary"
            style={{
              background:
                'radial-gradient(circle, rgba(63,127,245,0.28), transparent 68%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Fine vertical atmosphere */}

          <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
            <div
              className="h-full w-full fw-grid"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.8) 1px, transparent 1px)',
                backgroundSize: '160px 100%',
              }}
            />
          </div>

          <div className="relative mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-10">

            <div className="flex min-h-[calc(100vh-72px)] flex-col justify-center pb-24 pt-24 lg:pb-28">

              {/* Small positioning label */}

              <div className="mb-8 flex items-center gap-3 fw-eyebrow">
                <span className="h-[6px] w-[6px] rounded-full bg-[#45D49A]" />

                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#858993]">
                  Feature management / Open source
                </span>
              </div>

              {/* Hero typography */}

              <h1 className="max-w-[1180px] fw-title text-[clamp(4rem,9.3vw,9rem)] font-medium leading-[0.88] tracking-[-0.075em]">

                <span className="block">
                  Ship features
                </span>

                <span className="block text-[#4D8DFF]">
                  without the fear.
                </span>

              </h1>

              {/* Description */}

              <div className="mt-10 flex flex-col gap-8 fw-description lg:flex-row lg:items-end lg:justify-between">

                <p className="max-w-[590px] text-[17px] leading-[1.65] tracking-[-0.015em] text-[#8D919A] sm:text-[19px]">
                  Feature flags for teams that want control over
                  releases, targeting and experimentation — without
                  handing their application to another platform.
                </p>

                <div className="flex items-center gap-3 fw-actions">

                  <Link
                    to="/dashboard"
                    className="group flex items-center gap-3 rounded-full bg-[#F2F3F5] px-6 py-3.5 text-[13px] font-semibold text-[#101114] transition-all hover:bg-white"
                  >
                    Start shipping

                    <span className="transition-transform group-hover:translate-x-0.5">
                      <Arrow />
                    </span>
                  </Link>

                  <a
                    href="#product"
                    className="rounded-full border border-white/[0.1] px-6 py-3.5 text-[13px] font-medium text-[#A0A4AD] transition-colors hover:border-white/[0.2] hover:text-white"
                  >
                    Explore
                  </a>

                </div>
              </div>

              {/* Scroll marker */}

              <div className="mt-20 flex items-center gap-3 fw-scroll text-[9px] uppercase tracking-[0.18em] text-[#555A64] lg:mt-24">
                <span className="h-px w-8 bg-[#34373E]" />
                Scroll to explore
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            PRODUCT INTRO
        ========================================================= */}

        <section
          id="product"
          className="fw-reveal border-t border-white/[0.07] bg-[#0B0C0F]"
        >
          <div className="mx-auto max-w-[1380px] px-6 py-28 sm:px-8 lg:px-10 lg:py-36">

            <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4D8DFF]">
                  The control layer
                </p>

                <h2 className="mt-5 max-w-[520px] text-[clamp(2.7rem,5vw,5rem)] font-medium leading-[0.95] tracking-[-0.06em]">
                  Your releases.
                  <br />
                  Your rules.
                  <br />
                  Your control.
                </h2>
              </div>

              <div className="flex flex-col justify-end">

                <p className="max-w-[650px] text-[18px] leading-[1.7] text-[#858993]">
                  Flagwise sits between your code and your users.
                  Define a feature once, decide who gets it, and
                  change the rollout without rebuilding your
                  application.
                </p>

                <div className="mt-10 grid max-w-[650px] grid-cols-2 gap-x-10 gap-y-8 border-t border-white/[0.08] pt-8 sm:grid-cols-4">

                  <div>
                    <p className="text-2xl font-medium tracking-[-0.04em]">
                      01
                    </p>
                    <p className="mt-2 text-xs text-[#666B74]">
                      Define
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-medium tracking-[-0.04em]">
                      02
                    </p>
                    <p className="mt-2 text-xs text-[#666B74]">
                      Target
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-medium tracking-[-0.04em]">
                      03
                    </p>
                    <p className="mt-2 text-xs text-[#666B74]">
                      Roll out
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-medium tracking-[-0.04em]">
                      04
                    </p>
                    <p className="mt-2 text-xs text-[#666B74]">
                      Measure
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            PRODUCT SCREEN
        ========================================================= */}

        <section
          id="how-it-works"
          className="fw-reveal overflow-hidden bg-[#0B0C0F] pb-28 sm:pb-36"
        >
          <div className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-10">

            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#111318] shadow-[0_40px_120px_rgba(0,0,0,0.4)] fw-product-card">

              {/* Glow */}

              <div className="pointer-events-none absolute right-[-150px] top-[-200px] h-[600px] w-[600px] rounded-full bg-[#3159D8]/10 blur-[100px]" />

              {/* Fake app chrome */}

              <div className="relative flex h-14 items-center justify-between border-b border-white/[0.06] px-5 sm:px-7">

                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#EF6464]" />
                  <span className="h-2 w-2 rounded-full bg-[#DDAA45]" />
                  <span className="h-2 w-2 rounded-full bg-[#3AC88D]" />
                </div>

                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#626771]">
                  Flagwise / Console
                </div>

                <div className="w-10" />
              </div>

              {/* App */}

              <div className="relative grid min-h-[550px] lg:grid-cols-[230px_1fr]">

                {/* Sidebar */}

                <aside className="hidden border-r border-white/[0.06] p-5 lg:block">

                  <div className="flex items-center gap-2.5">
                    <FlagwiseMark />

                    <span className="text-sm font-semibold">
                      Flagwise
                    </span>
                  </div>

                  <div className="mt-10 space-y-1">

                    <div className="rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs text-white">
                      Feature Flags
                    </div>

                    <div className="px-3 py-2.5 text-xs text-[#6D727C]">
                      Segments
                    </div>

                    <div className="px-3 py-2.5 text-xs text-[#6D727C]">
                      Experiments
                    </div>
                  </div>

                  <div className="mt-10 border-t border-white/[0.06] pt-5">

                    <p className="px-3 text-[9px] uppercase tracking-[0.16em] text-[#565B64]">
                      Environment
                    </p>

                    <div className="mt-3 flex items-center gap-2 px-3 text-xs text-[#A2A6AE]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3AC88D]" />
                      Production
                    </div>
                  </div>
                </aside>

                {/* Main dashboard */}

                <div className="p-5 sm:p-8 lg:p-10">

                  <div className="flex items-end justify-between border-b border-white/[0.06] pb-6">

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[#60656E]">
                        Configuration
                      </p>

                      <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                        Feature Flags
                      </h3>
                    </div>

                    <div className="hidden rounded-full bg-[#3F7FF5] px-4 py-2 text-xs font-semibold text-white sm:block">
                      + New flag
                    </div>
                  </div>

                  <div className="mt-7 space-y-3">

                    <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr] items-center rounded-2xl border border-white/[0.055] bg-[#15171C] px-5 py-5">

                      <div>
                        <p className="font-mono text-xs text-white">
                          new-checkout
                        </p>

                        <p className="mt-1 text-[10px] text-[#626771]">
                          New checkout experience
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#3AC88D]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3AC88D]" />
                        Enabled
                      </div>

                      <div className="text-right font-mono text-xs text-[#7D828C]">
                        72%
                      </div>
                    </div>

                    <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr] items-center rounded-2xl border border-white/[0.055] bg-[#15171C] px-5 py-5">

                      <div>
                        <p className="font-mono text-xs text-white">
                          smart-search
                        </p>

                        <p className="mt-1 text-[10px] text-[#626771]">
                          Search ranking experiment
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#3AC88D]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3AC88D]" />
                        Enabled
                      </div>

                      <div className="text-right font-mono text-xs text-[#7D828C]">
                        40%
                      </div>
                    </div>

                    <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr] items-center rounded-2xl border border-white/[0.055] bg-[#15171C] px-5 py-5">

                      <div>
                        <p className="font-mono text-xs text-white">
                          new-onboarding
                        </p>

                        <p className="mt-1 text-[10px] text-[#626771]">
                          Updated onboarding flow
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#676C75]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#555A63]" />
                        Disabled
                      </div>

                      <div className="text-right font-mono text-xs text-[#626771]">
                        —
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FEATURES
        ========================================================= */}

        <section
          id="developers"
          className="fw-reveal border-t border-white/[0.07] bg-[#08090B]"
        >
          <div className="mx-auto max-w-[1380px] px-6 py-28 sm:px-8 lg:px-10 lg:py-36">

            <div className="max-w-[750px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4D8DFF]">
                Built for engineers
              </p>

              <h2 className="mt-5 text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.92] tracking-[-0.065em]">
                Small surface.
                <br />
                Serious control.
              </h2>
            </div>

            <div className="mt-20 grid border-t border-white/[0.08] md:grid-cols-2 lg:grid-cols-4">

              {[
                {
                  number: '01',
                  title: 'Targeting',
                  text: 'Target users using attributes, rules and reusable segments.',
                },
                {
                  number: '02',
                  title: 'Rollouts',
                  text: 'Gradually expose features using deterministic percentage rollouts.',
                },
                {
                  number: '03',
                  title: 'Experiments',
                  text: 'Create controlled variants and measure how they perform.',
                },
                {
                  number: '04',
                  title: 'Realtime',
                  text: 'Update configuration without requiring an application redeploy.',
                },
              ].map((feature) => (
                <div
                  key={feature.number}
                  className="border-b border-white/[0.08] px-0 py-8 md:px-7 md:first:pl-0 lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0"
                >
                  <span className="font-mono text-[10px] text-[#555A64]">
                    {feature.number}
                  </span>

                  <h3 className="mt-12 text-xl font-medium tracking-[-0.025em]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 max-w-[250px] text-sm leading-6 text-[#747983]">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            DEVELOPER SECTION
        ========================================================= */}

        <section className="fw-reveal border-t border-white/[0.07] bg-[#0B0C0F]">

          <div className="mx-auto grid max-w-[1380px] gap-16 px-6 py-28 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-36">

            <div className="flex flex-col justify-between">

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4D8DFF]">
                  Developer first
                </p>

                <h2 className="mt-5 max-w-[580px] text-[clamp(3rem,5vw,5.5rem)] font-medium leading-[0.94] tracking-[-0.06em]">
                  Three lines
                  <br />
                  to evaluate
                  <br />
                  a flag.
                </h2>
              </div>

              <p className="mt-10 max-w-[500px] text-sm leading-7 text-[#777C85] lg:mt-0">
                Keep feature evaluation close to your application.
                The SDK handles configuration locally so your
                application doesn't need to make a network request
                for every check.
              </p>
            </div>

            {/* Code */}

            <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#111318]">

              <div className="flex h-12 items-center justify-between border-b border-white/[0.06] px-5">

                <div className="flex gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#EF6464]" />
                  <span className="h-2 w-2 rounded-full bg-[#DDAA45]" />
                  <span className="h-2 w-2 rounded-full bg-[#3AC88D]" />
                </div>

                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#5E636C]">
                  evaluate.ts
                </span>
              </div>

              <pre className="overflow-x-auto p-7 font-mono text-[12px] leading-[2.1] text-[#C6CAD1] sm:p-9 sm:text-[13px]">
                <code>
                  <span className="text-[#646A74]">
                    {'// local evaluation'}
                  </span>
                  {'\n\n'}

                  <span className="text-[#4D8DFF]">
                    import
                  </span>{' '}
                  {'{ FeatureFlagClient } '}
                  <span className="text-[#4D8DFF]">
                    from
                  </span>{' '}
                  <span className="text-[#39C98B]">
                    '"./sdk"'
                  </span>
                  {';\n\n'}

                  <span className="text-[#4D8DFF]">
                    const
                  </span>{' '}
                  client ={' '}
                  <span className="text-[#4D8DFF]">
                    new
                  </span>{' '}
                  FeatureFlagClient();
                  {'\n\n'}

                  <span className="text-[#4D8DFF]">
                    const
                  </span>{' '}
                  enabled = client.
                  <span className="text-[#E0AD48]">
                    evaluate
                  </span>
                  {'(\n'}

                  {'  '}
                  <span className="text-[#39C98B]">
                    '"new-checkout"'
                  </span>
                  {',\n'}

                  {'  {'}
                  {'\n'}

                  {'    userId: '}
                  <span className="text-[#39C98B]">
                    '"user-42"'
                  </span>
                  {',\n'}

                  {'    attributes: {'}
                  {'\n'}

                  {'      plan: '}
                  <span className="text-[#39C98B]">
                    '"pro"'
                  </span>
                  {'\n'}

                  {'    }'}
                  {'\n'}

                  {'  }'}
                  {'\n'}

                  {');'}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================= */}

        <section className="relative overflow-hidden border-t border-white/[0.07]">

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 65% 45%, rgba(45,70,190,0.24), transparent 55%)',
            }}
          />

          <div className="relative mx-auto max-w-[1380px] px-6 py-32 sm:px-8 lg:px-10 lg:py-44">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4D8DFF]">
              Start building
            </p>

            <h2 className="mt-6 max-w-[1050px] text-[clamp(3.5rem,8vw,8rem)] font-medium leading-[0.9] tracking-[-0.075em]">
              Ship the feature.
              <br />
              Keep the control.
            </h2>

            <div className="mt-10 flex flex-wrap items-center gap-4">

              <Link
                to="/dashboard"
                className="group flex items-center gap-3 rounded-full bg-[#F2F3F5] px-6 py-3.5 text-[13px] font-semibold text-[#101114] transition-colors hover:bg-white"
              >
                Open dashboard

                <span className="transition-transform group-hover:translate-x-0.5">
                  <Arrow />
                </span>
              </Link>

              <a
                href="https://github.com/vivekstackk/feature-flag-platform"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/[0.1] px-6 py-3.5 text-[13px] font-medium text-[#A0A4AD] hover:border-white/[0.2] hover:text-white"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="border-t border-white/[0.07] bg-[#08090B]">

        <div className="mx-auto flex max-w-[1380px] flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">

          <div className="flex items-center gap-3">
            <FlagwiseMark />

            <div>
              <p className="text-sm font-semibold">
                Flagwise
              </p>

              <p className="mt-0.5 text-[10px] text-[#555A64]">
                Feature management infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#666B74]">

            <a
              href="https://github.com/vivekstackk/feature-flag-platform"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>

            <Link
              to="/dashboard"
              className="hover:text-white"
            >
              Dashboard
            </Link>

            <span>
              Open source
            </span>

          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
// TerminalBoard.jsx — v3 minimal
// Stripped: ANSI rainbow colors, traffic lights, ASCII vote bars,
// statusline, clock, extra blinking cursors, EOL prompt, duplicate subtitle.
// Kept: monospace table, rank dots (top 3), single prompt line,
// filter chips, row hover + thumbnail expand, dark/light toggle.

const { useState, useEffect } = React;

function TermWordmark({ size = 14 }) {
  return (
    <a href="#" style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 2,
      fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: 600,
      letterSpacing: '-.01em', textDecoration: 'none', color: 'var(--term-fg)',
    }}>
      <span style={{ color: 'var(--accent-terracotta)' }}>&gt;</span>
      <span>claude-hunt</span>
      <span style={{ color: 'var(--accent-terracotta)', animation: 'blink 1s steps(1) infinite' }}>_</span>
    </a>
  );
}

function Row({ project, rank, voted, onVote, isMobile }) {
  const [hover, setHover] = useState(false);
  const rankColor = rank === 1 ? 'var(--rank-1)' : rank === 2 ? 'var(--rank-2)' : rank === 3 ? 'var(--rank-3)' : 'transparent';
  const showDot = rank <= 3;

  if (isMobile) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 52px 1fr auto', gap: 12,
        padding: '14px 14px', borderTop: '1px solid var(--term-border-soft)',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {showDot && <span style={{ width: 5, height: 5, borderRadius: 999, background: rankColor, flexShrink: 0 }} />}
          <span style={{ color: showDot ? 'var(--term-fg)' : 'var(--term-dim)' }}>
            {String(rank).padStart(2, '0')}
          </span>
        </div>
        <div style={{
          height: 34, aspectRatio: '16/10',
          background: `linear-gradient(${project.thumb})`,
          boxShadow: 'inset 0 0 0 1px var(--term-border)',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.title}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--term-dim)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {project.author} · {project.submittedAt}
          </div>
        </div>
        <button
          onClick={() => onVote(project.id)}
          style={{
            height: 54, minWidth: 52, padding: '0 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            background: voted ? 'var(--term-fg)' : 'transparent',
            color: voted ? 'var(--term-bg)' : 'var(--term-fg)',
            border: `1px solid ${voted ? 'var(--term-fg)' : 'var(--term-border)'}`,
            borderRadius: 0, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <i className={voted ? 'ri-arrow-up-fill' : 'ri-arrow-up-line'} style={{ fontSize: 14 }} />
          <span>{project.votes + (voted && !project.voted ? 1 : 0) - (!voted && project.voted ? 1 : 0)}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '52px 72px minmax(0, 1fr) 130px 80px',
        alignItems: 'center', gap: 16, padding: '14px 20px',
        borderTop: '1px solid var(--term-border-soft)',
        background: hover ? 'var(--term-surface-2)' : 'transparent',
        transition: 'background .1s',
      }}
    >
      {/* Rank */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showDot
          ? <span style={{ width: 6, height: 6, borderRadius: 999, background: rankColor, flexShrink: 0 }} />
          : <span style={{ width: 6, flexShrink: 0 }} />
        }
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
          color: showDot ? 'var(--term-fg)' : 'var(--term-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(rank).padStart(2, '0')}
        </span>
      </div>

      {/* Thumbnail — subtle expand on hover */}
      <div style={{
        height: 40, aspectRatio: '16/10',
        background: `linear-gradient(${project.thumb})`,
        boxShadow: 'inset 0 0 0 1px var(--term-border)',
        transform: hover ? 'scale(1.08)' : 'scale(1)',
        transformOrigin: 'left center',
        transition: 'transform .2s cubic-bezier(.2,.8,.2,1)',
      }} />

      {/* Title + tagline */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <a href="#" style={{
            fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 13,
            color: 'var(--term-fg)', textDecoration: 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {project.title}
          </a>
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--term-dim)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {project.tagline}
        </div>
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          width: 20, height: 20, borderRadius: 999,
          background: 'var(--term-surface-2)', color: 'var(--term-fg)',
          boxShadow: 'inset 0 0 0 1px var(--term-border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
        }}>
          {project.author.charAt(0)}
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--term-fg)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {project.author}
        </span>
      </div>

      {/* Vote */}
      <button
        onClick={() => onVote(project.id)}
        style={{
          justifySelf: 'end',
          height: 32, padding: '0 12px',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: voted ? 'var(--term-fg)' : 'transparent',
          color: voted ? 'var(--term-bg)' : 'var(--term-fg)',
          border: `1px solid ${voted ? 'var(--term-fg)' : 'var(--term-border)'}`,
          borderRadius: 0, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <i className={voted ? 'ri-arrow-up-fill' : 'ri-arrow-up-line'} style={{ fontSize: 13 }} />
        <span>{project.votes + (voted && !project.voted ? 1 : 0) - (!voted && project.voted ? 1 : 0)}</span>
      </button>
    </div>
  );
}

function TerminalBoard() {
  const [filter, setFilter] = useState('all');
  const [votedIds, setVotedIds] = useState(() => new Set(SAMPLE_PROJECTS.filter(p => p.voted).map(p => p.id)));
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);

  useEffect(() => {
    document.body.classList.toggle('light', !dark);
  }, [dark]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filtered = SAMPLE_PROJECTS.filter(p => {
    if (filter === 'all') return true;
    return p.cohort === filter;
  }).sort((a, b) => b.votes - a.votes);

  const onVote = (id) => {
    setVotedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--term-bg)', color: 'var(--term-fg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — matches current site: wordmark + account avatar (theme inside menu) */}
      <header style={{
        borderBottom: '1px solid var(--term-border)',
        background: 'var(--term-bg)',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <TermWordmark size={isMobile ? 13 : 14} />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="계정 메뉴 열기"
              style={{
                width: 32, height: 32, borderRadius: 999, border: 'none',
                background: 'var(--term-surface-2)', color: 'var(--term-fg)',
                fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              테
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 180,
                background: 'var(--term-surface)', border: '1px solid var(--term-border)',
                padding: 4, zIndex: 20,
                boxShadow: '0 4px 12px rgb(0 0 0 / .2)',
                fontFamily: 'var(--font-sans)', fontSize: 12,
              }}>
                <div style={{ padding: '8px 8px 4px', fontSize: 11, color: 'var(--term-dim)', fontWeight: 500 }}>테마</div>
                {[['light', 'ri-sun-line', '라이트'], ['dark', 'ri-moon-line', '다크']].map(([v, icon, lbl]) => {
                  const active = (v === 'dark') === dark;
                  return (
                    <button key={v} onClick={() => setDark(v === 'dark')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px',
                        border: 'none', background: active ? 'var(--term-surface-2)' : 'transparent',
                        color: 'var(--term-fg)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                      }}>
                      <i className={icon} /><span>{lbl}</span>
                      {active && <i className="ri-check-line" style={{ marginLeft: 'auto' }} />}
                    </button>
                  );
                })}
                <div style={{ height: 1, background: 'var(--term-border-soft)', margin: '4px 0' }} />
                <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', color: 'var(--term-fg)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <i className="ri-settings-3-line" /><span>설정</span>
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', color: 'var(--term-fg)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <i className="ri-logout-box-r-line" /><span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{
        flex: 1, width: '100%',
        maxWidth: 1120, margin: '0 auto',
        padding: isMobile ? '24px 16px 48px' : '40px 24px 64px',
        display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 28,
      }}>
        {/* Page intro — prompt reflects filter, h1 + submit button */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--term-dim)' }}>
            <span style={{ color: 'var(--accent-terracotta)' }}>$ </span>
            claude-hunt ls{filter === 'c1' ? ' --cohort=1' : filter === 'c2' ? ' --cohort=2' : ''} --sort=votes
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{
                margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 500,
                fontSize: isMobile ? 22 : 26, letterSpacing: '-.015em', lineHeight: 1.2,
                color: 'var(--term-fg)',
              }}>
                프로젝트 보드
              </h1>
              <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--term-dim)' }}>
                {filtered.length}개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요.
              </p>
            </div>
            <button style={{
              height: 36, padding: '0 16px',
              background: 'var(--term-fg)', color: 'var(--term-bg)',
              border: 'none', cursor: 'pointer', borderRadius: 0,
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              flexShrink: 0,
            }}>
              <i className="ri-add-line" style={{ fontSize: 14 }} />
              <span>프로젝트 제출</span>
            </button>
          </div>
        </section>

        {/* Filter chips */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? 4 : 0,
        }}>
          {[
            ['all', '모든 클래스'],
            ['c1', 'Cohort 1'],
            ['c2', 'Cohort 2'],
          ].map(([id, lbl]) => {
            const count = id === 'all'
              ? SAMPLE_PROJECTS.length
              : SAMPLE_PROJECTS.filter(p => p.cohort === id).length;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  padding: '6px 10px', border: '1px solid var(--term-border)',
                  background: filter === id ? 'var(--term-fg)' : 'transparent',
                  color: filter === id ? 'var(--term-bg)' : 'var(--term-fg)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', borderRadius: 0, whiteSpace: 'nowrap',
                }}
              >
                {lbl}<span style={{ opacity: .5, marginLeft: 6 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <section style={{ border: '1px solid var(--term-border)' }}>
          {!isMobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '52px 72px minmax(0, 1fr) 130px 80px',
              alignItems: 'center', gap: 16, padding: '10px 20px',
              background: 'var(--term-surface-2)',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--term-muted)', letterSpacing: '.08em', textTransform: 'uppercase',
            }}>
              <div>RANK</div>
              <div>PREVIEW</div>
              <div>NAME</div>
              <div>AUTHOR</div>
              <div style={{ justifySelf: 'end' }}>VOTES</div>
            </div>
          )}
          {filtered.map((p, i) => (
            <Row
              key={p.id}
              project={p}
              rank={i + 1}
              voted={votedIds.has(p.id)}
              onVote={onVote}
              isMobile={isMobile}
            />
          ))}
        </section>
      </main>

      {/* Footer — matches current site */}
      <footer style={{ borderTop: '1px solid var(--term-border)' }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
          gap: 16, padding: '24px', color: 'var(--term-dim)', fontSize: 12,
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>© 2026 claude-hunt</span>
            <nav style={{ display: 'flex', gap: 12 }}>
              <a href="#terms" style={{ color: 'inherit' }}>이용약관</a>
              <a href="#privacy" style={{ color: 'inherit' }}>개인정보 처리방침</a>
            </nav>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <a href="https://github.com/toy-crane/claude-hunt" style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="ri-github-fill" />GitHub
            </a>
            <a href="#feedback" style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="ri-chat-3-line" />Feedback
            </a>
            <span style={{ fontSize: 11 }}>
              Built by <a href="#" style={{ color: 'var(--term-fg)' }}>toycrane</a>
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

window.TerminalBoard = TerminalBoard;

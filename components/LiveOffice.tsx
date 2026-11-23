"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  COMPANY, DEPTS, ENTRANCE_MAT, QUICK_COMMANDS, ROOMS, SCHEDULE, WORLD, type Prop, type Room,
} from "@/lib/office-config";
import { ACTIVITY_LABEL, OfficeSim, fmtTime, type Agent, type RoomStatus } from "@/lib/office-sim";

const SPEEDS = [1, 2, 4, 8];
const SKIP_SPEED = 30;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STATUS_LABEL: Record<RoomStatus, string> = {
  waiting: "대기", working: "작업 중", approval: "결재 대기", blocked: "막힘", done: "완료",
};

type Cam = { x: number; y: number; s: number };

export default function LiveOffice() {
  const [sim, setSim] = useState<OfficeSim | null>(null);
  const [, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [skipping, setSkipping] = useState(false);
  const [compact, setCompact] = useState(false);
  const [follow, setFollow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const agentEls = useRef(new Map<string, HTMLDivElement>());
  const cam = useRef<Cam>({ x: 0, y: 0, s: 1 });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const live = useRef({ playing, speed, skipping, follow, selected });
  live.current = { playing, speed, skipping, follow, selected };

  /* 클라이언트에서만 시뮬레이션 생성 (Math.random → SSR 불일치 방지) */
  useEffect(() => { setSim(new OfficeSim(1)); }, []);

  const applyCam = useCallback(() => {
    const st = stageRef.current;
    if (st) st.style.transform = `translate(${cam.current.x}px, ${cam.current.y}px) scale(${cam.current.s})`;
  }, []);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { clientWidth: w, clientHeight: h } = vp;
    const s = Math.min(w / WORLD.w, h / WORLD.h) * 0.96;
    cam.current = { s, x: (w - WORLD.w * s) / 2, y: (h - WORLD.h * s) / 2 };
    applyCam();
  }, [applyCam]);

  const centerOn = useCallback((a: Agent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const s = Math.max(cam.current.s, 1.15);
    cam.current = { s, x: vp.clientWidth / 2 - a.x * s, y: vp.clientHeight / 2 - (a.y - 14) * s };
    applyCam();
  }, [applyCam]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const c = cam.current;
    const ox = px ?? vp.clientWidth / 2, oy = py ?? vp.clientHeight / 2;
    const s = Math.min(2.6, Math.max(0.35, c.s * factor));
    const k = s / c.s;
    cam.current = { s, x: ox - (ox - c.x) * k, y: oy - (oy - c.y) * k };
    applyCam();
  }, [applyCam]);

  useLayoutEffect(() => { if (sim) fit(); }, [sim, fit]);

  /* 메인 루프: 시뮬레이션은 rAF, React 리렌더는 5Hz */
  useEffect(() => {
    if (!sim) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const L = live.current;
      if (L.playing && !sim.over) {
        sim.step(dt * (L.skipping ? SKIP_SPEED : L.speed));
        if (L.skipping && sim.notable) setSkipping(false);
      }
      sim.notable = false;
      for (const a of sim.agents) {
        const el = agentEls.current.get(a.def.id);
        if (!el) continue;
        el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
        el.style.zIndex = String(Math.round(a.y) + 10);
      }
      if (L.follow && L.selected) {
        const a = sim.agent(L.selected);
        const vp = viewportRef.current;
        if (a && vp && a.onstage) {
          const c = cam.current;
          const tx = vp.clientWidth / 2 - a.x * c.s, ty = vp.clientHeight / 2 - (a.y - 14) * c.s;
          c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12;
          applyCam();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = window.setInterval(() => setFrame((n) => n + 1), 200);
    return () => { cancelAnimationFrame(raf); window.clearInterval(iv); };
  }, [sim, applyCam]);

  /* 휠 줌 (passive: false 필요) */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [sim, zoomAt]);

  /* 콘솔 자동 스크롤 */
  const logLen = sim?.consoleLog.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLen]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".world-hud")) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.current.x, cy: cam.current.y, moved: false };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 4) { d.moved = true; setFollow(false); }
      if (d.moved) { cam.current.x = d.cx + dx; cam.current.y = d.cy + dy; applyCam(); }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setTimeout(() => { drag.current = null; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!sim) {
    return <main className="page"><p className="dash-note">오피스 여는 중…</p></main>;
  }

  /* ── 파생 값 ─────────────────────────────── */
  const tot = sim.totals();
  const now = sim.time;
  const sel = selected ? sim.agent(selected) : undefined;
  const selDept = sel ? sim.dept(sel.def.dept) : undefined;
  const pending = sim.approvals[0];
  const occupancy = (roomId: string) => sim.agents.filter((a) => a.onstage && a.room === roomId && !a.path.length).length;

  const select = (id: string, center = false) => {
    if (drag.current?.moved) return;
    setSelected((cur) => (cur === id && !center ? null : id));
    const a = sim.agent(id);
    if (center && a?.onstage) centerOn(a);
  };
  const send = (text: string) => { sim.command(text); setInput(""); setFrame((n) => n + 1); };
  const restart = (day: number) => {
    agentEls.current.clear();
    setSelected(null);
    setFollow(false);
    setSkipping(false);
    setPlaying(true);
    setSim(new OfficeSim(day));
  };

  const roomClass = (r: Room) => {
    if (r.kind === "dept") {
      const st = sim.roomStatus(r.id);
      return `${st}${st === "approval" || st === "blocked" ? " hot" : ""}`;
    }
    return "";
  };
  const roomDot = (r: Room): RoomStatus => (r.kind === "dept" ? sim.roomStatus(r.id) : occupancy(r.id) ? "working" : "waiting");
  const roomInfo = (r: Room) => {
    if (r.kind !== "dept") { const n = occupancy(r.id); return n ? `· ${n}명` : ""; }
    const d = sim.dept(r.id)!;
    if (d.status === "done") return "· 오늘 완료 🎉";
    if (d.status === "approval") return "· 결재 대기";
    if (d.status === "blocked") return `· 막힘`;
    return `· ${sim.task(d)} ${Math.round(d.progress)}%`;
  };

  return (
    <main className="page">
      {/* ── HERO ── */}
      <header className="live-hero">
        <div>
          <span className="eyebrow">LIVE OFFICE</span>
          <h1>{COMPANY.name}</h1>
          <p>{COMPANY.tagline}</p>
        </div>
        <div className="live-clock" aria-live="off">
          <span>DAY {sim.day} · {DAYS[(sim.day - 1) % 7]}</span>
          <b>{fmtTime(now)}</b>
          <small>{sim.phase()}</small>
        </div>
      </header>

      {/* ── CONTROL BAR ── */}
      <section className="live-bar" aria-label="시뮬레이션 컨트롤">
        {sim.over ? (
          <button className="btn-ghost on" onClick={() => restart(sim.day + 1)}>🌅 다음 날</button>
        ) : (
          <button className={`btn-ghost ${playing ? "on" : ""}`} onClick={() => { setPlaying((p) => !p); setSkipping(false); }}>
            {playing ? "⏸ 일시정지" : "▶ 재생"}
          </button>
        )}
        <button className="btn-ghost" onClick={() => restart(1)}>↺ 처음부터</button>
        <div className="speed-wrap">
          <span className="speed-label" title="1x = 현실 1초에 사내 1분이 흐릅니다. ⏭ 는 다음 이벤트(결재·일정·막힘)까지 빨리 감기">
            배속
          </span>
          <div className="speed-group" role="group" aria-label="배속">
            {SPEEDS.map((s) => (
              <button key={s} className={!skipping && speed === s ? "on" : ""} onClick={() => { setSpeed(s); setSkipping(false); }}>
                {s}x
              </button>
            ))}
            <button className={`skip ${skipping ? "on" : ""}`} disabled={!playing || sim.over} onClick={() => setSkipping((v) => !v)}>
              ⏭ 다음 이벤트
            </button>
          </div>
        </div>
        <div className="live-progress">
          <span>오늘의 업무 진척도 {Math.round(tot.pct)}% · {tot.done}/{tot.total}건 완료</span>
          <i><b style={{ width: `${tot.pct}%` }} /></i>
        </div>
        <div className="live-counts">
          <span className="lc on-duty">출근 {tot.onDuty}/{sim.agents.length}</span>
          <span className="lc working">작업 {tot.working}</span>
          <span className="lc done">완료 {tot.done}</span>
          <span className="lc blocked">막힘 {tot.blocked}</span>
        </div>
      </section>

      <div className="live-grid">
        {/* ── WORLD ── */}
        <section className="world-frame">
          <div className="world-viewport" ref={viewportRef} onPointerDown={onPointerDown}>
            <div className={`world-stage ${compact ? "compact" : ""}`} ref={stageRef} style={{ width: WORLD.w, height: WORLD.h }}>
              <div className="world-floor" />

              {ROOMS.map((r) => (
                <div key={r.id} className={`rm rm-${r.kind} ${roomClass(r)}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
                  {r.props.map((p, i) => <PropEl key={i} p={p} />)}
                  <i className="rm-door" style={{ left: r.doorX - 11, top: r.door === "top" ? -3 : r.h - 5 }} />
                  <div className="rm-head">
                    <i className={`rm-dot ${roomDot(r)}`} />
                    {r.name} <span style={{ fontWeight: 700 }}>{roomInfo(r)}</span>
                  </div>
                  <span className="rm-code">{r.code}</span>
                </div>
              ))}

              <div className="entrance-mat" style={{ left: ENTRANCE_MAT.x, top: ENTRANCE_MAT.y, width: ENTRANCE_MAT.w, height: ENTRANCE_MAT.h }}>
                ENTRANCE
              </div>

              {sim.agents.map((a) => {
                const d = sim.dept(a.def.dept);
                const working = sim.isWorking(a);
                const bubbleOn = !!a.bubble;
                const style = {
                  "--shirt": a.def.shirt, "--skin": a.def.skin, "--hair": a.def.hair,
                  "--accent": d?.def.color ?? "var(--yellow)",
                } as CSSProperties;
                return (
                  <div
                    key={a.def.id}
                    ref={(el) => { if (el) agentEls.current.set(a.def.id, el); else agentEls.current.delete(a.def.id); }}
                    className={[
                      "ag", a.def.ceo ? "r-ceo" : a.def.lead ? "r-lead" : "r-staff",
                      `f-${a.facing}`, `a-${a.anim}`,
                      selected === a.def.id ? "selected" : "", a.onstage ? "" : "offstage",
                    ].join(" ")}
                    style={style}
                    onClick={() => select(a.def.id)}
                    title={`${a.def.name} (${a.def.role})`}
                  >
                    <div className={`ag-bubble ${bubbleOn ? "on" : ""} ${a.bubble?.think ? "think" : ""}`}>{a.bubble?.text ?? ""}</div>
                    <div className="ag-bar" style={{ opacity: working && !bubbleOn ? 1 : 0 }}>
                      <i style={{ width: `${d?.progress ?? 0}%` }} />
                    </div>
                    <div className="ag-body">
                      <i className="p-shadow" />
                      <i className="p-leg l" /><i className="p-leg r" />
                      <i className="p-torso" />
                      <i className="p-arm l" /><i className="p-arm r" />
                      <i className="p-head"><i className="p-eye l" /><i className="p-eye r" /></i>
                      <i className="p-hair" />
                    </div>
                    <div className="ag-tag">
                      {a.def.name}
                      {(a.def.lead || a.def.ceo) && <em>{a.def.ceo ? COMPANY.ceoTitle : "팀장"}</em>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="world-hud">
              <button onClick={() => zoomAt(1 / 1.2)} aria-label="축소">－</button>
              <button onClick={() => zoomAt(1.2)} aria-label="확대">＋</button>
              <button onClick={() => { setFollow(false); fit(); }}>맞춤</button>
              <button className={follow ? "on" : ""} disabled={!sel} onClick={() => setFollow((f) => !f)}>따라가기</button>
              <button className={compact ? "on" : ""} onClick={() => setCompact((c) => !c)}>간략</button>
            </div>
            <div className="world-hint">드래그로 이동 · 휠로 확대 · 직원을 클릭하면 프로필</div>
          </div>
        </section>

        {/* ── RAIL ── */}
        <aside className="live-rail">
          {/* 대표 지시창 */}
          <section className="win console-card">
            <div className="win-bar"><span className="dots"><i /><i /><i /></span><span className="title">대표 지시창</span><span className="score">CEO</span></div>
            <div className="win-body console-body">
              <div className="console-status">
                <span className="lc on-duty">결재 {sim.approvals.length}</span>
                <span className="lc blocked">막힘 {tot.blocked}</span>
                <span className="lc done">{sim.phase()}</span>
              </div>
              <div className="console-log" ref={logRef}>
                {sim.consoleLog.map((l) => (
                  <div key={l.id} className={`console-line ${l.side}`}>
                    <b>{l.who}</b>
                    <p>{l.text}</p>
                    <small>{fmtTime(l.t)}</small>
                  </div>
                ))}
              </div>
              <div className="console-quick">
                {QUICK_COMMANDS.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
              </div>
              <form className="console-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="예) 디자인팀 진행 상황 보고" aria-label="지시 입력" />
                <button type="submit">지시</button>
              </form>
            </div>
          </section>

          {/* 결재함 */}
          <section className="win rail-card">
            <div className="win-bar">
              <span className="dots"><i /><i /><i /></span><span className="title">결재함</span>
              <span className={`todo-tab ${sim.approvals.length ? "urgent" : ""}`}>{sim.approvals.length}건</span>
            </div>
            <div className={`win-body approval-body ${pending ? "pending" : ""}`}>
              {pending ? (
                <>
                  <span className="score blink">결재 대기 {sim.approvals.length}건</span>
                  <h3>📝 {pending.title}</h3>
                  <p>{sim.dept(pending.deptId)?.def.name} · {fmtTime(pending.at)} 요청</p>
                  <div className="profile-actions">
                    <button className="btn" onClick={() => { sim.approve(pending.id); setFrame((n) => n + 1); }}>승인</button>
                    <button className="btn alt" onClick={() => { sim.reject(pending.id); setFrame((n) => n + 1); }}>반려</button>
                  </div>
                </>
              ) : (
                <p className="empty">결재할 문서가 없어요. 팀들이 열일 중 ✨</p>
              )}
            </div>
          </section>

          {/* 직원 프로필 */}
          {sel && (
            <section className="win rail-card employee-profile">
              <div className="win-bar"><span className="dots"><i /><i /><i /></span><span className="title">직원 프로필</span>
                <button className="todo-tab" onClick={() => { setSelected(null); setFollow(false); }} aria-label="닫기">✕</button>
              </div>
              <div className="win-body">
                <h2>{sel.def.name} <small>{selDept?.def.name ?? "경영"} · {sel.def.role}</small></h2>
                <p className="meta">상태 <b>{ACTIVITY_LABEL[sel.activity]}</b>{sel.path.length ? " (이동 중)" : ""}</p>
                {selDept && (
                  <>
                    <p className="meta">현재 업무 <b>{sim.task(selDept)}</b> · {STATUS_LABEL[selDept.status]}</p>
                    <span className="profile-progress"><i style={{ width: `${selDept.progress}%` }} /></span>
                  </>
                )}
                {!sel.def.ceo && (
                  <div className="profile-actions" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => { sim.callAgent(sel); setFrame((n) => n + 1); }}>대표실 호출</button>
                    <button className="btn alt" onClick={() => { sim.coffeeAgent(sel); setFrame((n) => n + 1); }}>커피 보내기</button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 실시간 피드 */}
          <section className="win rail-card">
            <div className="win-bar"><span className="dots"><i /><i /><i /></span><span className="title">실시간 피드</span></div>
            <div className="win-body feed-body">
              <div className="feed-now">{sim.headline}</div>
              <ul className="feed-list">
                {sim.feed.slice(0, 30).map((f) => (
                  <li key={f.id} className={f.tone}>
                    <b>{fmtTime(f.t)}</b><span>{f.icon}</span><span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 직원 명단 */}
          <section className="win rail-card">
            <div className="win-bar"><span className="dots"><i /><i /><i /></span><span className="title">직원 명단</span></div>
            <div className="win-body roster-body">
              {[{ id: null as string | null, name: "경영", color: "var(--yellow)" }, ...DEPTS.map((d) => ({ id: d.id as string | null, name: d.name, color: d.color }))].map((g) => {
                const people = sim.agents.filter((a) => a.def.dept === g.id);
                return (
                  <div key={g.name} className="roster-dept">
                    <p>
                      <i className="rm-dot" style={{ background: g.color }} />
                      <b>{g.name}</b>
                      {g.id && <span style={{ color: "var(--ink-faint)" }}>· {STATUS_LABEL[sim.roomStatus(g.id)]}</span>}
                    </p>
                    <div className="roster-chips">
                      {people.map((a) => (
                        <button key={a.def.id} className={`roster-chip ${selected === a.def.id ? "on" : ""}`} onClick={() => select(a.def.id, true)}>
                          <i style={{ background: g.color, borderColor: "var(--ink)" }} />
                          {a.def.name}
                          <small>{ACTIVITY_LABEL[a.activity]}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 오늘 일정 */}
          <section className="win rail-card">
            <div className="win-bar"><span className="dots"><i /><i /><i /></span><span className="title">오늘 일정</span></div>
            <div className="win-body">
              <ul className="flow">
                {SCHEDULE.map((ev) => (
                  <li key={ev.id} className={`flow-row ${now >= ev.until ? "past" : now >= ev.at ? "now" : ""}`}>
                    <b>{fmtTime(ev.at)}</b><span>{ev.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </aside>
      </div>

      <p className="dash-note">💡 <code>lib/office-config.ts</code> 만 고치면 방 · 부서 · 직원 · 업무 · 일정이 전부 바뀝니다.</p>
    </main>
  );
}

function PropEl({ p }: { p: Prop }) {
  const style: CSSProperties = { left: p.x, top: p.y, width: p.w, height: p.h };
  return (
    <div className={`pr pr-${p.kind}`} style={style}>
      {(p.kind === "desk" || p.kind === "ceo-desk") && <i className="pr-monitor" />}
      {p.label}
    </div>
  );
}

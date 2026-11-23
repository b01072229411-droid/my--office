/* ═══════════════════════════════════════════════════════════
   OFFICE SIM — 시간/이동/업무/결재 시뮬레이션 (UI 독립)
   1 사내분(sim minute) = 1x 배속에서 현실 1초
   ═══════════════════════════════════════════════════════════ */
import {
  CORRIDOR, DAY, DEPTS, ENTRANCE, LINES, ROOMS, SCHEDULE, STAFF,
  type Dept, type Facing, type Pt, type Room, type StaffDef,
} from "./office-config";

export type Activity =
  | "off" | "commute" | "desk" | "coffee" | "meeting" | "allhands"
  | "errand" | "visit" | "called" | "lunch" | "leave" | "gone";

export type Anim = "idle" | "walk" | "type" | "talk" | "sit";
export type RoomStatus = "waiting" | "working" | "approval" | "blocked" | "done";

export type Agent = {
  def: StaffDef;
  x: number; y: number;
  path: Pt[];
  room: string | null;         // 목적지 방 (이동 완료 시 현재 방)
  spotKey: string | null;
  restFacing: Facing;
  facing: Facing;
  anim: Anim;
  activity: Activity;
  until: number;
  onstage: boolean;
  arriveAt: number;
  leaveAt: number;
  lunchAt: number;
  returnAt: number;
  bubble: { text: string; think: boolean; until: number } | null;
  nextChatter: number;         // real ms
};

export type DeptState = {
  def: Dept;
  taskIndex: number;
  progress: number;            // 0..100
  status: RoomStatus;
  blockedReason: string;
  blockedUntil: number;
  blockedThisTask: boolean;
  boostUntil: number;
  doneToday: number;
};

export type Approval = { id: number; deptId: string; title: string; at: number };
export type FeedTone = "pink" | "mint" | "lav" | "yellow";
export type FeedItem = { id: number; t: number; icon: string; text: string; tone: FeedTone };
export type ConsoleLine = { id: number; t: number; who: string; text: string; side: "ceo" | "staff" };

const WALK = 95;               // px / sim-min
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const roomById = new Map(ROOMS.map((r) => [r.id, r]));

export const fmtTime = (m: number) => {
  const mm = Math.floor(m) % (24 * 60);
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  off: "출근 전", commute: "출근 중", desk: "자리", coffee: "커피", meeting: "회의",
  allhands: "전체회의", errand: "외근(사내)", visit: "순회", called: "대표실",
  lunch: "점심", leave: "퇴근 중", gone: "퇴근",
};

export class OfficeSim {
  day = 1;
  time = DAY.start;
  over = false;
  agents: Agent[] = [];
  depts: DeptState[] = [];
  approvals: Approval[] = [];
  feed: FeedItem[] = [];
  consoleLog: ConsoleLine[] = [];
  headline = "오피스 문이 열렸습니다";
  /** 스킵 모드가 멈춰야 하는 이벤트가 발생하면 true */
  notable = false;
  private seq = 1;
  private occupied = new Map<string, string>();
  private firedEvents = new Set<string>();
  private allhandsUntil = 0;
  private replies: { at: number; who: string; text: string }[] = [];

  constructor(day = 1) {
    this.day = day;
    this.depts = DEPTS.map((def) => ({
      def, taskIndex: 0, progress: 0, status: "working", blockedReason: "",
      blockedUntil: 0, blockedThisTask: false, boostUntil: 0, doneToday: 0,
    }));
    this.agents = STAFF.map((def) => ({
      def, x: ENTRANCE.x, y: ENTRANCE.y, path: [], room: null, spotKey: null,
      restFacing: "down", facing: "up", anim: "idle", activity: "off", until: 0, onstage: false,
      arriveAt: def.ceo ? DAY.start + 18 : DAY.start + 4 + rand(0, 36),
      leaveAt: def.ceo ? DAY.leave + 22 : DAY.leave + rand(0, 20),
      lunchAt: DAY.lunchStart + rand(0, 5),
      returnAt: DAY.lunchEnd - 2 + rand(0, 10),
      bubble: null, nextChatter: 0,
    }));
    this.log("🚪", `DAY ${day} — ${fmtTime(this.time)} 사무실 오픈`, "yellow");
    this.say(STAFF[0].name, "오늘도 잘 부탁해요! 아래에서 지시를 내려보세요.", "staff", "시스템");
  }

  /* ── 조회 헬퍼 ─────────────────────────────── */
  dept(id: string | null) { return this.depts.find((d) => d.def.id === id); }
  agent(id: string) { return this.agents.find((a) => a.def.id === id); }
  members(deptId: string) { return this.agents.filter((a) => a.def.dept === deptId); }
  task(d: DeptState) { return d.def.tasks[d.taskIndex] ?? "모든 업무 완료"; }
  isWorking(a: Agent) {
    const d = this.dept(a.def.dept);
    return !!d && a.activity === "desk" && a.path.length === 0 && a.onstage && d.status === "working";
  }
  roomStatus(roomId: string): RoomStatus {
    const d = this.depts.find((x) => x.def.id === roomId);
    if (!d) return "waiting";
    if (d.status === "working" && !this.members(d.def.id).some((a) => this.isWorking(a))) return "waiting";
    return d.status;
  }
  totals() {
    const onDuty = this.agents.filter((a) => a.onstage || a.activity === "lunch").length;
    const working = this.agents.filter((a) => this.isWorking(a)).length;
    const done = this.depts.reduce((s, d) => s + d.doneToday, 0);
    const blocked = this.depts.filter((d) => d.status === "blocked").length;
    const all = this.depts.reduce((s, d) => s + d.def.tasks.length, 0);
    const prog = this.depts.reduce((s, d) => s + d.doneToday + (d.status === "done" ? 0 : d.progress / 100), 0);
    return { onDuty, working, done, blocked, total: all, pct: Math.min(100, (prog / all) * 100) };
  }
  phase() {
    const m = this.time;
    if (this.over) return "퇴근 완료";
    if (m < DAY.workStart) return "출근 시간";
    if (m >= DAY.lunchStart && m < DAY.lunchEnd) return "점심시간";
    if (m >= DAY.leave) return "퇴근 시간";
    if (this.allhandsUntil > m) return "전체 회의 중";
    return "근무 중";
  }

  /* ── 기록 ──────────────────────────────────── */
  log(icon: string, text: string, tone: FeedTone = "pink") {
    this.feed.unshift({ id: this.seq++, t: this.time, icon, text, tone });
    if (this.feed.length > 80) this.feed.pop();
    this.headline = `${icon} ${text}`;
  }
  say(who: string, text: string, side: "ceo" | "staff" = "staff", label?: string) {
    this.consoleLog.push({ id: this.seq++, t: this.time, who: label ?? who, text, side });
    if (this.consoleLog.length > 60) this.consoleLog.shift();
  }
  bubble(a: Agent, text: string, think = false, ms = 2600) {
    a.bubble = { text, think, until: performance.now() + ms };
  }

  /* ── 이동 ──────────────────────────────────── */
  private releaseSpot(a: Agent) {
    if (a.spotKey) this.occupied.delete(a.spotKey);
    a.spotKey = null;
  }
  private claimSpot(room: Room, a: Agent, prefer?: number) {
    const order = prefer !== undefined ? [prefer, ...room.spots.keys()] : [...room.spots.keys()];
    for (const i of order) {
      const key = `${room.id}:${i}`;
      if (!this.occupied.has(key) || this.occupied.get(key) === a.def.id) {
        this.releaseSpot(a);
        this.occupied.set(key, a.def.id);
        a.spotKey = key;
        return room.spots[i];
      }
    }
    // 자리가 없으면 방 안 아무 데나
    this.releaseSpot(a);
    return { x: rand(30, room.w - 30), y: room.h - 24, f: "up" as Facing };
  }
  private doorPts(r: Room) {
    const x = r.x + r.doorX;
    const edgeY = r.door === "top" ? r.y : r.y + r.h;
    const inY = r.door === "top" ? r.y + 18 : r.y + r.h - 18;
    const corY = r.door === "top" ? (r.y > CORRIDOR.h2 ? CORRIDOR.h2 : CORRIDOR.h1) : CORRIDOR.h1;
    return { inside: { x, y: inY }, edge: { x, y: edgeY }, out: { x, y: corY } };
  }
  private roomAt(p: Pt) {
    return ROOMS.find((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) ?? null;
  }
  /** 현재 위치 → 복도 진입점까지의 경로 */
  private exitPath(a: Agent): { pts: Pt[]; from: Pt; roomId: string | null } {
    const p = { x: a.x, y: a.y };
    const r = this.roomAt(p);
    if (r) {
      const d = this.doorPts(r);
      return { pts: [d.inside, d.edge, d.out], from: d.out, roomId: r.id };
    }
    if (Math.abs(p.x - CORRIDOR.spineX) < 4) return { pts: [], from: p, roomId: null };
    const ys = [CORRIDOR.h1, CORRIDOR.h2];
    const cy = ys.reduce((best, y) => (Math.abs(y - p.y) < Math.abs(best - p.y) ? y : best), ys[0]);
    const snap = { x: p.x, y: cy };
    return { pts: [snap], from: snap, roomId: null };
  }
  private corridor(from: Pt, to: Pt): Pt[] {
    if (Math.abs(from.y - to.y) < 1) return [to];
    return [{ x: CORRIDOR.spineX, y: from.y }, { x: CORRIDOR.spineX, y: to.y }, to];
  }
  goRoom(a: Agent, roomId: string, preferSpot?: number) {
    const room = roomById.get(roomId);
    if (!room) return;
    if (!a.onstage) { a.onstage = true; a.x = ENTRANCE.x; a.y = ENTRANCE.y; }
    const spot = this.claimSpot(room, a, preferSpot);
    const target = { x: room.x + spot.x, y: room.y + spot.y };
    a.restFacing = spot.f;
    const here = this.roomAt({ x: a.x, y: a.y });
    if (here?.id === roomId) {
      a.path = [target];
    } else {
      const ex = this.exitPath(a);
      const d = this.doorPts(room);
      a.path = [...ex.pts, ...this.corridor(ex.from, d.out), d.edge, d.inside, target];
    }
    a.room = roomId;
  }
  goEntrance(a: Agent) {
    this.releaseSpot(a);
    const ex = this.exitPath(a);
    a.path = [...ex.pts, ...this.corridor(ex.from, ENTRANCE)];
    a.room = null;
  }
  deskIndex(a: Agent) {
    if (a.def.ceo) return 0;
    return this.members(a.def.dept!).indexOf(a);
  }
  goDesk(a: Agent) {
    a.activity = "desk";
    if (a.def.ceo) this.goRoom(a, "ceo", 0);
    else this.goRoom(a, a.def.dept!, this.deskIndex(a));
  }
  private send(a: Agent, act: Activity, roomId: string, mins: number) {
    if (!a.onstage || a.activity === "leave" || a.activity === "gone") return false;
    a.activity = act;
    a.until = this.time + mins;
    this.goRoom(a, roomId);
    return true;
  }

  /* ── 결재 / 명령 ──────────────────────────── */
  approve(id: number) {
    const ap = this.approvals.find((x) => x.id === id);
    if (!ap) return;
    this.approvals = this.approvals.filter((x) => x.id !== id);
    const d = this.dept(ap.deptId)!;
    d.doneToday++;
    d.taskIndex++;
    d.progress = 0;
    d.blockedThisTask = false;
    const lead = this.members(d.def.id).find((m) => m.def.lead);
    if (d.taskIndex >= d.def.tasks.length) {
      d.status = "done";
      this.log("🎉", `${d.def.name} 오늘 업무 전부 완료!`, "mint");
    } else {
      d.status = "working";
      this.log("✅", `'${ap.title}' 승인 → 다음: ${this.task(d)}`, "mint");
    }
    if (lead) { this.bubble(lead, "감사합니다! 🙌"); this.say(lead.def.name, `승인 감사합니다! ${d.status === "done" ? "오늘 업무 마무리했어요." : `다음은 '${this.task(d)}' 진행할게요.`}`); }
  }
  reject(id: number) {
    const ap = this.approvals.find((x) => x.id === id);
    if (!ap) return;
    this.approvals = this.approvals.filter((x) => x.id !== id);
    const d = this.dept(ap.deptId)!;
    d.status = "working";
    d.progress = 62;
    this.log("↩️", `'${ap.title}' 반려 — ${d.def.name} 보완 작업`, "lav");
    const lead = this.members(d.def.id).find((m) => m.def.lead);
    if (lead) { this.bubble(lead, "보완하겠습니다…", true); this.say(lead.def.name, "피드백 반영해서 다시 올리겠습니다!"); }
  }
  unblock(d: DeptState, byCeo: boolean) {
    if (d.status !== "blocked") return false;
    d.status = "working";
    d.boostUntil = byCeo ? this.time + 40 : d.boostUntil;
    this.log("🛠", `${d.def.name} 이슈 해결${byCeo ? " (대표 지원)" : ""}`, "mint");
    return true;
  }
  callAgent(a: Agent) {
    if (a.def.ceo) return;
    if (this.send(a, "called", "ceo", 12)) {
      this.log("📞", `${a.def.name} 대표실 호출`, "yellow");
      this.bubble(a, "부르셨어요?");
    }
  }
  coffeeAgent(a: Agent) {
    if (this.send(a, "coffee", "lounge", 10)) { this.bubble(a, "감사합니다 ☕"); this.log("☕", `${a.def.name} 커피 휴식`, "yellow"); }
  }

  command(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const ceo = STAFF[0];
    this.say(ceo.name, text, "ceo", "대표");
    const ceoAgent = this.agent(ceo.id)!;
    if (ceoAgent.onstage) this.bubble(ceoAgent, text.length > 14 ? text.slice(0, 14) + "…" : text);
    const target = this.depts.find((d) => [d.def.name, ...(d.def.aliases ?? [])].some((n) => text.includes(n)));
    const reply = (who: string, msg: string, delay = 700) => this.replies.push({ at: performance.now() + delay, who, text: msg });
    const leadOf = (d: DeptState) => this.members(d.def.id).find((m) => m.def.lead)!;

    if (/승인|결재/.test(text) && this.approvals.length) {
      const ap = this.approvals[0];
      this.approve(ap.id);
      return;
    }
    if (/회의|집합|모여/.test(text)) {
      const crew = target ? [...this.members(target.def.id), ceoAgent] : this.agents;
      let n = 0;
      crew.forEach((a) => { if (this.send(a, "allhands", "meeting", 20)) n++; });
      if (!target) this.allhandsUntil = this.time + 20;
      this.log("📣", `${target ? target.def.name : "전원"} 회의실 집합 (${n}명)`, "yellow");
      reply(target ? leadOf(target).def.name : pick(this.agents.slice(1)).def.name, "회의실로 이동합니다!");
      return;
    }
    if (/커피|휴식|쉬어|간식/.test(text)) {
      const crew = target ? this.members(target.def.id) : this.agents.filter((a) => !a.def.ceo);
      let n = 0;
      crew.forEach((a) => { if (this.send(a, "coffee", "lounge", rand(8, 14))) n++; });
      this.log("☕", `${target ? target.def.name : "전 직원"} 커피 타임 (${n}명)`, "yellow");
      reply(pick(crew).def.name, "와 감사합니다 대표님 ☕");
      return;
    }
    if (/보고|진행|현황|상황/.test(text)) {
      const list = target ? [target] : this.depts;
      list.forEach((d, i) => {
        const st = d.status === "done" ? "오늘 업무 완료 🎉"
          : d.status === "approval" ? `'${this.task(d)}' 결재 대기 중`
          : d.status === "blocked" ? `막힘: ${d.blockedReason}`
          : `'${this.task(d)}' ${Math.round(d.progress)}% 진행 중`;
        reply(leadOf(d).def.name, `[${d.def.name}] ${st} (${d.doneToday}/${d.def.tasks.length})`, 600 + i * 450);
      });
      return;
    }
    if (/지원|해결|도와|막힌/.test(text)) {
      const list = target ? [target] : this.depts.filter((d) => d.status === "blocked");
      const solved = list.filter((d) => this.unblock(d, true));
      if (solved.length) solved.forEach((d, i) => reply(leadOf(d).def.name, "덕분에 풀렸어요! 다시 달립니다 🏃", 600 + i * 400));
      else reply(pick(this.agents.slice(1)).def.name, "지금은 막힌 곳이 없어요 👍");
      return;
    }
    if (/집중|서둘|빨리|부스트|화이팅/.test(text)) {
      const list = target ? [target] : this.depts;
      list.forEach((d) => { d.boostUntil = this.time + 60; });
      this.log("🔥", `${target ? target.def.name : "전 부서"} 집중 모드 60분`, "pink");
      reply(target ? leadOf(target).def.name : pick(this.agents.slice(1)).def.name, "집중 모드 들어갑니다 🔥");
      return;
    }
    if (/야근/.test(text)) {
      reply(pick(this.agents.slice(1)).def.name, "정시 퇴근 문화 최고예요 🥹");
      return;
    }
    reply(target ? leadOf(target).def.name : pick(this.agents.slice(1)).def.name, pick(LINES.ack));
  }

  /* ── 메인 스텝 ────────────────────────────── */
  step(dtMin: number) {
    if (this.over) return;
    const now = performance.now();
    const prev = this.time;
    this.time += dtMin;
    const m = this.time;

    // 지연 답장
    this.replies = this.replies.filter((r) => {
      if (r.at > now) return true;
      this.say(r.who, r.text);
      const a = this.agents.find((x) => x.def.name === r.who);
      if (a?.onstage) this.bubble(a, r.text.length > 16 ? r.text.slice(0, 16) + "…" : r.text);
      return false;
    });

    // 일정 이벤트
    for (const ev of SCHEDULE) {
      if (prev < ev.at && m >= ev.at && !this.firedEvents.has(ev.id)) {
        this.firedEvents.add(ev.id);
        this.notable = true;
        this.log("🗓", `${fmtTime(ev.at)} ${ev.label}`, "lav");
        if (ev.who === "leads") {
          this.agents
            .filter((a) => a.def.lead || a.def.ceo)
            .forEach((a) => this.send(a, "meeting", "meeting", ev.until - ev.at));
        }
      }
    }

    for (const a of this.agents) this.think(a, dtMin, m);
    for (const a of this.agents) this.move(a, dtMin);

    // 업무 진척
    for (const d of this.depts) {
      if (d.status === "blocked" && m >= d.blockedUntil) this.unblock(d, false);
      if (d.status !== "working") continue;
      const workers = this.members(d.def.id).filter((a) => this.isWorking(a)).length;
      if (!workers) continue;
      const boost = d.boostUntil > m ? 1.6 : 1;
      d.progress += dtMin * 0.36 * workers * boost;
      if (!d.blockedThisTask && d.progress > 25 && d.progress < 85 && Math.random() < dtMin / 380) {
        d.blockedThisTask = true;
        d.status = "blocked";
        d.blockedReason = pick(d.def.blockers);
        d.blockedUntil = m + 70;
        this.notable = true;
        this.log("🚧", `${d.def.name} 막힘: ${d.blockedReason}`, "lav");
        const lead = this.members(d.def.id).find((x) => x.def.lead);
        if (lead) { this.bubble(lead, "대표님 도움이…!", false, 3200); this.say(lead.def.name, `${d.blockedReason} 때문에 막혔어요. 지원 부탁드립니다!`); }
      }
      if (d.progress >= 100) {
        d.progress = 100;
        d.status = "approval";
        const title = this.task(d);
        this.approvals.push({ id: this.seq++, deptId: d.def.id, title, at: m });
        this.notable = true;
        this.log("📝", `${d.def.name} '${title}' 결재 요청`, "pink");
        const lead = this.members(d.def.id).find((x) => x.def.lead);
        if (lead) this.say(lead.def.name, `대표님, '${title}' 결재 부탁드립니다!`);
      }
    }

    // 애니메이션 / 수다
    for (const a of this.agents) this.animate(a, now);

    if (m >= DAY.end || (m > DAY.leave + 5 && this.agents.every((a) => a.activity === "gone"))) {
      this.over = true;
      this.notable = true;
      this.log("🌙", `DAY ${this.day} 종료 — 완료 업무 ${this.totals().done}건`, "lav");
    }
  }

  private think(a: Agent, dt: number, m: number) {
    const moving = a.path.length > 0;
    // 출근
    if (a.activity === "off") {
      if (m >= a.arriveAt) {
        this.goDesk(a);
        a.activity = "commute";
        this.bubble(a, pick(LINES.arrive));
        if (a.def.ceo) this.log("👑", `대표 출근`, "yellow");
      }
      return;
    }
    if (a.activity === "gone") return;
    if (a.activity === "commute" && !moving) { a.activity = "desk"; return; }
    // 퇴근
    if (m >= a.leaveAt && a.activity !== "leave") {
      a.activity = "leave";
      this.bubble(a, pick(LINES.leave));
      this.goEntrance(a);
      return;
    }
    if (a.activity === "leave") {
      if (!moving) { a.activity = "gone"; a.onstage = false; }
      return;
    }
    // 점심
    if (m >= a.lunchAt && m < a.returnAt && a.activity !== "lunch" && a.activity !== "commute") {
      a.activity = "lunch";
      a.until = a.returnAt;
      this.goEntrance(a);
      return;
    }
    if (a.activity === "lunch") {
      if (!moving && a.onstage) a.onstage = false;
      if (!a.onstage && m >= a.returnAt) { this.goDesk(a); a.activity = "commute"; }
      return;
    }
    // 일시 활동 종료
    if (["coffee", "meeting", "allhands", "errand", "visit", "called"].includes(a.activity)) {
      if (m >= a.until && !moving) this.goDesk(a);
      return;
    }
    // 자리에서 랜덤 행동
    if (a.activity === "desk" && !moving) {
      if (m < DAY.workStart) return;
      if (a.def.ceo) {
        if (Math.random() < dt / 75) {
          const d = pick(this.depts);
          if (this.send(a, "visit", d.def.id, 9)) this.bubble(a, pick(LINES.ceoVisit), false, 3000);
        }
        return;
      }
      if (Math.random() < dt / 110) this.send(a, "coffee", "lounge", rand(6, 12));
      else if (Math.random() < dt / 220) {
        const d = this.dept(a.def.dept);
        if (d?.def.errandRoom) this.send(a, "errand", d.def.errandRoom, rand(5, 9));
      }
    }
  }

  private move(a: Agent, dt: number) {
    let budget = WALK * dt;
    while (budget > 0 && a.path.length) {
      const tgt = a.path[0];
      const dx = tgt.x - a.x, dy = tgt.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) a.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (dist <= budget) { a.x = tgt.x; a.y = tgt.y; a.path.shift(); budget -= dist; }
      else { a.x += (dx / dist) * budget; a.y += (dy / dist) * budget; budget = 0; }
    }
    if (!a.path.length) a.facing = a.restFacing;
  }

  private animate(a: Agent, now: number) {
    if (a.bubble && a.bubble.until < now) a.bubble = null;
    if (a.path.length) { a.anim = "walk"; return; }
    const d = this.dept(a.def.dept);
    switch (a.activity) {
      case "desk":
        a.anim = a.def.ceo ? "type" : this.isWorking(a) ? "type" : "sit";
        break;
      case "meeting": case "allhands": case "called":
        a.anim = a.bubble ? "talk" : "sit"; break;
      case "coffee": a.anim = a.bubble ? "talk" : "sit"; break;
      default: a.anim = "idle";
    }
    // 수다/생각 말풍선 (현실 시간 기준)
    if (!a.onstage || a.bubble || now < a.nextChatter) return;
    a.nextChatter = now + rand(5000, 14000);
    if (Math.random() > 0.45) return;
    if (a.activity === "desk" && d) {
      if (d.status === "working") this.bubble(a, pick(d.def.workLines), true);
      else if (d.status === "approval") this.bubble(a, pick(LINES.waitApproval), true);
      else if (d.status === "blocked") this.bubble(a, pick(LINES.blocked), true);
    } else if (a.activity === "coffee") this.bubble(a, pick(LINES.coffee));
    else if (a.activity === "meeting" || a.activity === "allhands") this.bubble(a, pick(LINES.meeting));
  }
}

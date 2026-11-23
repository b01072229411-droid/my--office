/* ═══════════════════════════════════════════════════════════
   OFFICE CONFIG — 나만의 오피스를 만들려면 이 파일만 고치면 됩니다.
   방 배치 / 부서 / 직원 / 업무 / 일정 / 대사
   ═══════════════════════════════════════════════════════════ */

export type Pt = { x: number; y: number };
export type Facing = "up" | "down" | "left" | "right";
export type Spot = Pt & { f: Facing };

export const COMPANY = {
  name: "나의 오피스",
  tagline: "직원들이 출근하고, 일하고, 결재를 올리는 실시간 사무실",
  ceoTitle: "대표",
};

/* 월드 크기 (px) */
export const WORLD = { w: 1200, h: 830 };

/* 복도: 가로 복도 y좌표 2개 + 세로 연결 통로 x좌표 + 출입구 */
export const CORRIDOR = { h1: 280, h2: 570, spineX: 590 };
export const ENTRANCE: Pt = { x: 590, y: 812 };
export const ENTRANCE_MAT = { x: 530, y: 778, w: 120, h: 34 };

export type RoomKind = "ceo" | "meeting" | "lounge" | "dept" | "misc";

export type Prop = {
  kind: "desk" | "ceo-desk" | "table" | "sofa" | "coffee" | "screen" | "whiteboard" | "shelf" | "cabinet" | "plant" | "rug";
  x: number; y: number; w: number; h: number; label?: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  kind: RoomKind;
  x: number; y: number; w: number; h: number;
  door: "top" | "bottom";
  doorX: number;          // 방 내부 기준 문 x
  spots: Spot[];          // 방 내부 기준 서 있을 자리
  props: Prop[];
};

/* ── 부서 ─────────────────────────────────────────── */
export type Dept = {
  id: string;
  name: string;
  color: string;
  tasks: string[];        // 하루 동안 처리할 업무(퀘스트) 순서
  workLines: string[];    // 일할 때 생각 말풍선
  blockers: string[];     // 막혔을 때 사유
  errandRoom?: string;    // 가끔 들르는 방
};

export const DEPTS: Dept[] = [
  {
    id: "plan", name: "기획팀", color: "#ff8fc0", errandRoom: "archive",
    tasks: ["신규 서비스 기획서", "사용자 인터뷰 정리", "로드맵 v2", "다음 분기 OKR"],
    workLines: ["요구사항 정리 중…", "이건 왜 필요하지?", "와이어프레임 쓱쓱", "회의록 정리…"],
    blockers: ["데이터 요청 회신 대기", "의사결정 필요"],
  },
  {
    id: "dev", name: "개발팀", color: "#8fb8ff", errandRoom: "server",
    tasks: ["로그인 API", "대시보드 화면", "배포 파이프라인", "버그 바운티 대응"],
    workLines: ["컴파일 중…", "왜 되지…?", "테스트 통과!", "PR 리뷰 중", "커피가 필요해"],
    blockers: ["스테이징 서버 다운", "디자인 시안 대기"],
  },
  {
    id: "design", name: "디자인팀", color: "#c9b8ff", errandRoom: "archive",
    tasks: ["브랜드 가이드", "앱 메인 시안", "아이콘 세트", "랜딩 페이지"],
    workLines: ["픽셀 맞추는 중", "색감 고민…", "1px만 옮기자", "레퍼런스 탐색"],
    blockers: ["카피 확정 대기", "폰트 라이선스 확인"],
  },
  {
    id: "mkt", name: "마케팅팀", color: "#ffd166", errandRoom: "archive",
    tasks: ["런칭 캠페인", "SNS 콘텐츠 10종", "보도자료", "광고 성과 리포트"],
    workLines: ["카피 뽑는 중…", "반응 좋다!", "타겟이 누구더라", "해시태그 고민"],
    blockers: ["광고 계정 심사 중", "예산 승인 필요"],
  },
];

/* ── 직원 ─────────────────────────────────────────── */
export type StaffDef = {
  id: string;
  name: string;
  role: string;
  dept: string | null;    // null = 대표
  lead?: boolean;
  ceo?: boolean;
  shirt: string; skin: string; hair: string;
};

export const STAFF: StaffDef[] = [
  { id: "ceo", name: "나", role: "대표", dept: null, ceo: true, shirt: "#ff5fa8", skin: "#ffe0cc", hair: "#3a2430" },

  { id: "p1", name: "한기획", role: "팀장", dept: "plan", lead: true, shirt: "#ffb3d4", skin: "#ffe0cc", hair: "#4a2b3c" },
  { id: "p2", name: "서정리", role: "PM", dept: "plan", shirt: "#ffd6e8", skin: "#f6d0b5", hair: "#7a4b2a" },
  { id: "p3", name: "윤문서", role: "주니어", dept: "plan", shirt: "#ffc4de", skin: "#ffe6d6", hair: "#2b1c26" },

  { id: "d1", name: "강코드", role: "팀장", dept: "dev", lead: true, shirt: "#9fc4ff", skin: "#f6d0b5", hair: "#2b1c26" },
  { id: "d2", name: "백엔드", role: "백엔드", dept: "dev", shirt: "#b9d3ff", skin: "#ffe0cc", hair: "#5b3a29" },
  { id: "d3", name: "프론트", role: "프론트", dept: "dev", shirt: "#cfe0ff", skin: "#ecc3a4", hair: "#1f1a1c" },

  { id: "g1", name: "이픽셀", role: "팀장", dept: "design", lead: true, shirt: "#c9b8ff", skin: "#ffe6d6", hair: "#d98bb0" },
  { id: "g2", name: "오컬러", role: "UI", dept: "design", shirt: "#ddd2ff", skin: "#f6d0b5", hair: "#4a2b3c" },
  { id: "g3", name: "모션", role: "모션", dept: "design", shirt: "#e8e0ff", skin: "#ffe0cc", hair: "#8a5a3b" },

  { id: "m1", name: "조카피", role: "팀장", dept: "mkt", lead: true, shirt: "#ffd166", skin: "#ecc3a4", hair: "#2b1c26" },
  { id: "m2", name: "홍보람", role: "콘텐츠", dept: "mkt", shirt: "#ffe08a", skin: "#ffe6d6", hair: "#6b3f2a" },
  { id: "m3", name: "나그로스", role: "퍼포먼스", dept: "mkt", shirt: "#fff0b3", skin: "#f6d0b5", hair: "#3a2430" },
];

/* ── 방 ───────────────────────────────────────────── */
const deptRoom = (id: string, code: string, name: string, x: number): Room => ({
  id, code, name, kind: "dept", x, y: 320, w: 260, h: 220, door: "top", doorX: 130,
  spots: [
    { x: 45, y: 104, f: "down" }, { x: 130, y: 104, f: "down" }, { x: 215, y: 104, f: "down" }, // 책상 3개
    { x: 70, y: 186, f: "up" }, { x: 130, y: 192, f: "up" }, { x: 190, y: 186, f: "up" },     // 방문자
  ],
  props: [
    { kind: "desk", x: 17, y: 104, w: 56, h: 24 },
    { kind: "desk", x: 102, y: 104, w: 56, h: 24 },
    { kind: "desk", x: 187, y: 104, w: 56, h: 24 },
    { kind: "whiteboard", x: 16, y: 22, w: 70, h: 26, label: "TODO" },
    { kind: "shelf", x: 196, y: 22, w: 46, h: 24, label: "📚" },
    { kind: "plant", x: 228, y: 188, w: 16, h: 16 },
  ],
});

export const ROOMS: Room[] = [
  {
    id: "ceo", code: "R-00", name: "대표실", kind: "ceo", x: 40, y: 40, w: 300, h: 200, door: "bottom", doorX: 150,
    spots: [
      { x: 150, y: 86, f: "down" },
      { x: 110, y: 166, f: "up" }, { x: 160, y: 170, f: "up" }, { x: 210, y: 166, f: "up" },
    ],
    props: [
      { kind: "rug", x: 70, y: 120, w: 160, h: 60 },
      { kind: "ceo-desk", x: 100, y: 88, w: 100, h: 32 },
      { kind: "cabinet", x: 18, y: 20, w: 40, h: 30, label: "🗄" },
      { kind: "shelf", x: 234, y: 20, w: 48, h: 26, label: "🏆" },
      { kind: "plant", x: 262, y: 160, w: 18, h: 18 },
      { kind: "plant", x: 20, y: 160, w: 18, h: 18 },
    ],
  },
  {
    id: "meeting", code: "R-01", name: "회의실", kind: "meeting", x: 380, y: 40, w: 380, h: 200, door: "bottom", doorX: 190,
    spots: [
      { x: 70, y: 112, f: "right" },                                                                              // 상석
      { x: 110, y: 74, f: "down" }, { x: 150, y: 74, f: "down" }, { x: 190, y: 74, f: "down" }, { x: 230, y: 74, f: "down" }, { x: 270, y: 74, f: "down" },
      { x: 110, y: 150, f: "up" }, { x: 150, y: 150, f: "up" }, { x: 190, y: 150, f: "up" }, { x: 230, y: 150, f: "up" }, { x: 270, y: 150, f: "up" },
      { x: 310, y: 112, f: "left" },
      { x: 40, y: 178, f: "up" }, { x: 340, y: 178, f: "up" },
    ],
    props: [
      { kind: "screen", x: 150, y: 12, w: 80, h: 20, label: "SCREEN" },
      { kind: "table", x: 90, y: 78, w: 200, h: 46 },
      { kind: "plant", x: 345, y: 16, w: 16, h: 16 },
    ],
  },
  {
    id: "lounge", code: "R-02", name: "라운지", kind: "lounge", x: 800, y: 40, w: 360, h: 200, door: "bottom", doorX: 180,
    spots: [
      { x: 45, y: 74, f: "up" }, { x: 80, y: 78, f: "up" }, { x: 115, y: 74, f: "up" },
      { x: 225, y: 70, f: "down" }, { x: 262, y: 70, f: "down" }, { x: 299, y: 70, f: "down" },
      { x: 235, y: 158, f: "up" }, { x: 285, y: 158, f: "up" },
      { x: 60, y: 160, f: "right" }, { x: 110, y: 168, f: "up" }, { x: 150, y: 150, f: "left" },
    ],
    props: [
      { kind: "coffee", x: 20, y: 18, w: 44, h: 32, label: "☕" },
      { kind: "cabinet", x: 72, y: 18, w: 60, h: 26, label: "SNACK" },
      { kind: "sofa", x: 200, y: 32, w: 124, h: 32 },
      { kind: "table", x: 220, y: 98, w: 84, h: 36 },
      { kind: "plant", x: 330, y: 170, w: 18, h: 18 },
      { kind: "rug", x: 36, y: 120, w: 130, h: 56 },
    ],
  },
  deptRoom("plan", "R-11", "기획팀", 40),
  deptRoom("dev", "R-12", "개발팀", 320),
  deptRoom("design", "R-13", "디자인팀", 600),
  deptRoom("mkt", "R-14", "마케팅팀", 880),
  {
    id: "archive", code: "R-21", name: "자료실", kind: "misc", x: 40, y: 600, w: 420, h: 170, door: "top", doorX: 210,
    spots: [{ x: 90, y: 118, f: "up" }, { x: 170, y: 118, f: "up" }, { x: 250, y: 118, f: "up" }, { x: 330, y: 118, f: "up" }],
    props: [
      { kind: "shelf", x: 24, y: 70, w: 80, h: 22, label: "A" },
      { kind: "shelf", x: 124, y: 70, w: 80, h: 22, label: "B" },
      { kind: "shelf", x: 224, y: 70, w: 80, h: 22, label: "C" },
      { kind: "shelf", x: 324, y: 70, w: 72, h: 22, label: "D" },
      { kind: "cabinet", x: 24, y: 130, w: 60, h: 24, label: "🗂" },
    ],
  },
  {
    id: "server", code: "R-22", name: "서버실", kind: "misc", x: 720, y: 600, w: 420, h: 170, door: "top", doorX: 210,
    spots: [{ x: 110, y: 120, f: "up" }, { x: 210, y: 124, f: "up" }, { x: 310, y: 120, f: "up" }],
    props: [
      { kind: "cabinet", x: 30, y: 60, w: 50, h: 40, label: "▤" },
      { kind: "cabinet", x: 100, y: 60, w: 50, h: 40, label: "▤" },
      { kind: "cabinet", x: 170, y: 60, w: 50, h: 40, label: "▤" },
      { kind: "screen", x: 260, y: 64, w: 120, h: 30, label: "UPTIME 99.9%" },
    ],
  },
];

/* ── 일정 (분 단위, 0 = 자정) ──────────────────────── */
export const t = (h: number, m = 0) => h * 60 + m;

export const DAY = {
  start: t(8, 25),
  workStart: t(9),
  lunchStart: t(12),
  lunchEnd: t(13),
  leave: t(18),
  end: t(18, 45),
};

export type ScheduleEvent = { id: string; at: number; until: number; label: string; who: "leads" | "all" | "none" };

export const SCHEDULE: ScheduleEvent[] = [
  { id: "arrive", at: t(8, 30), until: t(9), label: "출근", who: "none" },
  { id: "work", at: t(9), until: t(11), label: "오전 업무", who: "none" },
  { id: "standup", at: t(11), until: t(11, 30), label: "팀장 스탠드업", who: "leads" },
  { id: "lunch", at: t(12), until: t(13), label: "점심시간", who: "none" },
  { id: "pm", at: t(13), until: t(17), label: "오후 업무", who: "none" },
  { id: "review", at: t(17), until: t(17, 30), label: "데일리 리뷰", who: "leads" },
  { id: "leave", at: t(18), until: t(18, 45), label: "퇴근", who: "none" },
];

/* ── 대사 ─────────────────────────────────────────── */
export const LINES = {
  arrive: ["좋은 아침!", "출근 완료 ☀️", "오늘도 화이팅", "커피부터…"],
  coffee: ["☕ 충전 중", "잠깐 쉬어갈게요", "이 원두 좋다", "수다 타임"],
  meeting: ["제 생각엔…", "좋은 의견이에요", "일정 공유드려요", "그건 다음 주에"],
  waitApproval: ["결재 기다리는 중…", "대표님 보셨으려나", "승인 나면 바로!"],
  blocked: ["음… 막혔다", "도움이 필요해", "이거 누가 알지?"],
  ceoVisit: ["다들 수고 많아요!", "진행 어때요?", "간식 사올게요 🍩"],
  leave: ["내일 봬요!", "퇴근~ 👋", "오늘도 수고!"],
  ack: ["넵! 바로 진행하겠습니다", "확인했습니다 🙇", "알겠습니다 대표님!", "접수 완료!"],
};

export const QUICK_COMMANDS = ["전원 회의실 집합", "커피 타임", "진행 상황 보고", "막힌 곳 지원", "개발팀 집중"];

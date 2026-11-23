/* ═══════════════════════════════════════════════════════════
   OFFICE CONFIG — 나만의 오피스를 만들려면 이 파일만 고치면 됩니다.
   방 배치 / 부서 / 직원 / 업무 / 일정 / 대사
   (현재 설정: 가상의 모바일 게임 스튜디오 "몽글 스튜디오")
   ═══════════════════════════════════════════════════════════ */

export type Pt = { x: number; y: number };
export type Facing = "up" | "down" | "left" | "right";
export type Spot = Pt & { f: Facing };

export const COMPANY = {
  name: "몽글 스튜디오",
  tagline: "말랑말랑한 모바일 게임을 만드는 13명의 작은 스튜디오 · 신작 「구름섬 키우기」 런칭 D-14",
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
  aliases?: string[];     // 지시창에서 이 부서를 부르는 다른 이름
  color: string;
  tasks: string[];        // 하루 동안 처리할 업무(퀘스트) 순서
  workLines: string[];    // 일할 때 생각 말풍선
  blockers: string[];     // 막혔을 때 사유
  errandRoom?: string;    // 가끔 들르는 방
};

export const DEPTS: Dept[] = [
  {
    id: "plan", name: "기획팀", aliases: ["기획", "PD"], color: "#ff8fc0", errandRoom: "archive",
    tasks: ["신규 캐릭터 기획서", "구름섬 이벤트 스테이지 설계", "튜토리얼 개선안", "1.1 업데이트 패치노트"],
    workLines: ["밸런스 시트 계산 중…", "이 보상 너무 짠가?", "유저는 여기서 길을 잃어…", "스토리 한 줄만 더!", "확률표 검수 중"],
    blockers: ["플레이 데이터 추출 대기", "보상 수치 의사결정 필요"],
  },
  {
    id: "dev", name: "개발팀", aliases: ["개발", "프로그래머", "클라"], color: "#8fb8ff", errandRoom: "server",
    tasks: ["가챠 연출 시스템", "스테이지 맵 에디터", "푸시 알림 연동", "크래시 버그 수정"],
    workLines: ["빌드 돌리는 중…", "내 폰에선 되는데…", "테스트 전부 통과!", "프레임 드랍 잡는 중", "PR 리뷰 부탁해요"],
    blockers: ["QA 빌드 서버 다운", "아트 리소스 대기"],
  },
  {
    id: "design", name: "아트팀", aliases: ["아트", "디자인", "원화"], color: "#c9b8ff", errandRoom: "archive",
    tasks: ["신규 캐릭터 솜뭉치 원화", "시즌 이벤트 배너", "카톡 이모티콘 24종", "앱 아이콘 리뉴얼"],
    workLines: ["볼터치 더 말랑하게", "이 색감 너무 좋다", "1px만 옮기자…", "애니메이션 프레임 추가", "레퍼런스 탐색 중"],
    blockers: ["캐릭터 설정 확정 대기", "폰트 라이선스 확인 중"],
  },
  {
    id: "mkt", name: "사업팀", aliases: ["사업", "마케팅", "운영"], color: "#ffd166", errandRoom: "archive",
    tasks: ["사전예약 페이지 오픈", "인플루언서 협업 기획", "스토어 소개글 개편", "주간 지표 리포트"],
    workLines: ["사전예약 3만 돌파!", "카피 뭐가 좋을까…", "커뮤니티 반응 체크", "광고 소재 A/B 비교", "해시태그 고민 중"],
    blockers: ["스토어 심사 대기", "광고 예산 승인 필요"],
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

  { id: "p1", name: "윤하늘", role: "기획 PD", dept: "plan", lead: true, shirt: "#ffb3d4", skin: "#ffe0cc", hair: "#4a2b3c" },
  { id: "p2", name: "서다온", role: "레벨 디자이너", dept: "plan", shirt: "#ffd6e8", skin: "#f6d0b5", hair: "#7a4b2a" },
  { id: "p3", name: "박보라", role: "시나리오 작가", dept: "plan", shirt: "#ffc4de", skin: "#ffe6d6", hair: "#8a4fb0" },

  { id: "d1", name: "강도윤", role: "테크 리드", dept: "dev", lead: true, shirt: "#9fc4ff", skin: "#f6d0b5", hair: "#2b1c26" },
  { id: "d2", name: "최준", role: "클라이언트", dept: "dev", shirt: "#b9d3ff", skin: "#ffe0cc", hair: "#5b3a29" },
  { id: "d3", name: "문지후", role: "서버", dept: "dev", shirt: "#cfe0ff", skin: "#ecc3a4", hair: "#1f1a1c" },

  { id: "g1", name: "한소라", role: "아트 디렉터", dept: "design", lead: true, shirt: "#c9b8ff", skin: "#ffe6d6", hair: "#d98bb0" },
  { id: "g2", name: "오솜이", role: "캐릭터 원화", dept: "design", shirt: "#ddd2ff", skin: "#f6d0b5", hair: "#4a2b3c" },
  { id: "g3", name: "정모아", role: "UI · 애니메이터", dept: "design", shirt: "#e8e0ff", skin: "#ffe0cc", hair: "#e0a050" },

  { id: "m1", name: "김가온", role: "사업 PD", dept: "mkt", lead: true, shirt: "#ffd166", skin: "#ecc3a4", hair: "#2b1c26" },
  { id: "m2", name: "류해솔", role: "커뮤니티 매니저", dept: "mkt", shirt: "#ffe08a", skin: "#ffe6d6", hair: "#6b3f2a" },
  { id: "m3", name: "남궁별", role: "퍼포먼스 마케터", dept: "mkt", shirt: "#fff0b3", skin: "#f6d0b5", hair: "#3a2430" },
];

/* ── 방 ───────────────────────────────────────────── */
const deptRoom = (id: string, code: string, name: string, x: number, board: string, shelf: string): Room => ({
  id, code, name, kind: "dept", x, y: 320, w: 260, h: 220, door: "top", doorX: 130,
  spots: [
    { x: 45, y: 104, f: "down" }, { x: 130, y: 104, f: "down" }, { x: 215, y: 104, f: "down" }, // 책상 3개
    { x: 70, y: 186, f: "up" }, { x: 130, y: 192, f: "up" }, { x: 190, y: 186, f: "up" },     // 방문자
  ],
  props: [
    { kind: "desk", x: 17, y: 104, w: 56, h: 24 },
    { kind: "desk", x: 102, y: 104, w: 56, h: 24 },
    { kind: "desk", x: 187, y: 104, w: 56, h: 24 },
    { kind: "whiteboard", x: 16, y: 22, w: 70, h: 26, label: board },
    { kind: "shelf", x: 196, y: 22, w: 46, h: 24, label: shelf },
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
      { kind: "shelf", x: 224, y: 20, w: 58, h: 26, label: "🏆 GOTY" },
      { kind: "plant", x: 262, y: 160, w: 18, h: 18 },
      { kind: "plant", x: 20, y: 160, w: 18, h: 18 },
    ],
  },
  {
    id: "meeting", code: "R-01", name: "브레인스토밍룸", kind: "meeting", x: 380, y: 40, w: 380, h: 200, door: "bottom", doorX: 190,
    spots: [
      { x: 70, y: 112, f: "right" },                                                                              // 상석
      { x: 110, y: 74, f: "down" }, { x: 150, y: 74, f: "down" }, { x: 190, y: 74, f: "down" }, { x: 230, y: 74, f: "down" }, { x: 270, y: 74, f: "down" },
      { x: 110, y: 150, f: "up" }, { x: 150, y: 150, f: "up" }, { x: 190, y: 150, f: "up" }, { x: 230, y: 150, f: "up" }, { x: 270, y: 150, f: "up" },
      { x: 310, y: 112, f: "left" },
      { x: 40, y: 178, f: "up" }, { x: 340, y: 178, f: "up" },
    ],
    props: [
      { kind: "screen", x: 140, y: 12, w: 100, h: 20, label: "구름섬 키우기" },
      { kind: "table", x: 90, y: 78, w: 200, h: 46 },
      { kind: "plant", x: 345, y: 16, w: 16, h: 16 },
    ],
  },
  {
    id: "lounge", code: "R-02", name: "탕비실 · 라운지", kind: "lounge", x: 800, y: 40, w: 360, h: 200, door: "bottom", doorX: 180,
    spots: [
      { x: 45, y: 74, f: "up" }, { x: 80, y: 78, f: "up" }, { x: 115, y: 74, f: "up" },
      { x: 225, y: 70, f: "down" }, { x: 262, y: 70, f: "down" }, { x: 299, y: 70, f: "down" },
      { x: 235, y: 158, f: "up" }, { x: 285, y: 158, f: "up" },
      { x: 60, y: 160, f: "right" }, { x: 110, y: 168, f: "up" }, { x: 150, y: 150, f: "left" },
    ],
    props: [
      { kind: "coffee", x: 20, y: 18, w: 44, h: 32, label: "☕" },
      { kind: "cabinet", x: 72, y: 18, w: 60, h: 26, label: "🍪 간식" },
      { kind: "sofa", x: 200, y: 32, w: 124, h: 32 },
      { kind: "table", x: 220, y: 98, w: 84, h: 36 },
      { kind: "plant", x: 330, y: 170, w: 18, h: 18 },
      { kind: "rug", x: 36, y: 120, w: 130, h: 56 },
    ],
  },
  deptRoom("plan", "R-11", "기획팀", 40, "D-14", "📖"),
  deptRoom("dev", "R-12", "개발팀", 320, "BUILD #482", "💾"),
  deptRoom("design", "R-13", "아트팀", 600, "솜뭉치 ✏️", "🎨"),
  deptRoom("mkt", "R-14", "사업팀", 880, "사전예약 3만", "📈"),
  {
    id: "archive", code: "R-21", name: "자료실 · 굿즈 창고", kind: "misc", x: 40, y: 600, w: 420, h: 170, door: "top", doorX: 210,
    spots: [{ x: 90, y: 118, f: "up" }, { x: 170, y: 118, f: "up" }, { x: 250, y: 118, f: "up" }, { x: 330, y: 118, f: "up" }],
    props: [
      { kind: "shelf", x: 24, y: 70, w: 80, h: 22, label: "설정집" },
      { kind: "shelf", x: 124, y: 70, w: 80, h: 22, label: "아트북" },
      { kind: "shelf", x: 224, y: 70, w: 80, h: 22, label: "인형 🧸" },
      { kind: "shelf", x: 324, y: 70, w: 72, h: 22, label: "스티커" },
      { kind: "cabinet", x: 24, y: 130, w: 60, h: 24, label: "🗂" },
    ],
  },
  {
    id: "server", code: "R-22", name: "QA 테스트룸", kind: "misc", x: 720, y: 600, w: 420, h: 170, door: "top", doorX: 210,
    spots: [{ x: 110, y: 120, f: "up" }, { x: 210, y: 124, f: "up" }, { x: 310, y: 120, f: "up" }],
    props: [
      { kind: "cabinet", x: 30, y: 60, w: 50, h: 40, label: "📱" },
      { kind: "cabinet", x: 100, y: 60, w: 50, h: 40, label: "📱" },
      { kind: "cabinet", x: 170, y: 60, w: 50, h: 40, label: "▤" },
      { kind: "screen", x: 260, y: 64, w: 120, h: 30, label: "CRASH FREE 99.2%" },
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
  { id: "arrive", at: t(8, 30), until: t(9), label: "출근 · 모닝 커피", who: "none" },
  { id: "work", at: t(9), until: t(11), label: "오전 개발 스프린트", who: "none" },
  { id: "standup", at: t(11), until: t(11, 30), label: "팀장 데일리 스크럼", who: "leads" },
  { id: "lunch", at: t(12), until: t(13), label: "점심시간 🍱", who: "none" },
  { id: "pm", at: t(13), until: t(17), label: "오후 작업", who: "none" },
  { id: "review", at: t(17), until: t(17, 30), label: "빌드 플레이 테스트 리뷰", who: "leads" },
  { id: "leave", at: t(18), until: t(18, 45), label: "퇴근 (야근 금지!)", who: "none" },
];

/* ── 대사 ─────────────────────────────────────────── */
export const LINES = {
  arrive: ["좋은 아침이에요!", "출근 완료 ☀️", "오늘도 말랑하게", "라떼부터 수혈…", "어제 빌드 봤어요?"],
  coffee: ["☕ 충전 중", "탕비실 쿠키 맛있다", "어제 그 게임 해봤어요?", "잠깐 머리 식히기", "솜뭉치 너무 귀여워"],
  meeting: ["이 기능 꼭 필요할까요?", "유저 입장에서 보면…", "일정 공유드려요", "그건 1.2 때 하죠", "플레이해보니 재밌어요!"],
  waitApproval: ["대표님 결재 기다리는 중…", "보셨으려나?", "승인 나면 바로 다음 거!"],
  blocked: ["음… 막혔다", "도움이 필요해요", "이거 누구한테 물어보지?"],
  ceoVisit: ["다들 수고 많아요!", "구름섬 잘 되고 있죠?", "간식 사왔어요 🍩", "막히는 거 없어요?"],
  leave: ["내일 봬요!", "퇴근~ 👋", "오늘도 수고했어요!", "집 가서 게임해야지"],
  ack: ["넵! 바로 진행할게요", "확인했습니다 🙇", "알겠습니다 대표님!", "접수 완료! 🐑"],
};

export const QUICK_COMMANDS = ["전원 회의 집합", "간식 타임", "진행 상황 보고", "막힌 곳 지원", "개발팀 집중"];

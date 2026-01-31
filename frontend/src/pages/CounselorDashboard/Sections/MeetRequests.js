// src/pages/CounselorDashboard/Sections/MeetRequests.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/* ===================== STORAGE ===================== */
const STORAGE_KEY = "student_dashboard:meet_requests:v2";
const SETTINGS_KEY = "student_dashboard:account_settings:v1";

function safeJSONParse(v, fallback) {
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function lsGet(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? safeJSONParse(raw, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/* ===================== OPTIONS ===================== */
const COURSE_OPTIONS = [
  "Bachelor of Science in Nursing",
  "Bachelor of Elementary Education (SPED)",
  "Bachelor of Physical Education",
  "Bachelor of Secondary Education",
  "Bachelor of Science in Business Administration (BSBA)",
  "Bachelor of Science in Accounting Information System",
  "Bachelor of Science in Information Technology",
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Hospitality Management (BSHM)",
  "Bachelor of Science in Tourism Management (BSTM)",
  "Bachelor of Science in Criminology",
  "Bachelor of Arts in English Language",
  "Bachelor of Arts in Psychology",
  "Bachelor of Arts in Political Science",
];

const REASON_OPTIONS = [
  "Academic Stress",
  "Depression",
  "Self-esteem",
  "Other",
  "Anxiety/Overthinking",
  "Family/Relationship",
  "Grief/Loss",
];

const STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DISAPPROVED: "Disapproved",
  CANCELED: "Canceled",
};

const SORT = {
  NEWEST: "Newest",
  OLDEST: "Oldest",
  DATE_ASC: "Date (Soonest)",
  DATE_DESC: "Date (Latest)",
};

const MODES = ["Online", "In-person"];

/* ===================== MOCK SCOPES ===================== */
const COUNSELOR_SCOPE = { counselorId: "C-001" };

const BASE_COUNSELORS = [
  { counselorId: "C-001", name: "Counselor A", campus: "Main Campus", courses: COURSE_OPTIONS[6] },
  { counselorId: "C-002", name: "Counselor B", campus: "Main Campus", courses: COURSE_OPTIONS[7] },
];

/* ===================== HELPERS ===================== */
function coerceArray(v) {
  return Array.isArray(v) ? v : [];
}

function getCounselorDirectoryFromSettings(settings, baseCounselors) {
  const base = coerceArray(baseCounselors);
  if (!settings || typeof settings !== "object") return base;

  const rawList = [
    ...coerceArray(settings.counselors),
    ...coerceArray(settings.counselorDirectory),
    ...coerceArray(settings.counselorList),
  ];

  const byId = new Map(base.map((c) => [c.counselorId, { ...c }]));

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const id = item.counselorId || item.id;
    if (!id) continue;
    const prev = byId.get(id) || { counselorId: id };
    byId.set(id, { ...prev, ...item, counselorId: id, name: item.name ?? prev.name });
  }

  if (settings.counselorNameMap && typeof settings.counselorNameMap === "object") {
    for (const [id, name] of Object.entries(settings.counselorNameMap)) {
      if (!id) continue;
      const prev = byId.get(id) || { counselorId: id };
      byId.set(id, { ...prev, counselorId: id, name: String(name || prev.name || "") });
    }
  }

  return Array.from(byId.values());
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateKey(dateStr) {
  const s = String(dateStr || "").trim();
  if (!s) return 0;
  const d = new Date(`${s}T00:00:00`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareCreatedAt(a, b) {
  const A = String(a.createdAt || "");
  const B = String(b.createdAt || "");
  return A < B ? -1 : A > B ? 1 : 0;
}

function clampPage(page, totalPages) {
  if (totalPages <= 1) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function normalizeCounselor(counselor, counselorDirectory) {
  const id = counselor?.counselorId || counselor?.id || "";
  if (!id) return counselor || null;
  const match = counselorDirectory.find((c) => c.counselorId === id);
  if (!match) return counselor || null;
  return {
    counselorId: match.counselorId,
    name: match.name || counselor?.name || "Counselor",
    campus: match.campus || counselor?.campus || "—",
    courses: match.courses || counselor?.courses || "—",
  };
}

function normalizeRequestsWithCounselors(list, counselorDirectory) {
  if (!Array.isArray(list)) return [];
  return list.map((r) => ({
    ...r,
    counselor: normalizeCounselor(r.counselor, counselorDirectory),
  }));
}

function buildCancelMailto({ studentEmail, studentName, requestId, date, time, mode, counselorName, cancelNote }) {
  const email = String(studentEmail || "").trim();
  if (!email) return "";

  const subject = `Counseling request ${requestId} canceled`;
  const lines = [
    `Hello ${studentName || "Student"},`,
    "",
    `Your counseling request (${requestId}) has been canceled.`,
    "",
    `Schedule: ${date} • ${time} (${mode})`,
    `Counselor: ${counselorName || "Counselor"}`,
    "",
    cancelNote ? `Reason: ${cancelNote}` : "Reason: (not provided)",
    "",
    "You may submit a new request with a new schedule.",
    "",
    "Thank you.",
  ];

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

function longNotes(i) {
  return (
    `Stress-test notes #${i}\n\n` +
    "I have been feeling overwhelmed lately with deadlines, expectations, and my own thoughts. ".repeat(18) +
    "\n\n" +
    "Sometimes it affects my sleep and appetite. I also struggle to focus during classes and feel anxious before exams. ".repeat(
      14
    ) +
    "\n\n" +
    "I would like guidance and coping strategies. Thank you."
  );
}

function makeStudent(i) {
  const courses = COURSE_OPTIONS[i % COURSE_OPTIONS.length];
  return {
    studentId: `2023-${String(88000 + i).padStart(6, "0")}`,
    name: `Student Full Name ${i}`, // ✅ show "Full Name" in list, not "Student 16"
    email: `student${i}@gmail.com`,
    campus: i % 2 === 0 ? "Main Campus" : "Annex Campus",
    courses,
  };
}

/* ===================== SAMPLE DATA (20 TOTAL: 5 EACH STATUS) ===================== */
const SAMPLE_TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"]; // no 12nn
function makeReq({
  id,
  status,
  createdAt,
  date,
  time,
  mode,
  reason,
  notes,
  counselor,
  student,
  meetLink,
  canceledAt,
  cancelNote,
}) {
  return {
    id,
    status,
    createdAt,
    updatedAt: createdAt,
    date,
    time,
    mode,
    reason,
    notes,
    meetLink: meetLink || "",
    canceledAt: canceledAt || "",
    cancelNote: cancelNote || "",
    student,
    counselor,
  };
}

const MOCK_MEET_REQUESTS = (() => {
  const base = [];
  const c1 = BASE_COUNSELORS[0];
  const c2 = BASE_COUNSELORS[1];

  const dates = [
    "2026-02-03",
    "2026-02-04",
    "2026-02-05",
    "2026-02-06",
    "2026-02-07",
    "2026-02-10",
    "2026-02-11",
    "2026-02-12",
    "2026-02-13",
    "2026-02-14",
  ];

  let n = 1;

  for (let i = 0; i < 5; i += 1) {
    base.push(
      makeReq({
        id: `MEET-4${String(100 + n).slice(1)}`,
        status: STATUS.PENDING,
        createdAt: `2026-01-${String(10 + i).padStart(2, "0")} 09:0${i}`,
        date: dates[i],
        time: SAMPLE_TIMES[i % SAMPLE_TIMES.length],
        mode: i % 2 === 0 ? "Online" : "In-person",
        reason: REASON_OPTIONS[i % REASON_OPTIONS.length],
        notes: i === 2 ? longNotes(i + 1) : `Pending notes ${i + 1}: ${longNotes(i + 1).slice(0, 220)}...`,
        counselor: i % 2 === 0 ? c1 : c2,
        student: makeStudent(++n),
      })
    );
  }

  for (let i = 0; i < 5; i += 1) {
    base.push(
      makeReq({
        id: `MEET-4${String(100 + n).slice(1)}`,
        status: STATUS.APPROVED,
        createdAt: `2026-01-${String(15 + i).padStart(2, "0")} 10:1${i}`,
        date: dates[(i + 2) % dates.length],
        time: SAMPLE_TIMES[(i + 3) % SAMPLE_TIMES.length],
        mode: i % 2 === 0 ? "Online" : "In-person",
        reason: REASON_OPTIONS[(i + 2) % REASON_OPTIONS.length],
        notes: i === 1 ? longNotes(i + 10) : `Approved notes ${i + 1}: ${longNotes(i + 10).slice(0, 240)}...`,
        counselor: i % 2 === 0 ? c1 : c2,
        student: makeStudent(++n),
        meetLink: i % 2 === 0 ? `https://meet.google.com/sample-${i}-link` : "",
      })
    );
  }

  for (let i = 0; i < 5; i += 1) {
    base.push(
      makeReq({
        id: `MEET-4${String(100 + n).slice(1)}`,
        status: STATUS.DISAPPROVED,
        createdAt: `2026-01-${String(20 + i).padStart(2, "0")} 11:2${i}`,
        date: dates[(i + 4) % dates.length],
        time: SAMPLE_TIMES[(i + 5) % SAMPLE_TIMES.length],
        mode: i % 2 === 0 ? "Online" : "In-person",
        reason: REASON_OPTIONS[(i + 4) % REASON_OPTIONS.length],
        notes: i === 4 ? longNotes(i + 20) : `Disapproved notes ${i + 1}: ${longNotes(i + 20).slice(0, 220)}...`,
        counselor: i % 2 === 0 ? c1 : c2,
        student: makeStudent(++n),
      })
    );
  }

  for (let i = 0; i < 5; i += 1) {
    const createdAt = `2026-01-${String(25 + i).padStart(2, "0")} 08:3${i}`;
    const canceledAt = `2026-01-${String(25 + i).padStart(2, "0")} 12:0${i}`;
    base.push(
      makeReq({
        id: `MEET-4${String(100 + n).slice(1)}`,
        status: STATUS.CANCELED,
        createdAt,
        date: dates[(i + 6) % dates.length],
        time: SAMPLE_TIMES[(i + 6) % SAMPLE_TIMES.length],
        mode: i % 2 === 0 ? "Online" : "In-person",
        reason: REASON_OPTIONS[(i + 6) % REASON_OPTIONS.length],
        notes: i === 0 ? longNotes(i + 30) : `Canceled notes ${i + 1}: ${longNotes(i + 30).slice(0, 230)}...`,
        counselor: i % 2 === 0 ? c1 : c2,
        student: makeStudent(++n),
        canceledAt,
        cancelNote: `Canceled due to schedule conflict. ${"Please reschedule. ".repeat(6)}`,
      })
    );
  }

  return base.slice(0, 20);
})();

/* ===================== UI ===================== */
function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    red: "bg-red-50 text-red-800 border-red-100",
    gray: "bg-slate-50 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-800 border-blue-100",
    violet: "bg-violet-50 text-violet-800 border-violet-100",
  };

  return (
    <span
      className={
        ["inline-flex items-center rounded-full border px-2.5 py-1", "text-[11px] font-extrabold"].join(" ") +
        " " +
        (map[tone] || map.slate)
      }
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  if (status === STATUS.PENDING) return "amber";
  if (status === STATUS.APPROVED) return "emerald";
  if (status === STATUS.DISAPPROVED) return "red";
  if (status === STATUS.CANCELED) return "gray";
  return "slate";
}

function Notice({ tone = "slate", message, onClose }) {
  if (!message) return null;

  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    red: "border-red-100 bg-red-50 text-red-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    blue: "border-blue-100 bg-blue-50 text-blue-900",
  };

  return (
    <div className={["rounded-2xl border px-4 py-3 shadow-sm", toneMap[tone] || toneMap.slate].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-extrabold">{message}</div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ModalShell({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/40 p-2 sm:p-4 grid place-items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={["rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm", className].join(" ")}>
      <div className="text-sm font-black text-slate-800">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function KVGrid({ items }) {
  return (
    <dl className="space-y-3">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 items-start">
          <dt className="text-xs font-bold text-slate-500">{it.label}</dt>
          <dd className="text-sm font-extrabold text-slate-800 break-words sm:text-right">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PillTab({ active, onClick, label, count, tone }) {
  const dot =
    {
      slate: "bg-slate-400",
      amber: "bg-amber-400",
      emerald: "bg-emerald-500",
      red: "bg-red-500",
      gray: "bg-slate-400",
    }[tone] || "bg-slate-400";

  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-2xl border text-sm font-extrabold transition",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        <span className={["inline-block h-2.5 w-2.5 rounded-full", dot].join(" ")} />
        {label}
        <span
          className={[
            "ml-1 px-2 py-0.5 rounded-full text-[11px] font-black border",
            active ? "border-white/30 bg-white/10" : "border-slate-200 bg-slate-50",
          ].join(" ")}
        >
          {count}
        </span>
      </span>
    </button>
  );
}

/**
 * ✅ Stress-test friendly + responsive:
 * - Sticky controls inside the list card
 * - List area scrolls (desktop + mobile)
 * - Buttons wrap properly
 */
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const maxButtons = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - (maxButtons - 1)));
  const end = Math.min(totalPages, start + (maxButtons - 1));
  const pages = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <div className="pt-4 pb-1 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-4 py-2 rounded-xl text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          Prev
        </button>

        {pages.map((p) => {
          const active = p === page;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={[
                "h-10 w-10 rounded-xl text-sm font-extrabold border transition",
                active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 rounded-xl text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="text-xs font-bold text-slate-500">
        Page {page} / {totalPages}
      </div>
    </div>
  );
}

/* ===================== MAIN (COUNSELOR) ===================== */
export default function CounselorMeetRequests() {
  const [notice, setNotice] = useState({ tone: "slate", message: "" });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const doToast = (tone, message, autoMs = 1700) => {
    setNotice({ tone, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNotice({ tone: "slate", message: "" }), autoMs);
  };

  const [counselorDirectory, setCounselorDirectory] = useState(() => {
    const settings = lsGet(SETTINGS_KEY, null);
    return getCounselorDirectoryFromSettings(settings, BASE_COUNSELORS);
  });

  useEffect(() => {
    const sync = () => {
      const settings = lsGet(SETTINGS_KEY, null);
      setCounselorDirectory(getCounselorDirectoryFromSettings(settings, BASE_COUNSELORS));
    };
    sync();

    if (isBrowser()) {
      const onStorage = (e) => {
        if (e?.key === SETTINGS_KEY) sync();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  const [requests, setRequests] = useState(() => {
    const saved = lsGet(STORAGE_KEY, null);
    const base = Array.isArray(saved) && saved.length ? saved : MOCK_MEET_REQUESTS;
    const dir = getCounselorDirectoryFromSettings(lsGet(SETTINGS_KEY, null), BASE_COUNSELORS);
    return normalizeRequestsWithCounselors(base, dir);
  });

  useEffect(() => {
    lsSet(STORAGE_KEY, requests);
  }, [requests]);

  useEffect(() => {
    setRequests((prev) => normalizeRequestsWithCounselors(prev, counselorDirectory));
  }, [counselorDirectory]);

  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState(SORT.NEWEST);

  const [selected, setSelected] = useState(null);
  const [openCancel, setOpenCancel] = useState(false);

  // ✅ responsive stress-test defaults:
  // - more items per page on large screens, fewer on small screens (handled by layout)
  const pageSize = 8;
  const [page, setPage] = useState(1);

  const myRequests = useMemo(
    () => requests.filter((r) => (r.counselor?.counselorId || "") === COUNSELOR_SCOPE.counselorId),
    [requests]
  );

  const counts = useMemo(() => {
    const count = (s) => myRequests.filter((x) => x.status === s).length;
    return {
      pending: count(STATUS.PENDING),
      approved: count(STATUS.APPROVED),
      disapproved: count(STATUS.DISAPPROVED),
      canceled: count(STATUS.CANCELED),
      all: myRequests.length,
    };
  }, [myRequests]);

  const tabs = useMemo(
    () => [
      { key: STATUS.PENDING, label: "Pending", count: counts.pending, tone: "amber" },
      { key: STATUS.APPROVED, label: "Approved", count: counts.approved, tone: "emerald" },
      { key: STATUS.DISAPPROVED, label: "Disapproved", count: counts.disapproved, tone: "red" },
      { key: STATUS.CANCELED, label: "Canceled", count: counts.canceled, tone: "gray" },
      { key: "All", label: "All", count: counts.all, tone: "slate" },
    ],
    [counts]
  );

  const filteredSorted = useMemo(() => {
    const byTab = tab === "All" ? myRequests : myRequests.filter((r) => r.status === tab);

    const needle = q.trim().toLowerCase();
    const filtered = !needle
      ? byTab
      : byTab.filter((r) => {
          // ✅ do NOT search long notes (stress-test friendly)
          const hay = (
            `${r.id} ${r.status} ${r.createdAt} ${r.updatedAt || ""} ${r.date} ${r.time} ${r.mode} ${r.reason} ` +
            `${r.student?.name || ""} ${r.student?.studentId || ""} ${r.student?.email || ""} ${r.student?.courses || ""}`
          ).toLowerCase();
          return hay.includes(needle);
        });

    const sorted = filtered.slice();
    if (sortBy === SORT.NEWEST) sorted.sort((a, b) => (compareCreatedAt(a, b) < 0 ? 1 : -1));
    else if (sortBy === SORT.OLDEST) sorted.sort((a, b) => (compareCreatedAt(a, b) < 0 ? -1 : 1));
    else if (sortBy === SORT.DATE_ASC) sorted.sort((a, b) => (parseDateKey(a.date) || 0) - (parseDateKey(b.date) || 0));
    else if (sortBy === SORT.DATE_DESC) sorted.sort((a, b) => (parseDateKey(b.date) || 0) - (parseDateKey(a.date) || 0));
    else sorted.sort((a, b) => (compareCreatedAt(a, b) < 0 ? 1 : -1));

    return sorted;
  }, [myRequests, tab, q, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [tab, q, sortBy]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = clampPage(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSorted.slice(start, end);
  }, [filteredSorted, safePage]);

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(safePage * pageSize, total);

  const updateRequest = (id, patch) => {
    setRequests((prev) => {
      const stamp = nowStamp();
      return prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch, updatedAt: stamp };

        if (next.status !== STATUS.CANCELED) {
          next.canceledAt = "";
          next.cancelNote = "";
        } else {
          next.canceledAt = next.canceledAt || stamp;
          next.cancelNote = String(next.cancelNote || "");
        }
        return next;
      });
    });
  };

  const setStatus = (r, status) => {
    if (!r?.id) return;
    updateRequest(r.id, { status });
    doToast(status === STATUS.APPROVED ? "blue" : status === STATUS.DISAPPROVED ? "red" : "amber", `${status}: ${r.id}`);
  };

  const [meetLinkDraft, setMeetLinkDraft] = useState("");
  const [cancelNoteDraft, setCancelNoteDraft] = useState("");

  useEffect(() => {
    if (!selected) return;
    setMeetLinkDraft(String(selected.meetLink || ""));
    setCancelNoteDraft("");
  }, [selected]);

  const saveMeetLink = () => {
    if (!selected?.id) return;
    const link = meetLinkDraft.trim();
    updateRequest(selected.id, { meetLink: link });
    doToast("blue", link ? "Meet link saved" : "Meet link cleared");
    setSelected((p) => (p ? { ...p, meetLink: link, updatedAt: nowStamp() } : p));
  };

  const copyMeetLink = async (link) => {
    const ok = await copyText(link);
    doToast(ok ? "blue" : "red", ok ? "Copied Meet link" : "Copy failed");
  };

  // ✅ stress test seed (fast)
  // - Generates MANY items quickly without huge notes in the list (notes are only in modal)
  const seedSampleData = () => {
    const dir = getCounselorDirectoryFromSettings(lsGet(SETTINGS_KEY, null), BASE_COUNSELORS);

    // keep original 20 + add more for stress test
    const EXTRA = 180; // total ~200 items
    const extra = [];
    const base = MOCK_MEET_REQUESTS.slice();

    const c1 = BASE_COUNSELORS[0];
    const c2 = BASE_COUNSELORS[1];

    for (let i = 1; i <= EXTRA; i += 1) {
      const idx = i + 50;
      const statusPick = i % 4 === 0 ? STATUS.PENDING : i % 4 === 1 ? STATUS.APPROVED : i % 4 === 2 ? STATUS.DISAPPROVED : STATUS.CANCELED;
      const mode = i % 2 === 0 ? "Online" : "In-person";
      const day = (i % 26) + 1;
      const createdAt = `2026-01-${String((i % 28) + 1).padStart(2, "0")} ${String((i % 9) + 8).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`;
      const date = `2026-02-${String(day).padStart(2, "0")}`;
      const time = SAMPLE_TIMES[i % SAMPLE_TIMES.length];

      extra.push(
        makeReq({
          id: `MEET-${1000 + idx}`,
          status: statusPick,
          createdAt,
          date,
          time,
          mode,
          reason: REASON_OPTIONS[i % REASON_OPTIONS.length],
          notes: longNotes(idx), // big notes exist but NOT shown in list
          counselor: i % 2 === 0 ? c1 : c2,
          student: makeStudent(200 + idx),
          meetLink: statusPick === STATUS.APPROVED && mode === "Online" ? `https://meet.google.com/stress-${idx}` : "",
          canceledAt: statusPick === STATUS.CANCELED ? nowStamp() : "",
          cancelNote: statusPick === STATUS.CANCELED ? "Canceled due to schedule conflict." : "",
        })
      );
    }

    const normalized = normalizeRequestsWithCounselors([...base, ...extra], dir);
    setRequests(normalized);
    doToast("green", `Stress data loaded (${normalized.length})`);
  };

  const confirmCancelAndEmail = () => {
    if (!selected?.id) return;

    const note = cancelNoteDraft.trim();
    const stamp = nowStamp();

    updateRequest(selected.id, { status: STATUS.CANCELED, canceledAt: stamp, cancelNote: note });
    setSelected((p) => (p ? { ...p, status: STATUS.CANCELED, canceledAt: stamp, cancelNote: note, updatedAt: stamp } : p));
    setOpenCancel(false);

    const mailto = buildCancelMailto({
      studentEmail: selected.student?.email,
      studentName: selected.student?.name,
      requestId: selected.id,
      date: selected.date,
      time: selected.time,
      mode: selected.mode,
      counselorName: selected.counselor?.name,
      cancelNote: note,
    });

    if (!mailto) {
      doToast("red", "No student email found");
      return;
    }

    doToast("amber", `Canceled: ${selected.id}`);
    window.location.href = mailto;
  };

  const emptyHint = q.trim() ? "Try a different keyword." : tab !== "All" ? "No items in this tab." : "No requests yet.";

  const canApproveDecline = selected?.status === STATUS.PENDING;
  const canCancel = selected?.status === STATUS.PENDING;
  const isCanceled = selected?.status === STATUS.CANCELED;
  const canEditMeetLink = selected?.mode === "Online" && selected?.status === STATUS.APPROVED;

  return (
    <div className="space-y-4">
      <Notice tone={notice.tone} message={notice.message} onClose={() => setNotice({ tone: "slate", message: "" })} />

      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Meet Requests</div>
              <div className="mt-1 text-xs sm:text-sm font-bold text-slate-500">
                Stress-test ready: list is scrollable, notes only open in the popup.
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={seedSampleData}
                className="px-4 py-2.5 rounded-2xl text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
              >
                Load stress data
              </button>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by student name, ID, course, date, request ID…"
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white pl-4 pr-20 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
                />
                {q ? (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-[220px] h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
              >
                {Object.values(SORT).map((v) => (
                  <option key={v} value={v}>
                    Sort: {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {tabs.map((t) => (
              <PillTab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} label={t.label} count={t.count} tone={t.tone} />
            ))}
          </div>

          <div className="mt-4 text-sm font-semibold text-slate-600">
            Showing <span className="font-black">{showingFrom}</span>–<span className="font-black">{showingTo}</span> of{" "}
            <span className="font-black">{total}</span>
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-black text-slate-800">Requests</div>
          <div className="text-xs font-bold text-slate-500">Click an item to manage it.</div>
        </div>

        {/* ✅ SCROLL AREA (stress test) */}
        <div className="meet-scroll">
          {pageItems.length === 0 ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-base font-black text-slate-900">No results</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">{emptyHint}</div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {q ? (
                    <button
                      onClick={() => setQ("")}
                      className="px-4 py-2.5 rounded-2xl text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                    >
                      Clear search
                    </button>
                  ) : (
                    <button
                      onClick={seedSampleData}
                      className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Load stress data
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-3">
              {pageItems.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/60 transition px-4 sm:px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                        <div className="text-base font-black text-slate-900 truncate">{r.reason}</div>
                        <div className="text-xs font-bold text-slate-500 truncate">
                          • {r.date} • {r.time} • {r.mode} • 1 hr
                        </div>
                      </div>

                      {/* ✅ Request section: Full name + Student ID + Course (NO notes in list) */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Badge tone="slate">{r.id}</Badge>
                        <Badge tone="violet">{r.student?.name || "Full Name"}</Badge>
                        <Badge tone="slate">{r.student?.studentId || "Student ID"}</Badge>
                        <Badge tone="slate">{r.student?.courses || "Course"}</Badge>

                        {r.status === STATUS.APPROVED && r.mode === "Online" ? (
                          <Badge tone={r.meetLink ? "blue" : "gray"}>{r.meetLink ? "Meet link ready" : "Meet link pending"}</Badge>
                        ) : null}
                      </div>

                      {/* ✅ notes removed from list (shown only in popup) */}
                      <div className="mt-3 text-xs font-bold text-slate-400">Notes hidden • open to view</div>
                    </div>

                    <div className="text-slate-400 text-2xl leading-none select-none">›</div>
                  </div>
                </button>
              ))}

              <Pagination page={safePage} totalPages={totalPages} onPage={(p) => setPage(p)} />
            </div>
          )}
        </div>
      </section>

      {/* DETAILS MODAL */}
      <ModalShell
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setOpenCancel(false);
        }}
      >
        {selected ? (
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black text-slate-900">Request details</div>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                  <span className="text-xs font-bold text-slate-500">{selected.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {canApproveDecline ? (
                  <>
                    <button
                      onClick={() => {
                        setStatus(selected, STATUS.APPROVED);
                        setSelected((p) => (p ? { ...p, status: STATUS.APPROVED, canceledAt: "", cancelNote: "" } : p));
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => {
                        setStatus(selected, STATUS.DISAPPROVED);
                        setSelected((p) => (p ? { ...p, status: STATUS.DISAPPROVED, canceledAt: "", cancelNote: "" } : p));
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Disapprove
                    </button>
                  </>
                ) : null}

                {canCancel ? (
                  <button
                    onClick={() => setOpenCancel(true)}
                    className="px-3 py-2 rounded-xl text-xs font-extrabold border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  >
                    Cancel & Email
                  </button>
                ) : null}

                <button
                  onClick={() => {
                    setSelected(null);
                    setOpenCancel(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Body (scrollable for mobile/long notes) */}
            <div className="p-4 sm:p-6 bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Info">
                  <KVGrid
                    items={[
                      { label: "Type", value: "Session" },
                      { label: "Session type", value: selected.mode },
                      { label: "Duration", value: "1 hour" },
                      { label: "Reason", value: selected.reason },
                      { label: "Date & time", value: `${selected.date} • ${selected.time}` },
                      { label: "Counselor", value: selected.counselor?.name || "Counselor" },
                      {
                        label: "Online link",
                        value:
                          selected.mode !== "Online"
                            ? "Not required."
                            : selected.status !== STATUS.APPROVED
                              ? "Available after approval."
                              : selected.meetLink
                                ? "Provided."
                                : "Not yet provided.",
                      },
                      { label: "Submitted", value: selected.createdAt },
                      { label: "Last updated", value: selected.updatedAt || selected.createdAt },
                    ]}
                  />
                </Card>

                <Card title="Student">
                  <KVGrid
                    items={[
                      { label: "Full name", value: selected.student?.name || "—" },
                      { label: "Student ID", value: selected.student?.studentId || "—" },
                      { label: "Email", value: selected.student?.email || "—" },
                      { label: "Campus", value: selected.student?.campus || "—" },
                      { label: "Course", value: selected.student?.courses || "—" },
                    ]}
                  />
                </Card>

                <Card title="Meet link" className="lg:col-span-2">
                  {selected.mode !== "Online" ? (
                    <div className="text-sm font-semibold text-slate-700">In-person request (no Meet link needed).</div>
                  ) : !canEditMeetLink ? (
                    <div className="text-sm font-semibold text-slate-700">
                      {selected.status === STATUS.APPROVED
                        ? "You can add the Google Meet link after approval."
                        : "Approve first, then set the Google Meet link."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        value={meetLinkDraft}
                        onChange={(e) => setMeetLinkDraft(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={saveMeetLink}
                          className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800"
                        >
                          Save
                        </button>

                        {selected.meetLink ? (
                          <>
                            <button
                              onClick={() => copyMeetLink(selected.meetLink)}
                              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                            >
                              Copy
                            </button>
                            <a
                              href={selected.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                            >
                              Open
                            </a>
                          </>
                        ) : (
                          <div className="text-xs font-bold text-slate-500">No link yet.</div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* ✅ NOTES ONLY IN POPUP */}
                <Card title="Notes" className="lg:col-span-2">
                  <div className="notes-scroll text-sm font-semibold text-slate-700 whitespace-pre-wrap break-words">
                    {selected.notes || "—"}
                  </div>
                </Card>

                {isCanceled ? (
                  <Card title="Cancellation details" className="lg:col-span-2">
                    <KVGrid
                      items={[
                        { label: "Canceled on", value: selected.canceledAt || "—" },
                        { label: "Reason", value: selected.cancelNote ? selected.cancelNote : "No cancel reason provided." },
                      ]}
                    />
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </ModalShell>

      {/* CANCEL MODAL */}
      <ModalShell open={openCancel} onClose={() => setOpenCancel(false)}>
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">Cancel request</div>
              <div className="text-xs font-bold text-slate-500 mt-0.5">This will open an email to notify the student.</div>
            </div>
            <button
              onClick={() => setOpenCancel(false)}
              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-3 bg-slate-50">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500">Student email</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 break-words">{selected?.student?.email || "—"}</div>
            </div>

            <textarea
              value={cancelNoteDraft}
              onChange={(e) => setCancelNoteDraft(e.target.value)}
              placeholder="Optional: reason for canceling..."
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
            />

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => setOpenCancel(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={confirmCancelAndEmail}
                className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-amber-600 text-white hover:bg-amber-700"
              >
                Cancel & Email
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500">Note: If student email is missing, the email action will fail.</div>
          </div>
        </div>
      </ModalShell>

      <style>{`
        /* ✅ LIST SCROLLBAR (stress-test) */
        .meet-scroll{
          /* keeps the card compact; list scrolls instead of page getting too long */
          max-height: calc(100vh - 260px);
          overflow: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        /* mobile: give more height */
        @media (max-width: 640px){
          .meet-scroll{ max-height: calc(100vh - 210px); }
        }

        /* ✅ NOTES SCROLLBAR (popup) */
        .notes-scroll{
          max-height: 260px;
          overflow: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding-right: 6px;
        }

        /* nice scrollbar */
        .meet-scroll::-webkit-scrollbar,
        .notes-scroll::-webkit-scrollbar{
          width: 10px;
          height: 10px;
        }
        .meet-scroll::-webkit-scrollbar-thumb,
        .notes-scroll::-webkit-scrollbar-thumb{
          background: rgba(100,116,139,.35);
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.65);
        }
        .meet-scroll::-webkit-scrollbar-track,
        .notes-scroll::-webkit-scrollbar-track{
          background: transparent;
        }
      `}</style>
    </div>
  );
}

// components/CounselorPHQ9.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Counselor PHQ-9 (Frontend-only)
 * Updates:
 * - Custom Course dropdown (full text, wraps, responsive; no overlap)
 * - Sample first-time students with no submissions -> "No Submission"
 * - Modal Close moved to top-right corner (button text, not "×")
 */

const COURSES = [
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

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

const PAGE_SIZE = 5;
const MODAL_PAGE_SIZE = 3;
const CAL_PAGE_SIZE = 3;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDateInputValue(ms) {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputValue(v) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

function formatDateWord(ms) {
  if (!ms || typeof ms !== "number") return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

function formatDateShort(ms) {
  if (!ms || typeof ms !== "number") return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

function formatLastSubmitted(ms, submissions, variant = "short") {
  if (ms && typeof ms === "number") {
    return variant === "word" ? formatDateWord(ms) : formatDateShort(ms);
  }
  const isFirstTime = !Array.isArray(submissions) || submissions.length === 0;
  return isFirstTime ? "No Submission" : "—";
}

function severityLabelFromScore(score) {
  if (score <= 4) return "Minimal";
  if (score <= 9) return "Mild";
  if (score <= 14) return "Moderate";
  return "Moderately High";
}

const SEVERITY_STYLES = {
  Minimal: { pill: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
  Mild: { pill: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Moderate: { pill: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  "Moderately High": { pill: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function makeName(rng) {
  const first = [
    "Ava",
    "Liam",
    "Noah",
    "Emma",
    "Olivia",
    "Sophia",
    "Mia",
    "Isabella",
    "Ethan",
    "Lucas",
    "Mason",
    "Logan",
    "Elijah",
    "James",
    "Benjamin",
    "Amelia",
    "Harper",
    "Evelyn",
    "Abigail",
    "Ella",
    "Aiden",
    "Jayden",
    "Gabriel",
    "Carter",
    "Michael",
    "Daniel",
    "Hannah",
    "Grace",
    "Chloe",
    "Luna",
  ];
  const last = [
    "Santos",
    "Reyes",
    "Cruz",
    "Garcia",
    "Torres",
    "Ramos",
    "Mendoza",
    "Flores",
    "Gonzales",
    "Navarro",
    "Castillo",
    "Villanueva",
    "Domingo",
    "Aquino",
    "Del Rosario",
    "Bautista",
    "De la Cruz",
    "Rivera",
    "Perez",
    "Fernandez",
    "Dela Peña",
    "Salazar",
    "Valdez",
    "Morales",
    "Ortega",
    "Delos Santos",
  ];
  return `${pick(rng, first)} ${pick(rng, last)}`;
}

function makeWeeklySubmissions(rng, nowMs, weeksBack = 16) {
  const subs = [];
  const today = startOfDay(nowMs);

  for (let w = 0; w < weeksBack; w++) {
    const weekAnchor = today - w * WEEK_MS;
    const offsetDays = Math.floor(rng() * 7);
    const submittedAt = weekAnchor - offsetDays * DAY_MS;

    const score = Math.floor(rng() * 28);
    subs.push({
      id: `sub_w${w}_${Math.floor(rng() * 1e9)}`,
      submittedAt,
      score,
      severityLabel: severityLabelFromScore(score),
    });
  }

  subs.sort((a, b) => b.submittedAt - a.submittedAt);
  return subs;
}

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items = [];
  const push = (x) => items.push(x);

  const left = clamp(currentPage - 1, 2, totalPages - 1);
  const right = clamp(currentPage + 1, 2, totalPages - 1);

  push(1);
  if (left > 2) push("...");

  for (let p = left; p <= right; p++) push(p);

  if (right < totalPages - 1) push("...");
  push(totalPages);

  if (!items.includes(currentPage)) {
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages]
      .filter((x) => x === "..." || (typeof x === "number" && x >= 1 && x <= totalPages))
      .reduce((acc, x) => {
        if (acc.length && acc[acc.length - 1] === "..." && x === "...") return acc;
        if (typeof x === "number" && acc.includes(x)) return acc;
        return [...acc, x];
      }, []);
  }

  return items;
}

function Pagination({ page, totalPages, onPageChange }) {
  const reduce = useReducedMotion();
  const items = useMemo(() => getPageItems(page, totalPages), [page, totalPages]);
  if (totalPages <= 1) return null;

  const motionProps = reduce
    ? {}
    : { whileHover: { y: -1 }, whileTap: { scale: 0.98 }, transition: { duration: 0.12 } };

  return (
    <div className="mt-4 select-none">
      <div className="sm:hidden flex items-center justify-between gap-2">
        <motion.button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-10 px-4 rounded-xl border text-[12px] font-extrabold disabled:opacity-40 bg-white hover:bg-slate-50 active:bg-slate-100"
          {...motionProps}
        >
          Prev
        </motion.button>

        <div className="text-[12px] font-extrabold text-slate-600 whitespace-nowrap">
          <span className="tabular-nums text-slate-900 font-black">{page}</span>
          <span className="mx-1 text-slate-400">/</span>
          <span className="tabular-nums text-slate-900 font-black">{totalPages}</span>
        </div>

        <motion.button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="h-10 px-4 rounded-xl border text-[12px] font-extrabold disabled:opacity-40 bg-white hover:bg-slate-50 active:bg-slate-100"
          {...motionProps}
        >
          Next
        </motion.button>
      </div>

      <div className="hidden sm:flex items-center justify-center gap-1.5 flex-wrap">
        <motion.button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2.5 rounded-xl border text-sm font-extrabold disabled:opacity-40 bg-white hover:bg-slate-50 active:bg-slate-100"
          {...motionProps}
        >
          Prev
        </motion.button>

        {items.map((it, idx) =>
          it === "..." ? (
            <span key={`dots_${idx}`} className="px-2 text-sm text-slate-400 font-extrabold">
              …
            </span>
          ) : (
            <motion.button
              key={it}
              type="button"
              onClick={() => onPageChange(it)}
              className={cn(
                "min-w-[44px] px-4 py-2.5 rounded-xl border text-sm font-extrabold transition active:bg-slate-100",
                it === page ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
              )}
              aria-current={it === page ? "page" : undefined}
              {...motionProps}
            >
              {it}
            </motion.button>
          )
        )}

        <motion.button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2.5 rounded-xl border text-sm font-extrabold disabled:opacity-40 bg-white hover:bg-slate-50 active:bg-slate-100"
          {...motionProps}
        >
          Next
        </motion.button>
      </div>
    </div>
  );
}

function SeverityPill({ label }) {
  const meta = SEVERITY_STYLES[label] ?? null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border whitespace-nowrap",
        "px-3 py-1",
        "text-[11px] sm:text-xs font-extrabold leading-none",
        meta ? meta.pill : "border-slate-200 bg-white text-slate-700"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta?.dot ?? "bg-slate-300")} aria-hidden />
      {label ?? "—"}
    </span>
  );
}

function Legend() {
  const labels = [];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
      {labels.map((x) => (
        <div key={x} className="inline-flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", SEVERITY_STYLES[x]?.dot)} aria-hidden />
          <span className="font-extrabold text-slate-600">{x}</span>
        </div>
      ))}
    </div>
  );
}

function Segmented({ value, onChange }) {
  return (
    <div className="w-full sm:w-auto rounded-2xl border bg-white p-1">
      <div className="grid grid-cols-2 sm:flex gap-1">
        {[
          { key: "LIST", label: "Student List" },
          { key: "CAL", label: "Calendar" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "h-11 rounded-2xl text-[13px] sm:text-sm font-extrabold transition px-4",
              value === t.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
// Replace ONLY the CourseDropdown() with this version
// Replace ONLY the CourseDropdown() with this version

function CourseDropdown({ value, onChange, courses }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedLabel = value === "ALL" ? "All Courses" : value;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onPointerDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const panelMotion = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 } };

  const optionBtnBase =
    "w-full text-left px-4 py-3 font-extrabold text-[14px] sm:text-base whitespace-normal break-words leading-snug";

  return (
   <div ref={rootRef} className="relative w-full min-w-0">

    
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selectedLabel}
        className={cn(
          "w-full border bg-white rounded-2xl",
          "px-4 py-2",
          "min-h-11 h-auto",
          "flex items-center justify-between gap-3",
          "hover:bg-slate-50 active:bg-slate-100 transition",
          "min-w-0 text-left"
        )}
      >
        <span className="flex-1 min-w-0 text-slate-900 font-extrabold text-[14px] sm:text-base whitespace-normal break-words leading-snug">
          {selectedLabel}
        </span>
        <span className="shrink-0 text-slate-500 font-black select-none">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={{ duration: reduce ? 0 : 0.14 }}
            className={cn(
              "absolute left-0 right-0 mt-2 z-[1000]",
              "bg-white border shadow-lg rounded-2xl overflow-hidden"
            )}
            role="listbox"
          >
            <div className="max-h-72 overflow-auto">
              <button
                type="button"
                onClick={() => {
                  onChange("ALL");
                  setOpen(false);
                }}
                className={cn(
                  optionBtnBase,
                  value === "ALL" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                )}
                role="option"
                aria-selected={value === "ALL"}
              >
                All Courses
              </button>

              {courses.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cn(
                    optionBtnBase,
                    value === c ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                  role="option"
                  aria-selected={value === c}
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function Modal({ open, title, onClose, children }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => panelRef.current?.focus?.(), 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "relative w-full bg-white shadow-2xl outline-none overflow-hidden",
              "h-full sm:h-auto sm:max-h-[82vh]",
              "rounded-none sm:rounded-2xl",
              "max-w-none sm:max-w-5xl"
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "hidden sm:inline-flex items-center justify-center",
                "absolute top-4 right-4 z-[10]",
                "h-10 px-4 rounded-full border bg-white",
                "hover:bg-slate-50 active:bg-slate-100 transition",
                "text-[12px] sm:text-sm font-black"
              )}
            >
              Close
            </button>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StudentCard({ student, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(student.id)}
      className={cn(
        "w-full text-left bg-white border border-slate-200 shadow-sm transition",
        "rounded-2xl",
        "px-4 py-4",
        "hover:bg-slate-50 active:bg-slate-100",
        "min-w-0"
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="font-black text-slate-900 text-[15px] sm:text-[16px] leading-snug truncate">
            {student.fullName}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <SeverityPill label={student.latestSeverity ?? "—"} />
        </div>
      </div>

      <div className="mt-2 text-[12px] sm:text-[13px] text-slate-700 leading-snug whitespace-normal break-words">
        {student.course}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] sm:text-[13px] font-extrabold text-slate-700">
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="text-slate-500">Last</span>
          <span className="text-slate-900 font-black truncate">
            {formatLastSubmitted(student.latestSubmissionAt, student.submissions, "short")}
          </span>
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="text-slate-500">Score</span>
          <span className="text-slate-900 font-black tabular-nums">{student.latestScore ?? "—"}</span>
        </span>
      </div>
    </button>
  );
}

function SubmissionCard({ sub }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-4 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-500">Date</div>
          <div className="mt-1 font-black text-slate-900 text-[14px] truncate">{formatDateShort(sub.submittedAt)}</div>
        </div>
        <div className="shrink-0 pt-0.5">
          <SeverityPill label={sub.severityLabel} />
        </div>
      </div>

      <div className="mt-3 text-[12px] sm:text-[13px] font-extrabold text-slate-700">
        Score: <span className="text-slate-900 font-black tabular-nums">{sub.score}</span>
      </div>
    </div>
  );
}

function findSubmissionOnDate(subs, dateMs) {
  const key = startOfDay(dateMs);
  for (const s of subs) {
    if (startOfDay(s.submittedAt) === key) return s;
  }
  return null;
}

export default function CounselorPHQ9() {
  const reduce = useReducedMotion();
  const nowMs = useMemo(() => Date.now(), []);
  const todayMs = useMemo(() => startOfDay(nowMs), [nowMs]);

  const dataset = useMemo(() => {
    const students = [];
    const baseSeed = 202610;
    const TOTAL_STUDENTS = 50;

    for (let i = 0; i < TOTAL_STUDENTS; i++) {
      const courseIndex = i % COURSES.length;
      const rng = mulberry32(baseSeed + courseIndex * 1000 + i * 17);
      const fullName = makeName(rng);

      const isFirstTime = i % 8 === 0;
      const submissions = isFirstTime ? [] : makeWeeklySubmissions(rng, nowMs, 16);
      const latest = submissions[0] ?? null;

      students.push({
        id: `stu_${courseIndex}_${i}`,
        fullName,
        course: COURSES[courseIndex],
        submissions,
        latestSubmissionAt: latest?.submittedAt ?? null,
        latestScore: latest?.score ?? null,
        latestSeverity: latest?.severityLabel ?? null,
      });
    }

    return students;
  }, [nowMs]);

  const [view, setView] = useState("LIST");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [modalRange, setModalRange] = useState("30D");
  const [modalPage, setModalPage] = useState(1);

  const [calendarMs, setCalendarMs] = useState(todayMs);
  const [calendarPage, setCalendarPage] = useState(1);

  const calendarResultsRef = useRef(null);
  const modalScrollRef = useRef(null);

  const selectedStudent = useMemo(() => dataset.find((s) => s.id === selectedId) ?? null, [dataset, selectedId]);

  const weeklyOnly = useMemo(() => {
    const weekCutoff = nowMs - WEEK_MS;
    return dataset.filter((s) => {
      const hasRecent = !!s.latestSubmissionAt && s.latestSubmissionAt >= weekCutoff;
      const isFirstTime = (!s.latestSubmissionAt || s.latestSubmissionAt === null) && (s.submissions?.length ?? 0) === 0;
      return hasRecent || isFirstTime;
    });
  }, [dataset, nowMs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return weeklyOnly
      .filter((s) => (courseFilter === "ALL" ? true : s.course === courseFilter))
      .filter((s) => (q ? s.fullName.toLowerCase().includes(q) : true))
      .sort((a, b) => (b.latestSubmissionAt ?? 0) - (a.latestSubmissionAt ?? 0));
  }, [weeklyOnly, courseFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = clamp(page, 1, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [courseFilter, query, view]);

  const openStudent = useCallback((id) => {
    setSelectedId(id);
    setModalRange("30D");
    setModalPage(1);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedId(null);
    setModalPage(1);
  }, []);

  const modalSubmissions = useMemo(() => {
    if (!selectedStudent) return [];
    const subs = selectedStudent.submissions ?? [];
    if (modalRange === "ALL") return subs;
    const cutoff = nowMs - MONTH_MS;
    return subs.filter((x) => x.submittedAt >= cutoff);
  }, [selectedStudent, modalRange, nowMs]);

  const modalTotalPages = Math.max(1, Math.ceil(modalSubmissions.length / MODAL_PAGE_SIZE));
  const safeModalPage = clamp(modalPage, 1, modalTotalPages);

  const modalPaged = useMemo(() => {
    const start = (safeModalPage - 1) * MODAL_PAGE_SIZE;
    return modalSubmissions.slice(start, start + MODAL_PAGE_SIZE);
  }, [modalSubmissions, safeModalPage]);

  useEffect(() => {
    setModalPage(1);
  }, [modalRange, selectedId]);

  useEffect(() => {
    if (modalPage > modalTotalPages) setModalPage(1);
  }, [modalPage, modalTotalPages]);

  useEffect(() => {
    if (!selectedStudent) return;
    const el = modalScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [selectedStudent, modalRange, safeModalPage, reduce]);

  const calendarValue = useMemo(() => toDateInputValue(calendarMs), [calendarMs]);

  const calendarFilled = useMemo(() => {
    const rows = [];
    for (const s of filtered) {
      const sub = findSubmissionOnDate(s.submissions ?? [], calendarMs);
      if (!sub) continue;
      rows.push({ student: s, sub });
    }
    rows.sort((a, b) => (b.sub.score ?? 0) - (a.sub.score ?? 0));
    return rows;
  }, [filtered, calendarMs]);

  const calendarTotalPages = Math.max(1, Math.ceil(calendarFilled.length / CAL_PAGE_SIZE));
  const safeCalendarPage = clamp(calendarPage, 1, calendarTotalPages);

  const calendarPagedRows = useMemo(() => {
    const start = (safeCalendarPage - 1) * CAL_PAGE_SIZE;
    return calendarFilled.slice(start, start + CAL_PAGE_SIZE);
  }, [calendarFilled, safeCalendarPage]);

  useEffect(() => {
    setCalendarPage(1);
  }, [calendarMs, courseFilter, query, view]);

  useEffect(() => {
    if (view !== "CAL") return;
    if (reduce) return;
    calendarResultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [view, safeCalendarPage, calendarMs, reduce]);

  const sectionMotion = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 } };

  const listContentMotion = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -18 } };

  return (
  <div className="w-full min-w-0 max-w-full">
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3 sm:px-6 py-4 sm:py-6 min-w-0">
    <div className="text-[18px] sm:text-2xl font-black text-slate-900">PHQ-9</div>
    <div className="mt-3 text-base sm:text-lg font-extrabold text-slate-600">
      Students with PHQ-9 submissions
    </div>

    {/* Controls row */}
    <div className="mt-3 sm:mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between min-w-0">
      <div className="hidden sm:flex items-center gap-3 flex-wrap min-w-0">
        <Legend />
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full lg:w-auto min-w-0">
        <div className="w-full sm:w-auto shrink-0">
          <Segmented value={view} onChange={setView} />
        </div>

        <div className="w-full sm:w-[360px] lg:w-[440px] shrink-0 min-w-0">
          <CourseDropdown
            value={courseFilter}
            onChange={setCourseFilter}
            courses={COURSES}
          />
        </div>
      </div>

      <div className="sm:hidden">
        <Legend />
      </div>
    </div>

    {/* Search bar row (moved DOWN, full width) */}
    <div className="mt-3 w-full min-w-0">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, student ID..."
        className={cn(
          "h-11 w-full rounded-2xl border bg-white font-extrabold",
          "text-[13px] sm:text-sm",
          "px-4 min-w-0"
        )}
      />
    </div>
  </div>

  <div className="h-3 sm:h-4" />



      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={sectionMotion.initial}
          animate={sectionMotion.animate}
          exit={sectionMotion.exit}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="will-change-transform min-w-0"
        >
          {view === "LIST" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col min-w-0">
              <div className="px-3 sm:px-4 py-3 border-b flex items-center justify-between gap-2 min-w-0">
                <div className="text-[13px] sm:text-[15px] font-black text-slate-800 min-w-0">
                  Student List <span className="text-slate-500 font-extrabold">({filtered.length})</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${safePage}_${courseFilter}_${query}`}
                  initial={listContentMotion.initial}
                  animate={listContentMotion.animate}
                  exit={listContentMotion.exit}
                  transition={{ duration: reduce ? 0 : 0.18 }}
                  className="will-change-transform min-w-0"
                >
                  <div className="sm:hidden p-3 bg-slate-50 min-w-0">
                    {paged.length === 0 ? (
                      <div className="py-10 text-center text-slate-500 font-extrabold text-[13px]">
                        No students found.
                      </div>
                    ) : (
                      <div className="grid gap-3 min-w-0">
                        {paged.map((s) => (
                          <StudentCard key={s.id} student={s} onOpen={openStudent} />
                        ))}
                      </div>
                    )}

                    <div className="pb-2">
                      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col flex-1 min-w-0">
                    <div className="overflow-x-auto flex-1">
  <table className="min-w-[1200px] w-full text-sm">

                        <thead className="bg-slate-50 border-b">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-black text-slate-700">Student</th>
                            <th className="px-4 py-3 font-black text-slate-700">Course</th>
                            <th className="px-4 py-3 font-black text-slate-700 whitespace-nowrap">Last Submitted</th>
                            <th className="px-4 py-3 font-black text-slate-700">Severity</th>
                            <th className="px-4 py-3 font-black text-slate-700 text-right">Score</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {paged.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-500 font-extrabold">
                                No students found.
                              </td>
                            </tr>
                          ) : (
                            paged.map((s) => (
                              <tr
                                key={s.id}
                                className="hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition"
                                onClick={() => openStudent(s.id)}
                              >
                                <td className="px-4 py-3 font-black text-slate-900">{s.fullName}</td>
                                <td className="px-4 py-3 text-slate-700">{s.course}</td>
                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                  {formatLastSubmitted(s.latestSubmissionAt, s.submissions, "word")}
                                </td>
                                <td className="px-4 py-3">
                                  <SeverityPill label={s.latestSeverity ?? "—"} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-black text-slate-900 tabular-nums">{s.latestScore ?? "—"}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-4 mt-auto">
                      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {view === "CAL" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col min-w-0">
              <div className="px-3 sm:px-4 py-4 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto min-w-0">
                  <input
                    type="date"
                    value={calendarValue}
                    onChange={(e) => {
                      const ms = fromDateInputValue(e.target.value);
                      if (ms != null) setCalendarMs(ms);
                    }}
                    className="h-11 px-4 rounded-2xl border bg-white text-[13px] sm:text-sm font-extrabold w-full sm:w-[220px]"
                  />
                  <button
                    type="button"
                    onClick={() => setCalendarMs(todayMs)}
                    className="h-11 px-4 rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 text-[13px] sm:text-sm font-extrabold w-full sm:w-auto transition"
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="px-3 sm:px-4 py-4 flex-1 min-w-0" ref={calendarResultsRef}>
                <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap min-w-0">
                  <div className="text-[11px] sm:text-sm font-black text-slate-800 break-words min-w-0">
                    Filled up on <span className="text-slate-900">{formatDateWord(calendarMs)}</span>{" "}
                    <span className="text-slate-500 font-extrabold">({calendarFilled.length})</span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-extrabold text-slate-500">
                    Tap a student to view all submissions
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`cal_${calendarMs}_${safeCalendarPage}`}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, x: 24 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                    transition={{ duration: reduce ? 0 : 0.18 }}
                    className="flex flex-col will-change-transform min-w-0"
                  >
                    <div className="sm:hidden mt-4 bg-slate-50 p-3 rounded-2xl border min-w-0">
                      {calendarPagedRows.length === 0 ? (
                        <div className="py-10 text-center text-slate-500 font-extrabold text-[13px]">
                          No submissions found.
                        </div>
                      ) : (
                        <div className="grid gap-3 min-w-0">
                          {calendarPagedRows.map(({ student, sub }) => (
                            <StudentCard
                              key={`${student.id}_${sub.id}`}
                              student={{
                                ...student,
                                latestSubmissionAt: sub.submittedAt,
                                latestScore: sub.score,
                                latestSeverity: sub.severityLabel,
                              }}
                              onOpen={openStudent}
                            />
                          ))}
                        </div>
                      )}

                      <div className="pb-2">
                        <Pagination page={safeCalendarPage} totalPages={calendarTotalPages} onPageChange={setCalendarPage} />
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col flex-1 mt-4 min-w-0">
                      <div className="border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-[1200px] w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                              <tr className="text-left">
                                <th className="px-4 py-3 font-black text-slate-700">Student</th>
                                <th className="px-4 py-3 font-black text-slate-700">Course</th>
                                <th className="px-4 py-3 font-black text-slate-700 whitespace-nowrap">Submitted</th>
                                <th className="px-4 py-3 font-black text-slate-700">Severity</th>
                                <th className="px-4 py-3 font-black text-slate-700 text-right">Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {calendarPagedRows.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 font-extrabold">
                                    No submissions found.
                                  </td>
                                </tr>
                              ) : (
                                calendarPagedRows.map(({ student, sub }) => (
                                  <tr
                                    key={`${student.id}_${sub.id}`}
                                    className="hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition"
                                    onClick={() => openStudent(student.id)}
                                  >
                                    <td className="px-4 py-3 font-black text-slate-900">{student.fullName}</td>
                                    <td className="px-4 py-3 text-slate-700">{student.course}</td>
                                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                      {formatDateWord(sub.submittedAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <SeverityPill label={sub.severityLabel} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-black text-slate-900 tabular-nums">{sub.score}</span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="pb-2 mt-auto">
                        <Pagination page={safeCalendarPage} totalPages={calendarTotalPages} onPageChange={setCalendarPage} />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Modal open={!!selectedStudent} title="Student PHQ Submissions" onClose={closeModal}>
        {selectedStudent && (
          <div className="flex flex-col h-full sm:h-auto min-w-0">
            <div className="px-4 sm:px-6 py-4 border-b min-w-0">
              <div className="min-w-0 pr-24">
                <div className="text-base sm:text-xl font-black text-slate-900 truncate">{selectedStudent.fullName}</div>

                <div className="text-[12px] sm:text-sm text-slate-700 mt-2 whitespace-normal break-words">
                  {selectedStudent.course}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SeverityPill label={selectedStudent.latestSeverity ?? "—"} />
                  <div className="text-[12px] sm:text-xs font-extrabold text-slate-700">
                    Latest score:{" "}
                    <span className="text-slate-900 font-black tabular-nums">{selectedStudent.latestScore ?? "—"}</span>
                  </div>
                  <div className="text-[12px] sm:text-xs font-extrabold text-slate-600">
                    Last submitted:{" "}
                    <span className="text-slate-900">
                      {formatLastSubmitted(selectedStudent.latestSubmissionAt, selectedStudent.submissions, "word")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm font-black text-slate-800">PHQ Results</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalRange("30D")}
                  className={cn(
                    "h-11 px-4 rounded-2xl border text-[12px] font-black transition active:bg-slate-100",
                    modalRange === "30D" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
                  )}
                >
                  Last 30 days
                </button>
                <button
                  type="button"
                  onClick={() => setModalRange("ALL")}
                  className={cn(
                    "h-11 px-4 rounded-2xl border text-[12px] font-black transition active:bg-slate-100",
                    modalRange === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
                  )}
                >
                  All
                </button>
              </div>
            </div>

            <div ref={modalScrollRef} className="px-4 sm:px-6 py-4 overflow-auto flex-1 min-w-0 bg-slate-50">
              {modalSubmissions.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-extrabold text-[13px]">
                  No PHQ submissions in this range.
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${modalRange}_${safeModalPage}`}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, x: 24 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                    transition={{ duration: reduce ? 0 : 0.18 }}
                    className="will-change-transform min-w-0"
                  >
                    <div className="sm:hidden grid gap-3 min-w-0">
                      {modalPaged.map((sub) => (
                        <SubmissionCard key={sub.id} sub={sub} />
                      ))}
                    </div>

                    <div className="hidden sm:block overflow-x-auto border rounded-2xl bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-black text-slate-700">Date</th>
                            <th className="px-4 py-3 font-black text-slate-700 text-right">Score</th>
                            <th className="px-4 py-3 font-black text-slate-700">Severity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {modalPaged.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50 active:bg-slate-100 transition">
                              <td className="px-4 py-3 text-slate-700">{formatDateWord(sub.submittedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-black text-slate-900 tabular-nums">{sub.score}</span>
                              </td>
                              <td className="px-4 py-3">
                                <SeverityPill label={sub.severityLabel} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pb-2">
                      <Pagination page={safeModalPage} totalPages={modalTotalPages} onPageChange={setModalPage} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t bg-white sm:hidden">
              <button
                type="button"
                onClick={closeModal}
                className="h-12 w-full rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 font-black transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
}

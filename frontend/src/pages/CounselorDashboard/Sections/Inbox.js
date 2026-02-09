// src/pages/CounselorDashboard/Sections/Inbox.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "framer-motion";
import Lottie from "lottie-react";
import messageAnim from "../../../assets/lottie/Message.json";

/* -----------------------------
  Fixed vocab
----------------------------- */
const MOODS = ["Happy", "Calm", "Okay", "Stressed", "Sad", "Angry", "Fear", "Surprise", "Disgust"];
const MOOD_EMOJI = {
  Happy: "😄",
  Calm: "😌",
  Okay: "🙂",
  Stressed: "😣",
  Sad: "😢",
  Angry: "😠",
  Fear: "😨",
  Surprise: "😮",
  Disgust: "🤢",
};

function MoodLabel({ mood }) {
  const emo = MOOD_EMOJI[mood] || "•";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden="true">
        {emo}
      </span>
      <span className="whitespace-nowrap">{mood}</span>
    </span>
  );
}

const REASONS = ["School", "Family", "Friends", "Health", "Other"];
const COPING_OPTIONS = [
  "Deep breathing",
  "Walk / exercise",
  "Talk to friend",
  "Music",
  "Journaling",
  "Meditation",
  "Prayer",
  "Sleep / rest",
  "Grounding (5-4-3-2-1)",
  "Counselor session",
];

/* -----------------------------
  Chat emoji picker (chatbox only)
----------------------------- */
const CHAT_EMOJIS = ["😀", "😄", "😂", "😊", "😉", "😍", "🥰", "😢", "😡", "👍", "🙏", "❤️", "🎉", "👋"];

function insertTextAtCursor(textareaEl, currentValue, insertText) {
  const el = textareaEl;
  const value = String(currentValue ?? "");
  const start = typeof el?.selectionStart === "number" ? el.selectionStart : value.length;
  const end = typeof el?.selectionEnd === "number" ? el.selectionEnd : value.length;
  const next = value.slice(0, start) + insertText + value.slice(end);
  const caret = start + insertText.length;
  return { next, caret };
}

function EmojiPickButton({ emoji, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={[
        "h-9 w-9 max-[360px]:h-8 max-[360px]:w-8 grid place-items-center",
        "rounded-[10px] border border-slate-200 bg-white",
        "text-base leading-none",
        "hover:bg-slate-50 active:scale-[0.98] transition",
        "focus:outline-none focus:ring-4 focus:ring-slate-100",
      ].join(" ")}
      aria-label={`Insert ${emoji}`}
      title={`Insert ${emoji}`}
    >
      <span aria-hidden="true">{emoji}</span>
    </button>
  );
}

/* -----------------------------
  Helpers
----------------------------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function ymd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(arr, idx) {
  return arr[idx % arr.length];
}

function scrollToBottomAfterPaint(ref, tries = 60) {
  const attempt = () => {
    const el = ref?.current;
    if (!el) {
      if (tries-- > 0) requestAnimationFrame(attempt);
      return;
    }

    const before = el.scrollTop;
    el.scrollTop = el.scrollHeight;

    const moved = el.scrollTop !== before;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;

    if ((!atBottom || !moved) && tries-- > 0) requestAnimationFrame(attempt);
  };

  requestAnimationFrame(attempt);
}

function parseYmdParts(s) {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function monthKey(ymdStr) {
  const p = parseYmdParts(ymdStr);
  if (!p) return null;
  return `${p.y}-${pad2(p.mo)}`;
}

function sameMonth(a, b) {
  const ka = monthKey(a);
  const kb = monthKey(b);
  return !!ka && ka === kb;
}

function isOnOrBefore(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return String(a).localeCompare(String(b)) <= 0;
}

/* -----------------------------
  Scoring (Mood + Reason + Coping)
----------------------------- */
function moodToLevel(mood) {
  if (!mood) return null;
  if (mood === "Angry") return 0;
  if (mood === "Stressed") return 1;
  if (mood === "Sad" || mood === "Fear" || mood === "Disgust") return 1;
  if (mood === "Okay" || mood === "Surprise") return 2;
  if (mood === "Calm" || mood === "Happy") return 3;
  return 2;
}

const REASON_WEIGHT = {
  School: -0.15,
  Family: -0.1,
  Friends: 0.1,
  Health: -0.15,
  Other: 0,
};

const COPING_WEIGHT = {
  "Deep breathing": 0.15,
  "Walk / exercise": 0.2,
  "Talk to friend": 0.18,
  Music: 0.12,
  Journaling: 0.15,
  Meditation: 0.18,
  Prayer: 0.15,
  "Sleep / rest": 0.1,
  "Grounding (5-4-3-2-1)": 0.18,
  "Counselor session": 0.22,
};

function scoreEntry(e) {
  const level = moodToLevel(e?.mood);
  if (typeof level !== "number" || !Number.isFinite(level)) return null;
  const rw = REASON_WEIGHT[e?.reason] ?? 0;
  const cw = COPING_WEIGHT[e?.coping] ?? 0;
  return level + rw + cw;
}

function linearRegressionSlope(values) {
  const pts = safeArray(values)
    .map((y, i) => ({ x: i + 1, y }))
    .filter((p) => typeof p.y === "number" && Number.isFinite(p.y));

  if (pts.length < 2) return null;

  const n = pts.length;
  const sumX = pts.reduce((a, p) => a + p.x, 0);
  const sumY = pts.reduce((a, p) => a + p.y, 0);
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  return (n * sumXY - sumX * sumY) / denom;
}

function avg(values) {
  const pts = safeArray(values).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!pts.length) return null;
  return pts.reduce((a, b) => a + b, 0) / pts.length;
}

function trendMeta(slope) {
  if (slope == null) return { label: "No trend", arrow: "—", badge: "bg-slate-50 text-slate-700 border-slate-200" };
  if (slope > 0.06) return { label: "Improving", arrow: "↗", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (slope < -0.06) return { label: "Declining", arrow: "↘", badge: "bg-rose-50 text-rose-800 border-rose-200" };
  return { label: "Stable", arrow: "→", badge: "bg-amber-50 text-amber-900 border-amber-200" };
}

/* -----------------------------
  Sparkline
----------------------------- */
function Sparkline({ values }) {
  const reduceMotion = useReducedMotion();
  const pts = safeArray(values).filter((v) => typeof v === "number" && Number.isFinite(v));

  const W = 360;
  const H = 88;
  const PAD_X = 10;
  const PAD_Y = 10;

  const idRef = useRef(`sp-${Math.random().toString(16).slice(2)}`);

  if (pts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
        Not enough data
      </div>
    );
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);

  const normY = (v) => {
    const innerH = H - PAD_Y * 2;
    if (max === min) return PAD_Y + innerH / 2;
    const t = (v - min) / (max - min);
    return PAD_Y + (1 - t) * innerH;
  };

  const step = pts.length === 1 ? 0 : (W - PAD_X * 2) / (pts.length - 1);

  const points = pts.map((v, i) => ({
    x: PAD_X + i * step,
    y: normY(v),
  }));

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${d} L ${(PAD_X + (pts.length - 1) * step).toFixed(1)} ${(H - PAD_Y).toFixed(1)} L ${PAD_X.toFixed(
    1
  )} ${(H - PAD_Y).toFixed(1)} Z`;

  const last = points[points.length - 1];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <svg className="w-full h-[96px]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Mood regression sparkline">
        <defs>
          <linearGradient id={`${idRef.current}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${idRef.current}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.65" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <g className="text-slate-200" stroke="currentColor" strokeWidth="1" opacity="0.55">
          <line x1="0" y1={H * 0.33} x2={W} y2={H * 0.33} />
          <line x1="0" y1={H * 0.66} x2={W} y2={H * 0.66} />
        </g>

        <motion.path
          d={areaD}
          fill={`url(#${idRef.current}-fill)`}
          className="text-slate-900"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />

        <motion.path
          d={d}
          fill="none"
          stroke={`url(#${idRef.current}-stroke)`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-900"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }}
        />

        {points.map((p, i) => (
          <circle
            key={`${p.x}-${p.y}-${i}`}
            cx={p.x}
            cy={p.y}
            r={pts.length <= 8 ? 2.6 : 2.2}
            className="text-slate-900"
            fill="currentColor"
            opacity={0.9}
          />
        ))}

        {pts.length >= 1 ? (
          <>
            <motion.circle
              cx={last.x}
              cy={last.y}
              r="4.2"
              className="text-slate-900"
              fill="currentColor"
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0.85 }}
              animate={reduceMotion ? { scale: 1, opacity: 0.85 } : { scale: [1, 1.35, 1], opacity: [0.9, 0.25, 0.9] }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle cx={last.x} cy={last.y} r="3.4" className="text-slate-900" fill="currentColor" />
          </>
        ) : null}
      </svg>

      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
        <span>min {min.toFixed(2)}</span>
        <span>max {max.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* -----------------------------
  Mock data: 50 participants
----------------------------- */
function buildMockParticipants(count = 50) {
  const today = new Date();
  const firstNames = ["Aly", "Bea", "Cai", "Dan", "Eli", "Fae", "Gio", "Han", "Ian", "Jae", "Kai", "Lia", "Mia", "Noa", "Oli", "Pia", "Rae", "Sam", "Tia", "Uli"];
  const lastNames = ["Santos", "Reyes", "Cruz", "Garcia", "Flores", "Ramos", "Mendoza", "Gomez", "Torres", "Navarro", "Castillo", "Aquino", "Bautista", "Valdez", "Mercado"];

  const BASE_STUDENT_ID = 2201267;

  return Array.from({ length: count }, (_, i) => {
    const seed = 2000 + i * 41;
    const rand = mulberry32(seed);

    const anonymous = rand() < 0.35;
    const name = anonymous ? null : `${pick(firstNames, i)} ${pick(lastNames, i * 3)}`;

    const id = `P-${String(i + 1).padStart(3, "0")}`;
    const studentId = anonymous ? null : `#${BASE_STUDENT_ID + i}`;

    const threadLen = clamp(Math.floor(rand() * 8) + 4, 6, 14);
    const thread = Array.from({ length: threadLen }, (_, k) => ({
      id: `${id}-m${k + 1}`,
      by: k % 2 === 0 ? "Participant" : "Counselor",
      at: `${pad2(clamp(9 + (k % 7), 9, 18))}:${pad2(Math.floor(rand() * 59))}`,
      text: k % 2 === 0 ? "I’ve been feeling overwhelmed and it’s hard to focus." : "Thanks for sharing. What’s been the hardest part recently?",
    }));

    const entryCount = clamp(10 + Math.floor(rand() * 10), 10, 20);
    const moodEntries = Array.from({ length: entryCount }, () => {
      const daysAgo = clamp(Math.floor(rand() * 28), 0, 28);
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);

      const mood = pick(MOODS, Math.floor(rand() * MOODS.length));
      const reason = pick(REASONS, Math.floor(rand() * REASONS.length));
      const coping = pick(COPING_OPTIONS, Math.floor(rand() * COPING_OPTIONS.length));

      return { date: ymd(d), mood, reason, coping };
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const hoursAgo = Math.floor(rand() * 72);
    const minsAgo = Math.floor(rand() * 60);
    const lastActivity = today.getTime() - hoursAgo * 60 * 60 * 1000 - minsAgo * 60 * 1000;

    const lastSeen = ymd(new Date(lastActivity));
    const lastMessage = thread[thread.length - 1]?.text || "—";
    const unread = rand() < 0.4;

    return {
      id,
      studentId,
      anonymous,
      displayName: anonymous ? `Anonymous (${id})` : name,
      read: !unread,
      lastSeen,
      lastMessage,
      lastActivity,
      thread,
      moodTracking: { entries: moodEntries },
    };
  });
}

/* -----------------------------
  UI primitives
----------------------------- */
function Avatar({ label }) {
  const initials = String(label || "?")
    .replace(/Anonymous (Participant|Student)\s*\([^)]+\)/i, "Anonymous")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-sm">
      {initials || "A"}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles =
    tone === "unread"
      ? "bg-indigo-50 text-indigo-800 border-indigo-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${styles}`}>
      {children}
    </span>
  );
}

/* -----------------------------
  Animated Inbox List
----------------------------- */
function AnimatedItem({ children, delay = 0, index, onMouseEnter, onClick }) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.98, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.98, opacity: 0 }}
      transition={{ duration: 0.18, delay }}
      className="cursor-pointer"
    >
      {children}
    </motion.div>
  );
}

function AnimatedInboxList({
  items,
  selectedId,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  displayScrollbar = true,
  className = "",
  containerStyle = {},
}) {
  const listRef = useRef(null);

  const initialIndex = Math.max(0, safeArray(items).findIndex((x) => x?.id === selectedId));
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  useEffect(() => {
    const idx = safeArray(items).findIndex((x) => x?.id === selectedId);
    if (idx >= 0) setSelectedIndex(idx);
  }, [selectedId, items]);

  const handleItemMouseEnter = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item, index) => {
      setSelectedIndex(index);
      onItemSelect?.(item, index);
    },
    [onItemSelect]
  );

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useEffect(() => {
    if (!enableArrowNavigation) return;

    const handleKeyDown = (e) => {
      if (!listRef.current) return;

      // ✅ prevent changing chats while typing / tapping controls (emoji picker, textarea, search, etc.)
      const t = e.target;
      const tag = t?.tagName;
      if (t?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          onItemSelect?.(items[selectedIndex], selectedIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;

    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({ top: itemBottom - containerHeight + extraMargin, behavior: "smooth" });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={listRef}
        className={[
          "h-full min-h-0 overflow-y-auto",
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-[10px]"
            : "scrollbar-hide",
        ].join(" ")}
        onScroll={handleScroll}
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: displayScrollbar ? "#e2e8f0 #ffffff" : undefined,
          ...containerStyle,
        }}
      >
        <div className="divide-y divide-slate-100">
          {items.map((x, index) => {
            const active = x.id === selectedId;
            const hoverSelected = selectedIndex === index;

            return (
              <AnimatedItem
                key={x.id}
                delay={0.03}
                index={index}
                onMouseEnter={() => handleItemMouseEnter(index)}
                onClick={() => handleItemClick(x, index)}
              >
                <button
                  className={[
                    "w-full text-left px-4 py-3 transition flex gap-3",
                    active ? "bg-slate-50" : "bg-white hover:bg-slate-50/70",
                    !active && hoverSelected ? "ring-1 ring-slate-200" : "",
                  ].join(" ")}
                  type="button"
                >
                  <Avatar label={x.displayName} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-sm font-black text-slate-900 truncate leading-none">{x.displayName}</div>
                          {!x.read ? <Badge tone="unread">Unread</Badge> : null}
                        </div>

                        {!x.anonymous && x.studentId ? (
                          <div className="mt-1 text-[12px] font-bold text-slate-500 truncate">Student ID: {x.studentId}</div>
                        ) : null}
                      </div>

                      <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap text-right tabular-nums leading-none shrink-0">
                        {x.lastSeen}
                      </div>
                    </div>

                    <div className="mt-1 text-[13px] font-semibold text-slate-600 truncate">{x.lastMessage}</div>
                  </div>
                </button>
              </AnimatedItem>
            );
          })}
        </div>
      </div>

      {showGradients ? (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[44px] bg-gradient-to-b from-white to-transparent pointer-events-none transition-opacity duration-300 ease"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[90px] bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-300 ease"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      ) : null}
    </div>
  );
}

/* -----------------------------
  Messenger-like chat area
----------------------------- */
function ChatBubble({ by, text }) {
  const isCounselor = by === "Counselor";

  return (
    <div className={["flex items-start gap-2.5", isCounselor ? "justify-end" : "justify-start"].join(" ")}>
      {!isCounselor ? (
        <div className="shrink-0">
          <Avatar label="Student" />
        </div>
      ) : null}

      <div
        className={[
          "flex flex-col w-full",
          "max-w-[88%] sm:max-w-[420px] lg:max-w-[520px]",
          "leading-1.5 p-4 border shadow-[0_1px_0_rgba(0,0,0,0.03)]",
          isCounselor ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200",
          isCounselor ? "rounded-s-2xl rounded-tr-2xl rounded-br-md" : "rounded-e-2xl rounded-tl-2xl rounded-bl-md",
        ].join(" ")}
      >
        <p className={["text-sm whitespace-pre-wrap break-words", isCounselor ? "text-white" : "text-slate-700"].join(" ")}>{text}</p>

        <span className={["mt-2 text-[11px] font-bold", isCounselor ? "text-right text-white/70" : "text-left text-slate-400"].join(" ")}>
          {isCounselor ? "Delivered" : "Seen"}
        </span>
      </div>
    </div>
  );
}

/* -----------------------------
  Mood Tracker (unchanged)
----------------------------- */
function MoodTracker({ moodTracking, day, onPickDay }) {
  const entries = safeArray(moodTracking?.entries).filter((e) => e?.date);
  const sorted = useMemo(() => [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date))), [entries]);

  const [flashHistory, setFlashHistory] = useState(false);
  const lastMonthRef = useRef(monthKey(day));

  useEffect(() => {
    const mk = monthKey(day);
    if (!mk) return;

    if (lastMonthRef.current !== mk) {
      lastMonthRef.current = mk;
      setFlashHistory(true);
      const t = window.setTimeout(() => setFlashHistory(false), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [day]);

  const monthEntriesAll = useMemo(() => sorted.filter((e) => sameMonth(e?.date, day)), [sorted, day]);
  const monthEntriesToDay = useMemo(
    () => monthEntriesAll.filter((e) => isOnOrBefore(String(e?.date || ""), String(day))),
    [monthEntriesAll, day]
  );

  const byDate = useMemo(() => {
    const m = new Map();
    for (const e of monthEntriesToDay) {
      const d = String(e?.date || "");
      if (!d) continue;
      const s = scoreEntry(e);
      if (typeof s !== "number" || !Number.isFinite(s)) continue;
      const arr = m.get(d) || [];
      arr.push(s);
      m.set(d, arr);
    }
    return m;
  }, [monthEntriesToDay]);

  const monthDatesToDay = useMemo(() => Array.from(byDate.keys()).sort((a, b) => String(a).localeCompare(String(b))), [byDate]);

  const last30DaysSeries = useMemo(() => {
    const last30Dates = monthDatesToDay.slice(-30);
    return last30Dates
      .map((d) => avg(byDate.get(d) || []))
      .filter((v) => typeof v === "number" && Number.isFinite(v));
  }, [monthDatesToDay, byDate]);

  const last7DaysSeries = useMemo(() => {
    const last7Dates = monthDatesToDay.slice(-7);
    return last7Dates
      .map((d) => avg(byDate.get(d) || []))
      .filter((v) => typeof v === "number" && Number.isFinite(v));
  }, [monthDatesToDay, byDate]);

  const last30Slope = linearRegressionSlope(last30DaysSeries);
  const last7Slope = linearRegressionSlope(last7DaysSeries);

  const last30Trend = trendMeta(last30Slope);
  const last7Trend = trendMeta(last7Slope);

  const last30Avg = avg(last30DaysSeries);
  const last7Avg = avg(last7DaysSeries);

  const historyEntries = useMemo(() => monthEntriesAll, [monthEntriesAll]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 flex-wrap shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div>
          <div className="text-sm font-black text-slate-900">Mood Tracker</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Mood • Reason • Coping • Trends</div>
        </div>
        <input
          type="date"
          value={day}
          onChange={(e) => onPickDay(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-extrabold border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] xl:col-span-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-black text-slate-900">Regression Trend</div>
              <div className="mt-1 text-xs font-bold text-slate-500">Overall vs Recent (last 7)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-700">Last 30 Days</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${last30Trend.badge}`}>
                  {last30Trend.arrow} {last30Trend.label}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  avg {last30Avg == null ? "—" : last30Avg.toFixed(2)} • n {last30DaysSeries.length}
                </span>
              </div>
              <div className="mt-2">
                <Sparkline values={last30DaysSeries} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-700">Last 7</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${last7Trend.badge}`}>
                  {last7Trend.arrow} {last7Trend.label}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  avg {last7Avg == null ? "—" : last7Avg.toFixed(2)} • n {last7DaysSeries.length}
                </span>
              </div>
              <div className="mt-2">
                <Sparkline values={last7DaysSeries} />
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold text-slate-500">Trend is computed from Mood + Reason + Coping scores</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="text-sm font-black text-slate-900">History</div>

        <div
          className={[
            "mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white",
            "[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-[10px]",
          ].join(" ")}
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 #ffffff" }}
        >
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <div className="hidden sm:grid grid-cols-[140px_110px_minmax(160px,1fr)_minmax(160px,1fr)] gap-3 px-3 py-2 text-[11px] font-extrabold text-slate-500">
              <div>Date</div>
              <div>Mood</div>
              <div>Reason</div>
              <div>Coping</div>
            </div>

            <div className="sm:hidden px-3 py-2 text-[11px] font-extrabold text-slate-500">Entries</div>
          </div>

          <div className="divide-y divide-slate-100">
            {flashHistory ? null : historyEntries.length === 0 ? (
              <div className="px-3 py-3 text-sm font-semibold text-slate-500">No mood entries.</div>
            ) : (
              historyEntries
                .slice()
                .reverse()
                .map((e, index) => (
                  <AnimatedRow key={`${e.date}-${e.mood}-${index}`} index={index} delay={0.02}>
                    <div className="hidden sm:grid grid-cols-[140px_110px_minmax(160px,1fr)_minmax(160px,1fr)] gap-3 px-3 py-2 text-sm font-semibold text-slate-700">
                      <div className="whitespace-nowrap">
                        <button onClick={() => onPickDay(e.date)} className="font-extrabold text-slate-900 hover:underline" type="button">
                          {e.date}
                        </button>
                      </div>
                      <div className="whitespace-nowrap">
                        <MoodLabel mood={e.mood} />
                      </div>

                      <div className="min-w-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-[15px] border border-slate-200 bg-slate-50 text-[12px] font-extrabold text-slate-700">
                          {e.reason}
                        </span>
                      </div>
                      <div className="min-w-0 whitespace-normal break-words">{e.coping}</div>
                    </div>

                    <div className="sm:hidden px-3 py-3 text-sm font-semibold text-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={() => onPickDay(e.date)} className="font-extrabold text-slate-900 hover:underline" type="button">
                          {e.date}
                        </button>
                        <span className="text-xs font-extrabold text-slate-600">{e.mood}</span>
                      </div>

                      <div className="text-[12px] font-bold text-slate-500">
                        Reason:{" "}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[15px] border border-slate-200 bg-slate-50 text-[12px] font-extrabold text-slate-700">
                          {e.reason}
                        </span>
                      </div>
                      <div className="text-[12px] font-bold text-slate-500">
                        Coping: <span className="font-semibold text-slate-700 break-words">{e.coping}</span>
                      </div>
                    </div>
                  </AnimatedRow>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedRow({ children, index, delay = 0.02 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.35, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      initial={{ scale: 0.98, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.98, opacity: 0 }}
      transition={{ duration: 0.18, delay }}
      className="cursor-default"
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

/* -----------------------------
  Conversation Pane
----------------------------- */
function ConversationPane({
  selected,
  tab,
  setTab,
  moodDisabled,
  day,
  setDay,
  draft,
  setDraft,
  send,
  chatScrollRef,
  onBack,
  showBack,
  isMobileAnimated,
}) {
  const reduceMotion = useReducedMotion();
  const start = useRef({ x: 0, y: 0, t: 0 });
  const swiping = useRef(false);

  const inputRef = useRef(null);
  const emojiWrapRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    if (!emojiOpen) return undefined;

    const onDown = (e) => {
      const wrap = emojiWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target)) return;
      setEmojiOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [emojiOpen]);

  const addEmojiToDraft = useCallback(
    (emoji) => {
      const { next, caret } = insertTextAtCursor(inputRef.current, draft, emoji);
      setDraft(next);
      setEmojiOpen(false);

      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          // ignore
        }
      });
    },
    [draft, setDraft]
  );

  const pane = (
    <>
      <div className="shrink-0 sticky top-0 z-30 px-4 py-3 border-b border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {selected ? <Avatar label={selected.displayName} /> : <Avatar label="—" />}

            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">{selected?.displayName || "Select a conversation"}</div>
              <div className="text-[12px] font-bold text-slate-500 truncate">
                {selected ? (!selected.anonymous && selected.studentId ? <>Student ID: {selected.studentId}</> : null) : "Choose a student from the list"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showBack ? (
              <button
                onClick={onBack}
                className={[
                  "h-10 w-10 grid place-items-center",
                  "rounded-[10px] border border-slate-200 bg-white text-slate-700",
                  "hover:bg-slate-50 transition shrink-0",
                  "focus:outline-none focus:ring-4 focus:ring-slate-100",
                ].join(" ")}
                type="button"
                aria-label="Back"
                title="Back"
              >
                <IconBack className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onBack}
                className={[
                  "h-10 px-3 inline-flex items-center gap-2",
                  "rounded-[10px] border border-slate-200 bg-white text-slate-700",
                  "hover:bg-slate-50 transition",
                  "focus:outline-none focus:ring-4 focus:ring-slate-100",
                ].join(" ")}
                type="button"
                aria-label="Close conversation"
                title="Close conversation"
              >
                <span className="text-sm font-extrabold">Close</span>
              </button>
            )}
          </div>
        </div>

        <LayoutGroup id="segmented-tabs">
          <div className="w-full">
            <div className="mx-auto w-full max-w-full sm:max-w-[520px] lg:max-w-[560px]">
              <div className="relative grid grid-cols-2 rounded-[10px] border border-slate-200 bg-white p-1 overflow-hidden">
                <motion.div
                  className="absolute top-1 bottom-1 left-1 rounded-[8px] bg-slate-900 shadow-sm"
                  initial={false}
                  animate={{ x: tab === "chat" ? 0 : "calc(100% + 4px)" }}
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  style={{ width: "calc(50% - 4px)" }}
                />

                <motion.button
                  type="button"
                  onClick={() => setTab("chat")}
                  whileTap={{ scale: 0.98 }}
                  className={[
                    "relative z-10 w-full rounded-full",
                    "px-2.5 sm:px-4 py-2",
                    "text-xs sm:text-sm font-extrabold select-none",
                    "inline-flex items-center justify-center gap-2 min-w-0",
                    tab === "chat" ? "text-white" : "text-slate-700 hover:text-slate-900",
                  ].join(" ")}
                >
                  <IconChat className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
                  <span className="truncate">Messages</span>
                </motion.button>

                <motion.button
                  type="button"
                  disabled={moodDisabled}
                  onClick={() => !moodDisabled && setTab("mood")}
                  whileTap={moodDisabled ? undefined : { scale: 0.98 }}
                  className={[
                    "relative z-10 w-full rounded-full",
                    "px-2.5 sm:px-4 py-2",
                    "text-xs sm:text-sm font-extrabold select-none",
                    "inline-flex items-center justify-center gap-2 min-w-0",
                    moodDisabled ? "text-slate-400 cursor-not-allowed" : tab === "mood" ? "text-white" : "text-slate-700 hover:text-slate-900",
                  ].join(" ")}
                  title={moodDisabled ? "Mood Tracker is not available for anonymous students" : undefined}
                >
                  <IconMood className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Mood</span>
                    <span className="hidden sm:inline">Mood Tracker</span>
                  </span>
                </motion.button>
              </div>
            </div>
          </div>
        </LayoutGroup>
      </div>

      {!selected ? (
        <div className="flex-1 min-h-0 px-4 py-8 text-sm font-semibold text-slate-500">Pick a student from the left.</div>
      ) : (
        <>
          {tab === "chat" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3"
                style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}
              >
                <div className="flex justify-center">
                  <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                    {selected.read ? "Seen" : "Delivered"} • {selected.lastSeen}
                  </span>
                </div>

                {safeArray(selected.thread).map((m) => (
                  <ChatBubble key={m.id} by={m.by} text={m.text} />
                ))}
              </div>

              <div className="shrink-0 sticky bottom-2 z-20 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+24px)]">
                {/* ✅ wrapper is relative so the emoji popup can be centered within viewport */}
                <div ref={emojiWrapRef} className="relative flex items-end gap-2 max-[360px]:gap-1.5 min-w-0">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={1}
                    placeholder="Type a message…"
                    className="flex-1 min-w-0 resize-none rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        setEmojiOpen(false);
                        send();
                      }
                      if (e.key === "Escape") setEmojiOpen(false);
                    }}
                  />

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((v) => !v)}
                      className={[
                        "h-[46px] w-[46px] max-[360px]:h-10 max-[360px]:w-10 grid place-items-center",
                        "rounded-[10px] border border-slate-200 bg-white text-slate-700",
                        "hover:bg-slate-50 transition",
                        "focus:outline-none focus:ring-4 focus:ring-slate-100",
                      ].join(" ")}
                      aria-label="Insert emoji"
                      title="Emoji"
                    >
                      <IconEmoji className="w-5 h-5 max-[360px]:w-[18px] max-[360px]:h-[18px]" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setEmojiOpen(false);
                      send();
                    }}
                    type="button"
                    aria-label="Send"
                    className="shrink-0 h-[46px] max-[360px]:h-10 px-4 max-[360px]:px-3 rounded-[10px] text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 shadow-sm inline-flex items-center justify-center"
                  >
                    <span className="max-[360px]:hidden">Send</span>
                    <span className="hidden max-[360px]:inline-flex" aria-hidden="true">
                      <IconSend className="w-5 h-5" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {emojiOpen ? (
                      // ✅ wrapper centers popup without fighting Framer Motion transforms
                      <div className="absolute bottom-[54px] left-1/2 z-50 w-[260px] max-w-[92vw] -translate-x-1/2">
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
                          className="rounded-2xl border border-slate-200 bg-white shadow-lg p-2"
                        >
                          <div className="grid grid-cols-5 min-[360px]:grid-cols-6 min-[420px]:grid-cols-7 gap-1">
                            {CHAT_EMOJIS.map((emo) => (
                              <EmojiPickButton key={emo} emoji={emo} onPick={() => addEmojiToDraft(emo)} />
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="mt-1 text-[11px] font-bold text-slate-400">Enter = send • Shift+Enter = new line</div>
              </div>
            </div>
          ) : null}

          {tab === "mood" ? (
            <div className="h-full min-h-0 overflow-y-auto bg-slate-50 p-4">
              {selected.anonymous ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                  <div className="text-sm font-black text-slate-900">Mood Tracker locked</div>
                  <div className="mt-2 text-sm font-semibold text-slate-600">This student is anonymous, so mood history is not available.</div>
                </div>
              ) : (
                <MoodTracker moodTracking={selected.moodTracking} day={day} onPickDay={setDay} />
              )}
            </div>
          ) : null}
        </>
      )}
    </>
  );

  if (!isMobileAnimated) {
    return <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0">{pane}</section>;
  }

  return (
    <motion.section
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0"
      initial={reduceMotion ? false : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { x: 60, opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
        swiping.current = true;
      }}
      onPointerMove={(e) => {
        if (!swiping.current) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) swiping.current = false;
      }}
      onPointerUp={() => {
        if (!swiping.current) return;
        swiping.current = false;
      }}
      style={{ touchAction: "pan-y" }}
    >
      {pane}
    </motion.section>
  );
}

/* -----------------------------
  Icons
----------------------------- */
function IconBack({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChat({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M7.5 18.5 4 20V6.8C4 5.8 4.8 5 5.8 5H18.2C19.2 5 20 5.8 20 6.8V14.2C20 15.2 19.2 16 18.2 16H9.2L7.5 18.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M7.5 9h9M7.5 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMood({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.8 14.2c1.1 1.3 2.5 2 4.2 2s3.1-.7 4.2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconEmoji({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 10h.01M15.5 10h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M8.4 14.2c1 1.2 2.2 1.8 3.6 1.8s2.6-.6 3.6-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSend({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 15 22l-4-9-9-4L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -----------------------------
  Main component
----------------------------- */
export default function Inbox() {
  const today = useMemo(() => ymd(new Date()), []);
  const [desktopPaneOpen, setDesktopPaneOpen] = useState(true);
  const seeded = useMemo(() => buildMockParticipants(50), []);
  const [items, setItems] = useState(seeded);
  const [scrollKey, setScrollKey] = useState(0);
  const [selectedId, setSelectedId] = useState(items?.[0]?.id || "");
  const [tab, setTab] = useState("chat");
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const [day, setDay] = useState(today);
  const [draft, setDraft] = useState("");
  const [showConversation, setShowConversation] = useState(false);

  const closeDesktopConversation = () => {
    setDesktopPaneOpen(false);
    setSelectedId("");
    setTab("chat");
    setDraft("");
  };

  const activityOf = useCallback((x) => {
    const ts = typeof x?.lastActivity === "number" && Number.isFinite(x.lastActivity) ? x.lastActivity : null;
    if (ts != null) return ts;
    const d = Date.parse(String(x?.lastSeen || ""));
    return Number.isFinite(d) ? d : 0;
  }, []);

  const list = useMemo(() => {
    let base = [...items].sort((a, b) => activityOf(b) - activityOf(a));

    if (filterUnread) base = base.filter((x) => !x.read);

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((x) => {
      const name = (x.displayName || "").toLowerCase();
      const sid = (x.studentId || "").toLowerCase();
      const msg = (x.lastMessage || "").toLowerCase();
      return name.includes(q) || sid.includes(q) || msg.includes(q);
    });
  }, [items, filterUnread, search, activityOf]);

  const selected = useMemo(() => items.find((x) => x.id === selectedId) || null, [items, selectedId]);
  const moodDisabled = !!selected?.anonymous;

  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (!selected) return;
    if (tab !== "chat") return;
    if (!showConversation && window.innerWidth < 1024) return;
    scrollToBottomAfterPaint(chatScrollRef, 60);
  }, [selected?.id, tab, selected?.thread?.length, scrollKey, showConversation]);

  const markRead = (id) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));

  const selectChat = (id) => {
    setSelectedId(id);
    markRead(id);
    setTab("chat");
    setDay(today);
    setDraft("");
    setShowConversation(true);
    setDesktopPaneOpen(true);
    requestAnimationFrame(() => setScrollKey((k) => k + 1));
  };

  const send = () => {
    if (!selected) return;
    const text = draft.trim();
    if (!text) return;

    const now = new Date();
    const at = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const ts = now.getTime();

    const next = {
      ...selected,
      thread: [...safeArray(selected.thread), { id: `${selected.id}-c-${Date.now()}`, by: "Counselor", at, text }],
      lastMessage: text,
      read: true,
      lastSeen: ymd(now),
      lastActivity: ts,
    };

    setItems((prev) => prev.map((x) => (x.id === selected.id ? next : x)));
    setDraft("");
    setScrollKey((k) => k + 1);
  };

  const InboxList = (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-black text-slate-900">Student List</div>
          <button
            onClick={() => setFilterUnread((v) => !v)}
            className={[
              "px-3 py-2 rounded-xl text-sm font-extrabold transition border",
              filterUnread ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
            type="button"
          >
            Unread
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="flex-1 min-h-0">
        {list.length === 0 ? (
          <div className="px-4 py-6 text-sm font-semibold text-slate-500">No results.</div>
        ) : (
          <AnimatedInboxList
            items={list}
            selectedId={selectedId}
            onItemSelect={(item) => selectChat(item.id)}
            showGradients
            enableArrowNavigation
            displayScrollbar
            className="h-full min-h-0"
            containerStyle={{}}
          />
        )}
      </div>
    </section>
  );

  return (
    <div className="h-full min-h-0 min-w-0" style={{ fontFamily: 'Nunito, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial' }}>
      <div className="lg:hidden h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {!showConversation ? (
              <motion.div
                key="list"
                className="flex-1 min-h-0 flex flex-col"
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {InboxList}
              </motion.div>
            ) : (
              <motion.div key="conversation" className="flex-1 min-h-0 flex flex-col">
                <ConversationPane
                  selected={selected}
                  tab={tab}
                  setTab={setTab}
                  moodDisabled={moodDisabled}
                  day={day}
                  setDay={setDay}
                  draft={draft}
                  setDraft={setDraft}
                  send={send}
                  chatScrollRef={chatScrollRef}
                  showBack
                  onBack={() => setShowConversation(false)}
                  isMobileAnimated
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="hidden lg:block h-full min-h-0">
        <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {InboxList}

          {desktopPaneOpen ? (
            <ConversationPane
              selected={selected}
              tab={tab}
              setTab={setTab}
              moodDisabled={moodDisabled}
              day={day}
              setDay={setDay}
              draft={draft}
              setDraft={setDraft}
              send={send}
              chatScrollRef={chatScrollRef}
              showBack={false}
              onBack={closeDesktopConversation}
              isMobileAnimated={false}
            />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="h-full min-h-0 flex items-center justify-center bg-slate-50 px-6">
                <div className="text-center max-w-[420px]">
                  <div className="mx-auto w-[220px] sm:w-[260px]">
                    <Lottie animationData={messageAnim} loop autoplay className="w-full h-auto" />
                  </div>

                  <div className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Select a conversation</div>
                  <div className="mt-2 text-base sm:text-lg font-semibold text-slate-600">Choose a student from the list to view messages.</div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

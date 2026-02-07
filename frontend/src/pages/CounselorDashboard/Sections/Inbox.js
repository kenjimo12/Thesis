// src/pages/CounselorDashboard/Sections/Inbox.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Messenger-like UI + Mood Tracker (enhanced)
 * - UI-only (NO backend)
 * - Anonymous participants: Mood Tracker is locked (cannot view)
 * - Coping: single value only
 */

/* -----------------------------
   Fixed vocab
----------------------------- */
const MOODS = ["Happy", "Calm", "Okay", "Stressed", "Sad", "Angry", "Fear", "Surprise", "Disgust"];
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

/**
 * Mood score mapping for regression
 * Higher = better
 */
const MOOD_SCORE = {
  Happy: 9,
  Calm: 8,
  Okay: 6,
  Surprise: 6,
  Stressed: 4,
  Fear: 3,
  Sad: 2,
  Disgust: 2,
  Angry: 1,
};

function linearRegressionSlope(values) {
  const pts = safeArray(values)
    .map((y, i) => ({ x: i + 1, y }))
    .filter((p) => typeof p.y === "number" && Number.isFinite(p.y));
  if (pts.length < 3) return null;

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
  if (slope > 0.12) return { label: "Improving", arrow: "↗", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (slope < -0.12) return { label: "Declining", arrow: "↘", badge: "bg-rose-50 text-rose-800 border-rose-200" };
  return { label: "Stable", arrow: "→", badge: "bg-amber-50 text-amber-900 border-amber-200" };
}

function Sparkline({ values }) {
  const pts = safeArray(values).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (pts.length < 2) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
        Not enough data
      </div>
    );
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const w = 220;
  const h = 46;

  const normY = (v) => {
    if (max === min) return h / 2;
    const t = (v - min) / (max - min);
    return h - t * h;
  };

  const step = w / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${Math.round(i * step)} ${Math.round(normY(v))}`).join(" ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Mood regression sparkline">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-900" />
      </svg>
      <div className="mt-1 text-[11px] font-bold text-slate-500">
        min {min} • max {max}
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
  const topics = ["Academic pressure", "Family conflict", "Anxiety", "Peer issues", "Sleep problems", "Burnout"];

  return Array.from({ length: count }, (_, i) => {
    const seed = 2000 + i * 41;
    const rand = mulberry32(seed);

    const anonymous = rand() < 0.35;
    const name = anonymous ? null : `${pick(firstNames, i)} ${pick(lastNames, i * 3)}`;

    const id = `P-${String(i + 1).padStart(3, "0")}`;
    const topic = pick(topics, i * 2);

    const threadLen = clamp(Math.floor(rand() * 8) + 4, 6, 14);
    const thread = Array.from({ length: threadLen }, (_, k) => ({
      id: `${id}-m${k + 1}`,
      by: k % 2 === 0 ? "Participant" : "Counselor",
      at: `${pad2(clamp(9 + (k % 7), 9, 18))}:${pad2(Math.floor(rand() * 59))}`,
      text:
        k % 2 === 0
          ? "I’ve been feeling overwhelmed and it’s hard to focus."
          : "Thanks for sharing. What’s been the hardest part recently?",
    }));

    const entryCount = clamp(10 + Math.floor(rand() * 10), 10, 20);
    const moodEntries = Array.from({ length: entryCount }, () => {
      const daysAgo = clamp(Math.floor(rand() * 28), 0, 28);
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);

      const mood = pick(MOODS, Math.floor(rand() * MOODS.length));
      const reason = pick(REASONS, Math.floor(rand() * REASONS.length));

      // ✅ Only 1 coping
      const coping = pick(COPING_OPTIONS, Math.floor(rand() * COPING_OPTIONS.length));

      return { date: ymd(d), mood, reason, coping };
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const lastSeen = ymd(today);
    const lastMessage = thread[thread.length - 1]?.text || "—";
    const unread = rand() < 0.4;

    return {
      id,
      anonymous,
      displayName: anonymous ? `Anonymous Participant (${id})` : name,
      topic,
      read: !unread,
      lastSeen,
      lastMessage,
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
    .replace(/Anonymous Participant\s*\([^)]+\)/i, "Anonymous")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
      {initials || "A"}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles =
    tone === "anon"
      ? "bg-slate-900 text-white border-slate-900"
      : tone === "unread"
      ? "bg-indigo-50 text-indigo-800 border-indigo-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${styles}`}>
      {children}
    </span>
  );
}

function Tab({ active, disabled, onClick, children }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "px-3 py-2 rounded-xl text-sm font-extrabold transition border",
        disabled ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "",
        !disabled && active ? "bg-slate-900 text-white border-slate-900" : "",
        !disabled && !active ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" : "",
      ].join(" ")}
      type="button"
      title={disabled ? "Mood Tracker is not available for anonymous participants" : undefined}
    >
      {children}
    </button>
  );
}

/* -----------------------------
   Messenger-like chat area
----------------------------- */
function ChatBubble({ by, text, at }) {
  const isCounselor = by === "Counselor";
  return (
    <div className={["flex", isCounselor ? "justify-end" : "justify-start"].join(" ")}>
      <div className={["max-w-[78%] space-y-1", isCounselor ? "items-end" : "items-start"].join(" ")}>
        <div
          className={[
            "px-3.5 py-2.5 rounded-2xl text-sm font-semibold leading-relaxed whitespace-pre-wrap break-words border",
            isCounselor
              ? "bg-slate-900 text-white border-slate-900 rounded-br-md"
              : "bg-white text-slate-800 border-slate-200 rounded-bl-md",
          ].join(" ")}
        >
          {text}
        </div>
        <div className={["text-[11px] font-bold text-slate-400", isCounselor ? "text-right" : "text-left"].join(" ")}>
          {at}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Mood Tracker (enhanced)
----------------------------- */
function MoodTracker({ moodTracking, day, onPickDay }) {
  const entries = safeArray(moodTracking?.entries).filter((e) => e?.date);
  const sorted = [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const found = sorted.find((e) => e.date === day) || null;

  const overallSeries = sorted.map((e) => MOOD_SCORE[e.mood]).filter((v) => typeof v === "number" && Number.isFinite(v));
  const last7Series = overallSeries.slice(-7);

  const overallSlope = linearRegressionSlope(overallSeries);
  const last7Slope = linearRegressionSlope(last7Series);

  const overall = trendMeta(overallSlope);
  const recent = trendMeta(last7Slope);

  const overallAvg = avg(overallSeries);
  const recentAvg = avg(last7Series);

  return (
    <div className="space-y-3">
      {/* Control row */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-black text-slate-900">Mood Tracker</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Mood • Reason • Coping (single) • Trends</div>
        </div>
        <input
          type="date"
          value={day}
          onChange={(e) => onPickDay(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-extrabold border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
        />
      </div>

      {/* Snapshot + trends */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-black text-slate-900">Day Snapshot</div>
              <div className="mt-1 text-xs font-bold text-slate-500">
                Selected: <span className="font-extrabold text-slate-700">{day}</span>
              </div>
            </div>
            {found ? <Badge>Mood: {found.mood}</Badge> : <Badge>—</Badge>}
          </div>

          {!found ? (
            <div className="mt-3 text-sm font-semibold text-slate-500">No entry for this date.</div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Reason: {found.reason}</Badge>
                <Badge>Coping: {found.coping}</Badge>
              </div>

              {/* Quick pick from recent dates */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs font-extrabold text-slate-700">Recent days</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sorted
                    .slice(-8)
                    .reverse()
                    .map((e) => (
                      <button
                        key={`${e.date}-${e.mood}`}
                        onClick={() => onPickDay(e.date)}
                        className={[
                          "px-3 py-1.5 rounded-xl text-xs font-extrabold border transition",
                          e.date === day
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                        type="button"
                      >
                        {e.date.slice(5)} • {e.mood}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-black text-slate-900">Regression Trend</div>
              <div className="mt-1 text-xs font-bold text-slate-500">Overall vs Recent (last 7)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-700">Overall</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${overall.badge}`}>
                  {overall.arrow} {overall.label}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  avg {overallAvg == null ? "—" : overallAvg.toFixed(2)} • n {overallSeries.length}
                </span>
              </div>
              <div className="mt-2">
                <Sparkline values={overallSeries} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-700">Last 7</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${recent.badge}`}>
                  {recent.arrow} {recent.label}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  avg {recentAvg == null ? "—" : recentAvg.toFixed(2)} • n {last7Series.length}
                </span>
              </div>
              <div className="mt-2">
                <Sparkline values={last7Series} />
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Score mapping: Happy/Calm high • Angry/Sad/Disgust low
          </div>
        </div>
      </div>

      {/* Compact history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-black text-slate-900">History</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-extrabold text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Mood</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3">Coping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={`${e.date}-${e.mood}`} className="text-sm font-semibold text-slate-700">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <button
                        onClick={() => onPickDay(e.date)}
                        className="font-extrabold text-slate-900 hover:underline"
                        type="button"
                      >
                        {e.date}
                      </button>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.mood}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.reason}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.coping}</td>
                  </tr>
                ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-sm font-semibold text-slate-500">
                    No mood entries.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Main component
----------------------------- */
export default function Inbox() {
  const today = useMemo(() => ymd(new Date()), []);
  const seeded = useMemo(() => buildMockParticipants(50), []);
  const [items, setItems] = useState(seeded);

  const [selectedId, setSelectedId] = useState(items?.[0]?.id || "");
  const [tab, setTab] = useState("chat"); // chat | mood
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const [day, setDay] = useState(today);
  const [draft, setDraft] = useState("");

  const list = useMemo(() => {
    let base = items;
    if (filterUnread) base = base.filter((x) => !x.read);

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((x) => {
      const name = (x.displayName || "").toLowerCase();
      const topic = (x.topic || "").toLowerCase();
      const msg = (x.lastMessage || "").toLowerCase();
      return name.includes(q) || topic.includes(q) || msg.includes(q);
    });
  }, [items, filterUnread, search]);

  const selected = useMemo(() => items.find((x) => x.id === selectedId) || null, [items, selectedId]);

  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [selectedId, selected?.thread?.length, tab]);

  const markRead = (id) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));

  const selectChat = (id) => {
    setSelectedId(id);
    markRead(id);
    setTab("chat");
    setDay(today);
    setDraft("");
  };

  const send = () => {
    if (!selected) return;
    const text = draft.trim();
    if (!text) return;

    const now = new Date();
    const at = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    const next = {
      ...selected,
      thread: [...safeArray(selected.thread), { id: `${selected.id}-c-${Date.now()}`, by: "Counselor", at, text }],
      lastMessage: text,
    };

    setItems((prev) => prev.map((x) => (x.id === selected.id ? next : x)));
    setDraft("");
  };

  const moodDisabled = !!selected?.anonymous;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
      {/* LEFT: Messenger-like list */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-black text-slate-900">Student List</div>
            <button
              onClick={() => setFilterUnread((v) => !v)}
              className={[
                "px-3 py-2 rounded-xl text-sm font-extrabold transition border",
                filterUnread ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
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

        <div className="h-[78vh] overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-4 py-6 text-sm font-semibold text-slate-500">No results.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((x) => {
                const active = x.id === selectedId;
                return (
                  <button
                    key={x.id}
                    onClick={() => selectChat(x.id)}
                    className={[
                      "w-full text-left px-4 py-3 transition flex gap-3",
                      active ? "bg-slate-50" : "bg-white hover:bg-slate-50/70",
                    ].join(" ")}
                    type="button"
                  >
                    <Avatar label={x.displayName} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-black text-slate-900 truncate">{x.displayName}</div>
                            {x.anonymous ? <Badge tone="anon">Anonymous</Badge> : null}
                            {!x.read ? <Badge tone="unread">Unread</Badge> : null}
                          </div>
                          <div className="mt-0.5 text-[12px] font-bold text-slate-500 truncate">{x.topic}</div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{x.lastSeen}</div>
                      </div>

                      <div className="mt-1 text-[13px] font-semibold text-slate-600 truncate">{x.lastMessage}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT: Messenger-like conversation */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {selected ? <Avatar label={selected.displayName} /> : <Avatar label="—" />}
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">{selected?.displayName || "Select a chat"}</div>
              <div className="text-[12px] font-bold text-slate-500 truncate">
                {selected ? (
                  <>
                    {selected.topic}
                    {selected.anonymous ? " • Anonymous Participant" : ""}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tab active={tab === "chat"} onClick={() => setTab("chat")}>
              Messages
            </Tab>
            <Tab active={tab === "mood"} disabled={moodDisabled} onClick={() => setTab("mood")}>
              Mood Tracker
            </Tab>
          </div>
        </div>

        {!selected ? (
          <div className="px-4 py-8 text-sm font-semibold text-slate-500">Pick a student from the left.</div>
        ) : (
          <>
            {tab === "chat" ? (
              <div className="h-[78vh] flex flex-col">
                {/* Scroll area */}
                <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
                  <div className="flex justify-center">
                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                      {selected.read ? "Seen" : "Delivered"} • {selected.lastSeen}
                    </span>
                  </div>

                  {safeArray(selected.thread).map((m) => (
                    <ChatBubble key={m.id} by={m.by} text={m.text} at={m.at} />
                  ))}
                </div>

                {/* Sticky composer */}
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={1}
                      placeholder="Type a message…"
                      className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-slate-100"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    <button
                      onClick={send}
                      className="px-4 py-3 rounded-2xl text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800"
                      type="button"
                    >
                      Send
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">Enter = send • Shift+Enter = new line</div>
                </div>
              </div>
            ) : null}

            {tab === "mood" ? (
              <div className="h-[78vh] overflow-y-auto bg-slate-50 p-4">
                {selected.anonymous ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="text-sm font-black text-slate-900">Mood Tracker locked</div>
                    <div className="mt-2 text-sm font-semibold text-slate-600">
                      This participant is anonymous, so mood history is not available.
                    </div>
                  </div>
                ) : (
                  <MoodTracker moodTracking={selected.moodTracking} day={day} onPickDay={setDay} />
                )}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===================== THEME ===================== */
const LOGIN_PRIMARY = "#B9FF66";
const TEXT_MAIN = "#141414";
const TEXT_MUTED = "rgba(20,20,20,0.72)";
const CARD_BG = "#ffffff";
const BORDER = "1px solid rgba(0,0,0,0.12)";

const STORAGE_KEY = "checkin:journal_entries_v2";

/* ===================== HELPERS ===================== */
function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function ymdToDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===================== DATA ===================== */
const MOODS = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "calm", label: "Calm", emoji: "😌" },
  { key: "okay", label: "Okay", emoji: "🙂" },
  { key: "stressed", label: "Stressed", emoji: "😣" },
  { key: "sad", label: "Sad", emoji: "😞" },
  { key: "angry", label: "Angry", emoji: "😠" },
];

const TAGS = ["School", "Family", "Friends", "Health", "Other"];

// Coping options (dropdown)
const COPING_OPTIONS = ["Breathing", "Talked to someone", "Walk / Stretch", "Rest", "Music", "Prayer"];

// Coping quick chips
const COPING_QUICK = ["Breathing", "Music", "Walk / Stretch", "Rest", "Prayer", "Talked to someone"];

// Emoji picker categories
const EMOJI_CATS = [
  { name: "Mood", list: ["🙂", "😄", "😌", "😣", "😞", "😠", "🥲", "😭", "😴"] },
  { name: "Support", list: ["🙏", "💛", "❤️", "✨", "👍", "🫶", "🤍", "🌿", "☀️"] },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ===================== STYLES ===================== */
const cardStyle = { background: CARD_BG, borderRadius: 18, border: BORDER, padding: 16 };

const btnBase = {
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const primaryBtn = {
  ...btnBase,
  border: "2px solid #000",
  background: LOGIN_PRIMARY,
  boxShadow: "3px 3px 0 #000",
};

/* ===================== SVG ICONS ===================== */
function IconMood({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="#141414" strokeWidth="2" />
      <path d="M8.2 10.2h.01" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path d="M15.8 10.2h.01" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M8.2 15.2c1.2 1.1 2.5 1.6 3.8 1.6s2.6-.5 3.8-1.6"
        stroke="#141414"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEmoji({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="#141414" strokeWidth="2" />
      <path d="M9 10.5h.01" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 10.5h.01" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M8.5 14.8c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"
        stroke="#141414"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M7.2 3.8c1.1-.5 2.4-.8 3.8-.8 1.6 0 3 .3 4.2.9" stroke="#141414" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ===================== MODAL ===================== */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="noPrint"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "min(1000px, 100%)",
          background: "#fff",
          borderRadius: 18,
          border: "2px solid #000",
          boxShadow: "8px 8px 0 #000",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: BORDER,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ ...btnBase, height: 36, padding: "0 10px" }}>
            Close
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* ===================== EXPORT TEXT ===================== */
function normalizeNotesBlocks(entry) {
  // Backward compatible: old entries may have "notes" as string
  if (Array.isArray(entry?.notesBlocks)) return entry.notesBlocks;
  const old = typeof entry?.notes === "string" ? entry.notes : "";
  const trimmed = old.trim();
  return trimmed ? [trimmed] : [""];
}
function formatExportText(entry) {
  const m = MOODS.find((x) => x.key === entry.mood);
  const blocks = normalizeNotesBlocks(entry).map((b) => (b || "").trim()).filter(Boolean);
  const notesText = blocks.length ? blocks.map((b, i) => `(${i + 1}) ${b}`).join("\n\n") : "—";

  return (
    `CHECKIN JOURNAL\n` +
    `Date: ${entry.date}\n` +
    `Mood: ${m ? `${m.label}` : "—"}\n` +
    `Intensity: ${entry.moodIntensity}/5\n` +
    `Energy: ${entry.energy}/5\n` +
    `Stress: ${entry.stress}/5\n` +
    `Tags: ${entry.tags?.join(", ") || "—"}\n` +
    `Coping: ${entry.copingUsed?.join(", ") || "—"}\n\n` +
    `Gratitude: ${entry.gratitude || "—"}\n` +
    `Win: ${entry.win || "—"}\n\n` +
    `Notes:\n${notesText}\n`
  );
}

/* ===================== CALENDAR ===================== */
function monthName(d) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}
function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();

  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length < 42) days.push(null);
  return days;
}

/* ===================== SMALL UI ===================== */
function SliderPill({ label, value, onChange, left = "Low", mid = "Okay", right = "High" }) {
  return (
    <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 14, border: BORDER, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 1000, fontSize: 13 }}>{label}</div>
        <div style={{ fontWeight: 1000, color: "rgba(20,20,20,0.65)", fontSize: 12 }}>{value}/5</div>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: LOGIN_PRIMARY }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TEXT_MUTED, fontWeight: 900 }}>
        <span>{left}</span>
        <span>{mid}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export default function Journal() {
  const [date, setDate] = useState(isoDate());

  // Entry fields
  const [mood, setMood] = useState("");
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);

  const [tags, setTags] = useState([]);
  const [copingUsed, setCopingUsed] = useState([]);

  // ✅ Multiple Notes Blocks
  const [notesBlocks, setNotesBlocks] = useState([""]);
  const [activeNoteIdx, setActiveNoteIdx] = useState(0);
  const notesRefs = useRef([]); // array of textarea refs

  const [gratitude, setGratitude] = useState("");
  const [win, setWin] = useState("");

  // Emoji picker
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [toast, setToast] = useState("");

  // History modal + calendar
  const [historyOpen, setHistoryOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [pickedDay, setPickedDay] = useState(null);

  // History details popup
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);

  // Delete confirm modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = safeParse(raw || "[]", []);
    setEntries(Array.isArray(list) ? list : []);
  }, []);

  const persist = (next) => {
    setEntries(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const resetForm = () => {
    setMood("");
    setMoodIntensity(3);
    setEnergy(3);
    setStress(3);
    setTags([]);
    setCopingUsed([]);
    setNotesBlocks([""]);
    setActiveNoteIdx(0);
    setGratitude("");
    setWin("");
  };

  // Load entry when date changes
  useEffect(() => {
    const found = entries.find((e) => e.date === date);
    if (!found) return resetForm();

    setMood(found.mood || "");
    setMoodIntensity(found.moodIntensity ?? 3);
    setEnergy(found.energy ?? 3);
    setStress(found.stress ?? 3);
    setTags(Array.isArray(found.tags) ? found.tags : []);
    setCopingUsed(Array.isArray(found.copingUsed) ? found.copingUsed : []);

    // ✅ notes blocks migration
    const blocks = Array.isArray(found.notesBlocks)
      ? found.notesBlocks
      : typeof found.notes === "string"
      ? (found.notes.trim() ? [found.notes] : [""])
      : [""];
    setNotesBlocks(blocks.length ? blocks : [""]);
    setActiveNoteIdx(0);

    setGratitude(found.gratitude || "");
    setWin(found.win || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const moodObj = useMemo(() => MOODS.find((x) => x.key === mood), [mood]);
  const moodLabel = useMemo(() => (moodObj ? `${moodObj.label}` : "—"), [moodObj]);

  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const set = new Set(entries.map((e) => e.date));
    let count = 0;
    const d = new Date();
    while (true) {
      const day = isoDate(d);
      if (!set.has(day)) break;
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries]);

  const toggleInList = (value, listSetter) => {
    listSetter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const setNoteRef = (idx) => (el) => {
    notesRefs.current[idx] = el;
  };

  const updateNoteBlock = (idx, value) => {
    setNotesBlocks((prev) => prev.map((b, i) => (i === idx ? value : b)));
  };

  const addNoteBlock = () => {
    setNotesBlocks((prev) => [...prev, ""]);
    const nextIdx = notesBlocks.length; // new index
    setActiveNoteIdx(nextIdx);
    requestAnimationFrame(() => {
      const el = notesRefs.current[nextIdx];
      if (el) el.focus();
    });
  };

  const removeNoteBlock = (idx) => {
    setNotesBlocks((prev) => {
      if (prev.length <= 1) return [""]; // always keep at least one
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [""];
    });
    setActiveNoteIdx((prevIdx) => {
      if (idx === prevIdx) return Math.max(0, prevIdx - 1);
      if (idx < prevIdx) return prevIdx - 1;
      return prevIdx;
    });
  };

  const insertEmojiToActiveNote = (emoji) => {
    const idx = Math.min(activeNoteIdx, notesBlocks.length - 1);
    const el = notesRefs.current[idx];

    if (!el) {
      updateNoteBlock(idx, (notesBlocks[idx] || "") + emoji);
      return;
    }

    const current = notesBlocks[idx] || "";
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + emoji + current.slice(end);

    updateNoteBlock(idx, next);

    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    const onDown = (e) => {
      if (!emojiOpen) return;
      const btn = emojiBtnRef.current;
      if (btn && btn.contains(e.target)) return;
      const pop = document.getElementById("emoji-popover");
      if (pop && pop.contains(e.target)) return;
      setEmojiOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  const buildPayload = () => ({
    date,
    mood,
    moodIntensity,
    energy,
    stress,
    tags,
    copingUsed,
    // ✅ new model
    notesBlocks: notesBlocks.map((b) => (b ?? "").trimEnd()),
    // keep old field for compatibility/export readability
    notes: notesBlocks.map((b) => (b ?? "").trim()).filter(Boolean).join("\n\n"),
    gratitude: gratitude.trim(),
    win: win.trim(),
    updatedAt: new Date().toISOString(),
  });

  const saveEntry = () => {
    const payload = buildPayload();
    const next = (() => {
      const exists = entries.some((e) => e.date === date);
      if (exists) return entries.map((e) => (e.date === date ? payload : e));
      return [payload, ...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
    })();

    persist(next);
    setToast("Saved");
    setTimeout(() => setToast(""), 1000);
  };

  const deleteEntry = () => {
    const next = entries.filter((e) => e.date !== date);
    persist(next);
    setToast("Deleted");
    setTimeout(() => setToast(""), 1000);
    resetForm();
  };

  const exportEntry = () => {
    const found = entries.find((e) => e.date === date) || buildPayload();
    downloadText(`journal-${date}.txt`, formatExportText(found));
  };

  const printEntry = () => window.print();

  /* ===================== HISTORY ===================== */
  const entriesByDate = useMemo(() => {
    const map = new Map();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const selectedHistoryEntry = useMemo(() => {
    if (!pickedDay) return null;
    return entriesByDate.get(pickedDay) || null;
  }, [pickedDay, entriesByDate]);

  // ✅ Month/Year jump options
  const yearOptions = useMemo(() => {
    const years = new Set();
    const nowY = new Date().getFullYear();
    years.add(nowY);
    years.add(nowY - 1);
    years.add(nowY + 1);
    for (const e of entries) {
      const y = Number((e.date || "").slice(0, 4));
      if (Number.isFinite(y) && y > 1900) years.add(y);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [entries]);

  const openHistory = () => {
    setHistoryOpen(true);
    setHistoryDetailsOpen(false);
    const d = ymdToDate(date);
    d.setDate(1);
    setCalMonth(d);
    setPickedDay(date);
  };

  const jumpToDay = (ymd) => {
    setDate(ymd);
    setHistoryOpen(false);
    setHistoryDetailsOpen(false);
  };

  const addCoping = (value) => {
    if (!value) return;
    setCopingUsed((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };
  const removeCoping = (value) => setCopingUsed((prev) => prev.filter((x) => x !== value));

  const hasSavedEntryToday = useMemo(() => entries.some((e) => e.date === date), [entries, date]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F7FB",
        color: TEXT_MAIN,
        padding: "28px 16px",
        fontFamily: "Nunito, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          className="noPrint"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 30, fontWeight: 1000, letterSpacing: -0.2 }}>Journal</div>
            <div style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 900 }}>🌱 {streak}-day self-care streak</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                fontWeight: 900,
              }}
            />
            <button onClick={openHistory} style={btnBase}>
              History
            </button>
            <button onClick={exportEntry} style={btnBase}>
              Export
            </button>
            <button onClick={printEntry} style={btnBase}>
              Print
            </button>
            <button onClick={saveEntry} style={primaryBtn}>
              Save
            </button>
          </div>
        </div>

        {toast ? (
          <div
            className="noPrint"
            style={{
              marginBottom: 12,
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 12,
              background: "#fff",
              border: BORDER,
              fontWeight: 1000,
            }}
          >
            {toast}
          </div>
        ) : null}

        {/* Layout */}
        <div className="journalGrid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16 }}>
          {/* Left */}
          <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
            {/* Mood */}
            <section style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>Mood</div>
                <div style={{ fontWeight: 1000, color: TEXT_MUTED }}>{moodLabel}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                {MOODS.map((m) => {
                  const active = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMood(m.key)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: active ? "2px solid #000" : BORDER,
                        background: active ? "rgba(185,255,102,0.35)" : "#fff",
                        cursor: "pointer",
                        fontWeight: 1000,
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sliders */}
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <SliderPill label="Intensity" value={moodIntensity} onChange={setMoodIntensity} left="Mild" mid="Medium" right="Strong" />
                <SliderPill label="Energy" value={energy} onChange={setEnergy} left="Low" mid="Steady" right="High" />
                <SliderPill label="Stress" value={stress} onChange={setStress} left="Calm" mid="Tense" right="Overwhelmed" />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 8 }}>Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TAGS.map((t) => {
                    const active = tags.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleInList(t, setTags)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 999,
                          border: active ? "2px solid #000" : BORDER,
                          background: active ? "rgba(185,255,102,0.35)" : "#fff",
                          fontWeight: 1000,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Notes */}
            <section style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>Notes</div>

                <button type="button" onClick={addNoteBlock} style={{ ...btnBase, height: 36, padding: "0 10px" }}>
                  + Add another note
                </button>
              </div>

              {/* Emoji picker button + popover */}
              <div className="noPrint" style={{ position: "relative", marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  ref={emojiBtnRef}
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  style={{
                    ...btnBase,
                    height: 38,
                    padding: "0 12px",
                    fontWeight: 1000,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <IconEmoji size={18} />
                  Emoticons
                </button>

                {emojiOpen ? (
                  <div
                    id="emoji-popover"
                    style={{
                      position: "absolute",
                      top: 44,
                      left: 0,
                      width: 330,
                      background: "#fff",
                      border: "2px solid #000",
                      borderRadius: 14,
                      boxShadow: "6px 6px 0 #000",
                      padding: 10,
                      zIndex: 20,
                    }}
                  >
                    {EMOJI_CATS.map((cat) => (
                      <div key={cat.name} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 1000, fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>{cat.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {cat.list.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => {
                                insertEmojiToActiveNote(e);
                                setEmojiOpen(false);
                              }}
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                border: BORDER,
                                background: "#fff",
                                cursor: "pointer",
                                fontSize: 18,
                                lineHeight: "38px",
                              }}
                              title="Insert"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Gratitude</div>
                <input
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder="One thing I’m thankful for"
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: BORDER,
                    outline: "none",
                    fontWeight: 900,
                    width: "100%",
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Win</div>
                <input
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  placeholder="One good thing today"
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: BORDER,
                    outline: "none",
                    fontWeight: 900,
                    width: "100%",
                  }}
                />
              </div>

              {/* ✅ Notes Blocks list */}
              <div style={{ display: "grid", gap: 10 }}>
                {notesBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: BORDER,
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(185,255,102,0.08)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 1000, fontSize: 12, color: TEXT_MUTED }}>Note {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeNoteBlock(idx)}
                        style={{ ...btnBase, height: 30, padding: "0 10px" }}
                        title="Remove note block"
                      >
                        Remove
                      </button>
                    </div>

                    <textarea
                      ref={setNoteRef(idx)}
                      value={block}
                      onFocus={() => setActiveNoteIdx(idx)}
                      onChange={(e) => updateNoteBlock(idx, e.target.value)}
                      placeholder={idx === 0 ? "You don’t need perfect words. Just write…" : "Write another note…"}
                      rows={4}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        padding: 12,
                        outline: "none",
                        fontSize: 14,
                        lineHeight: 1.55,
                        background: "#fff",
                        fontFamily: "Nunito, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right */}
          <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
            {/* Coping */}
            <section style={{ ...cardStyle, display: "grid", gap: 12 }} className="noPrint">
              <div style={{ fontWeight: 1000, fontSize: 16 }}>Coping</div>

              {/* quick chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {COPING_QUICK.map((c) => {
                  const active = copingUsed.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => addCoping(c)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: active ? "2px solid #000" : BORDER,
                        background: active ? "rgba(185,255,102,0.35)" : "#fff",
                        fontWeight: 1000,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* dropdown: hide already selected (removes redundancy) */}
              <select
                value=""
                onChange={(e) => {
                  addCoping(e.target.value);
                  e.target.value = "";
                }}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  border: BORDER,
                  background: "#fff",
                  padding: "0 10px",
                  fontWeight: 900,
                }}
              >
                <option value="" disabled>
                  Add coping…
                </option>
                {COPING_OPTIONS.filter((c) => !copingUsed.includes(c)).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {copingUsed.length === 0 ? (
                  <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13 }}>None</div>
                ) : (
                  copingUsed.map((c) => (
                    <span
                      key={c}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: BORDER,
                        background: "rgba(185,255,102,0.18)",
                        fontWeight: 1000,
                        fontSize: 12,
                      }}
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCoping(c)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          border: "1px solid rgba(0,0,0,0.18)",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 1000,
                          lineHeight: "20px",
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </section>

            {/* Today reflection */}
            <section style={cardStyle}>
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Today’s reflection</div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>
                    <IconMood size={18} />
                    Mood
                  </div>
                  <div style={{ fontWeight: 1000, color: TEXT_MUTED }}>{moodObj ? `${moodObj.label}` : "Not selected"}</div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13 }}>Levels</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                    Intensity: {moodIntensity}/5 • Energy: {energy}/5 • Stress: {stress}/5
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Coping used</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                    {copingUsed.length ? copingUsed.join(", ") : "None yet"}
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Entry status</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>{hasSavedEntryToday ? "Saved ✅" : "Not saved yet"}</div>
                </div>
              </div>
            </section>

            {/* Manage */}
            <section style={cardStyle} className="noPrint">
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Manage</div>
              <button onClick={() => setConfirmDeleteOpen(true)} style={{ ...btnBase, width: "100%" }}>
                Clear today’s entry
              </button>
            </section>
          </div>
        </div>

        {/* ===================== HISTORY MODAL ===================== */}
        <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="History">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 14 }}>
            {/* Calendar */}
            <div style={{ border: BORDER, borderRadius: 16, padding: 12 }}>
              {/* ✅ Month jump controls */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      const d = new Date(calMonth);
                      d.setMonth(d.getMonth() - 1);
                      setCalMonth(d);
                    }}
                    style={{ ...btnBase, height: 36, padding: "0 10px" }}
                  >
                    Prev
                  </button>

                  <select
                    value={calMonth.getMonth()}
                    onChange={(e) => {
                      const next = new Date(calMonth);
                      next.setMonth(Number(e.target.value));
                      next.setDate(1);
                      setCalMonth(next);
                    }}
                    style={{ height: 36, borderRadius: 12, border: BORDER, padding: "0 10px", fontWeight: 900, background: "#fff" }}
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={calMonth.getFullYear()}
                    onChange={(e) => {
                      const next = new Date(calMonth);
                      next.setFullYear(Number(e.target.value));
                      next.setDate(1);
                      setCalMonth(next);
                    }}
                    style={{ height: 36, borderRadius: 12, border: BORDER, padding: "0 10px", fontWeight: 900, background: "#fff" }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontWeight: 1000 }}>{monthName(calMonth)}</div>
                  <button
                    onClick={() => {
                      const d = new Date(calMonth);
                      d.setMonth(d.getMonth() + 1);
                      setCalMonth(d);
                    }}
                    style={{ ...btnBase, height: 36, padding: "0 10px" }}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontWeight: 1000, color: TEXT_MUTED, fontSize: 12 }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* ✅ Google-calendar-like cells: number + dot only */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {buildMonthGrid(calMonth).map((d, idx) => {
                  if (!d) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        style={{
                          height: 54,
                          borderRadius: 12,
                          border: "1px dashed rgba(0,0,0,0.10)",
                          background: "rgba(0,0,0,0.02)",
                        }}
                      />
                    );
                  }

                  const dayISO = isoDate(d);
                  const entry = entriesByDate.get(dayISO);
                  const hasEntry = !!entry;
                  const isPicked = pickedDay === dayISO;

                  return (
                    <button
                      key={dayISO}
                      disabled={!hasEntry}
                      onClick={() => {
                        setPickedDay(dayISO);
                        if (hasEntry) setHistoryDetailsOpen(true);
                      }}
                      style={{
                        height: 54,
                        borderRadius: 12,
                        border: isPicked ? "2px solid #000" : "1px solid rgba(0,0,0,0.12)",
                        background: isPicked ? "rgba(185,255,102,0.35)" : "#fff",
                        cursor: hasEntry ? "pointer" : "default",
                        position: "relative",
                        padding: 8,
                        textAlign: "left",
                        fontWeight: 1000,
                        opacity: hasEntry ? 1 : 0.45,
                      }}
                      title={hasEntry ? "Open saved entry" : "No entry"}
                    >
                      <div style={{ fontSize: 13, fontWeight: 1000 }}>{d.getDate()}</div>

                      {hasEntry ? (
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            bottom: 10,
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: LOGIN_PRIMARY,
                            border: "2px solid #000",
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right panel (clean spacing) */}
            <div style={{ border: BORDER, borderRadius: 16, padding: 12, minWidth: 0, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 1000 }}>
                  {pickedDay || "Select a saved day"}
                  {pickedDay ? <span style={{ marginLeft: 8, color: TEXT_MUTED, fontWeight: 900, fontSize: 12 }}>(saved details)</span> : null}
                </div>
              </div>

              {!pickedDay ? (
                <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13 }}>Pick a saved date (with dot).</div>
              ) : !selectedHistoryEntry ? (
                <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13 }}>No entry saved for this day.</div>
              ) : (
                <>
                  <div style={{ border: BORDER, borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 1000, fontSize: 12, color: TEXT_MUTED }}>Mood</div>
                    <div style={{ fontWeight: 1000 }}>
                      {MOODS.find((m) => m.key === selectedHistoryEntry.mood)?.label || "—"}
                    </div>

                    <div style={{ fontWeight: 1000, fontSize: 12, color: TEXT_MUTED, marginTop: 6 }}>Levels</div>
                    <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                      Intensity: {selectedHistoryEntry.moodIntensity ?? 3}/5 • Energy: {selectedHistoryEntry.energy ?? 3}/5 • Stress:{" "}
                      {selectedHistoryEntry.stress ?? 3}/5
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={() => setHistoryDetailsOpen(true)} style={{ ...primaryBtn, height: 40 }}>
                      View Details
                    </button>
                    <button onClick={() => jumpToDay(pickedDay)} style={{ ...btnBase, height: 40 }}>
                      Open in Journal
                    </button>
                  </div>

                  <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 12, lineHeight: 1.35 }}>
                    Only saved days are clickable ✅
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>

        {/* ===================== HISTORY DETAILS POPUP (SCROLL) ===================== */}
        <Modal
          open={historyDetailsOpen}
          onClose={() => setHistoryDetailsOpen(false)}
          title={pickedDay ? `${pickedDay} (saved details)` : "Saved details"}
        >
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 6, display: "grid", gap: 10 }}>
            {!pickedDay ? (
              <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13 }}>Pick a date.</div>
            ) : !selectedHistoryEntry ? (
              <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13 }}>No entry saved for this day.</div>
            ) : (
              <>
                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>
                    <IconMood size={18} />
                    Mood
                  </div>
                  <div style={{ fontWeight: 1000, color: TEXT_MUTED }}>
                    {MOODS.find((m) => m.key === selectedHistoryEntry.mood)?.label || "—"}
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Levels</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                    Intensity: {selectedHistoryEntry.moodIntensity ?? 3}/5 • Energy: {selectedHistoryEntry.energy ?? 3}/5 • Stress:{" "}
                    {selectedHistoryEntry.stress ?? 3}/5
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Tags</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                    {Array.isArray(selectedHistoryEntry.tags) && selectedHistoryEntry.tags.length ? selectedHistoryEntry.tags.join(", ") : "—"}
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Coping used</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 1000, fontSize: 13 }}>
                    {Array.isArray(selectedHistoryEntry.copingUsed) && selectedHistoryEntry.copingUsed.length
                      ? selectedHistoryEntry.copingUsed.join(", ")
                      : "—"}
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Gratitude</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {selectedHistoryEntry.gratitude?.trim() || "—"}
                  </div>
                </div>

                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 6 }}>Win</div>
                  <div style={{ color: TEXT_MUTED, fontWeight: 900, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {selectedHistoryEntry.win?.trim() || "—"}
                  </div>
                </div>

                {/* ✅ Notes blocks show nicely */}
                <div style={{ border: BORDER, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, marginBottom: 8 }}>Notes</div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {normalizeNotesBlocks(selectedHistoryEntry)
                      .map((b) => (b ?? "").trim())
                      .filter((b, i, arr) => arr.length > 1 ? true : true) // keep even if one empty
                      .map((block, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid rgba(0,0,0,0.10)",
                            borderRadius: 12,
                            padding: 10,
                            background: "rgba(185,255,102,0.08)",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            color: TEXT_MUTED,
                            fontWeight: 900,
                            fontSize: 13,
                            lineHeight: 1.55,
                          }}
                        >
                          <div style={{ fontWeight: 1000, color: "rgba(20,20,20,0.72)", marginBottom: 6 }}>Note {idx + 1}</div>
                          {block || "—"}
                        </div>
                      ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => jumpToDay(pickedDay)} style={{ ...primaryBtn, height: 36, padding: "0 10px" }}>
                    Open in Journal
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* ===================== CONFIRM DELETE MODAL ===================== */}
        <Modal open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="Clear today’s entry?">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: TEXT_MUTED, fontWeight: 900, lineHeight: 1.4 }}>
              This will remove your saved entry for <b>{date}</b>. This can’t be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setConfirmDeleteOpen(false)} style={btnBase}>
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEntry();
                  setConfirmDeleteOpen(false);
                }}
                style={{ ...btnBase, border: "2px solid #000", background: "#fff1f1", fontWeight: 1000 }}
              >
                Yes, clear it
              </button>
            </div>
          </div>
        </Modal>

        {/* Responsive + Print */}
        <style>{`
          .journalGrid > div { min-width: 0; }
          @media (max-width: 900px) { .journalGrid { grid-template-columns: 1fr !important; } }
          @media (max-width: 600px) {
            section div[style*="grid-template-columns: repeat(3"] {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
          @media print {
            .noPrint { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            div[style*="background: #F6F7FB"] { background: #fff !important; padding: 0 !important; }
            section { break-inside: avoid; page-break-inside: avoid; }
            button { box-shadow: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}

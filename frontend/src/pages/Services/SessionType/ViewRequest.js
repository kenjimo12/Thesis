// src/pages/Services/Counseling/ViewRequest.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== THEME (match Request.js) ===================== */
const LOGIN_PRIMARY = "#B9FF66";
const TEXT_MAIN = "#141414";
const TEXT_MUTED = "rgba(20,20,20,0.82)";
const TEXT_SOFT = "rgba(20,20,20,0.66)";
const ERROR_TEXT = "#C62828";

/* ===================== LOCAL STORAGE (frontend-only) ===================== */
const STORAGE_KEY = "checkin:counseling_requests";

function safeJSONParse(v, fallback) {
  try {
    const x = JSON.parse(v);
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

function loadRequests() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const list = safeJSONParse(raw || "[]", []);
  return Array.isArray(list) ? list : [];
}

function saveRequests(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function removeRequest(id) {
  const next = loadRequests().filter((r) => r.id !== id);
  saveRequests(next);
}

function updateRequest(id, patch) {
  const next = loadRequests().map((r) => (r.id === id ? { ...r, ...patch } : r));
  saveRequests(next);
}

/* ===================== SAMPLE DATA (for demo/testing) ===================== */
const DEV_SEED = [
  // ASK (Pending, no reply yet)
  {
    id: "REQ-ASK-1001",
    type: "ASK",
    status: "Pending",
    topic: "Academic stress",
    anonymous: true,
    message:
      "I feel overwhelmed with deadlines. I can’t focus and I’m scared I might fail. What should I do first?",
    counselorReply: "",
    counselorName: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    repliedAt: "",
    readByStudentAt: "",
  },
  // ASK (Responded)
  {
    id: "REQ-ASK-1002",
    type: "ASK",
    status: "Approved",
    topic: "Anxiety / Overthinking",
    anonymous: false,
    message:
      "I keep overthinking before exams. My chest feels tight and my mind goes blank during quizzes.",
    counselorReply:
      "Thanks for sharing this. Try a simple 3-step reset: (1) inhale 4s, hold 2s, exhale 6s for 2 minutes, (2) write your top 3 worries, (3) choose ONE small action today (review 15 mins). If you want, we can schedule a session to practice coping skills.",
    counselorName: "Counselor A",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    repliedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    readByStudentAt: "", // unread reply
  },
  // ASK (Disapproved)
  {
    id: "REQ-ASK-1003",
    type: "ASK",
    status: "Disapproved",
    topic: "Other",
    anonymous: true,
    message:
      "I want help but I don’t know what to say. I feel numb sometimes and I don’t understand why.",
    counselorReply:
      "We can still help you. Please re-submit and choose a topic (stress/anxiety/mood). Add 1–2 examples of when you felt this way. If urgent, use hotline.",
    counselorName: "Counselor B",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    repliedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    readByStudentAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },

  // MEET (Approved upcoming)
  {
    id: "REQ-MEET-2001",
    type: "MEET",
    status: "Approved",
    sessionType: "Online",
    reason: "Academic stress",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    time: "10:00 AM",
    counselorName: "Counselor C",
    notes: "I want to discuss study burnout and time management.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    completedAt: "",
  },
  // MEET (Pending)
  {
    id: "REQ-MEET-2002",
    type: "MEET",
    status: "Pending",
    sessionType: "In-person",
    reason: "Family / Relationships",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    time: "2:30 PM",
    counselorName: "Any counselor",
    notes: "I need advice about family conflict at home.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    completedAt: "",
  },
  // MEET (Past meeting)
  {
    id: "REQ-MEET-2003",
    type: "MEET",
    status: "Approved",
    sessionType: "Online",
    reason: "Self-esteem",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString().slice(0, 10),
    time: "1:00 PM",
    counselorName: "Counselor D",
    notes: "Follow-up after last week’s session.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

function seedSampleData(append = false) {
  const existing = loadRequests();
  const base = append ? existing : [];
  saveRequests([...DEV_SEED, ...base]);
}

/* ===================== HELPERS ===================== */
function isoNiceDate(iso) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isoNiceTime(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isPastMeeting(item) {
  if (item.type !== "MEET") return false;
  if (item.completedAt) return true;
  if (!item.date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return item.date < today;
}

function typeLabel(t) {
  return t === "MEET" ? "Meet a Counselor" : "Ask a Question";
}

function statusChipStyle(status) {
  if (status === "Approved") return { backgroundColor: `${LOGIN_PRIMARY}55`, color: TEXT_MAIN };
  if (status === "Disapproved") return { backgroundColor: "rgba(198,40,40,0.12)", color: ERROR_TEXT };
  return { backgroundColor: "rgba(255,255,255,0.95)", color: "rgba(20,20,20,0.78)" };
}

function replyState(item) {
  const hasReply = !!(item?.counselorReply && String(item.counselorReply).trim());
  if (item.type !== "ASK") return null;
  return hasReply ? "Responded" : "Waiting for reply";
}

function hasUnreadReply(item) {
  if (item.type !== "ASK") return false;
  const hasReply = !!(item?.counselorReply && String(item.counselorReply).trim());
  if (!hasReply) return false;
  // if read timestamp missing, treat as unread
  return !item.readByStudentAt;
}

function clampText(s, n = 90) {
  const t = (s ?? "").toString().trim().replace(/\s+/g, " ");
  if (!t) return "—";
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function getAskPreview(item) {
  // student-friendly preview
  const msg = clampText(item.message || "", 95);
  if (item.counselorReply) {
    return `You: ${msg}  •  Reply: ${clampText(item.counselorReply, 70)}`;
  }
  return `You: ${msg}`;
}

function getMeetPreview(item) {
  const a = isoNiceDate(item.date);
  const b = item.time || "—";
  const c = item.counselorName || "Any counselor";
  return `${a} • ${b} • ${c}`;
}

/* ===================== PERFORMANCE (1000+ items) ===================== */
// Basic & safe solution: pagination (Load more)
// Works for 1k, 10k, etc. Later you can swap to virtualization.
const PAGE_SIZE = 12;

/* ===================== COMPONENT ===================== */
export default function ViewRequest({ onClose }) {
  const navigate = useNavigate();

  const close = () => {
    if (typeof onClose === "function") return onClose();
    navigate(-1);
  };

  // Left-to-right like Request.js (panel slider)
  const [step, setStep] = useState(0); // 0=list, 1=details
  const [tab, setTab] = useState("All"); // All | Pending | Approved | Disapproved | Past | Responded | Unread
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Newest"); // Newest | Oldest

  // pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // whenever tab/search/sort changes, reset visibleCount so it feels clean
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, q, sort]);

  const all = useMemo(() => {
    void refreshKey;
    const items = loadRequests().slice();

    items.sort((a, b) => {
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      return sort === "Oldest" ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });

    return items;
  }, [refreshKey, sort]);

  const counts = useMemo(() => {
    const c = { All: all.length, Pending: 0, Approved: 0, Disapproved: 0, Past: 0, Responded: 0, Unread: 0 };
    for (const r of all) {
      const s = r.status || "Pending";
      if (s === "Pending") c.Pending++;
      if (s === "Approved") c.Approved++;
      if (s === "Disapproved") c.Disapproved++;
      if (r.type === "MEET" && isPastMeeting(r)) c.Past++;
      if (r.type === "ASK" && replyState(r) === "Responded") c.Responded++;
      if (hasUnreadReply(r)) c.Unread++;
    }
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;

    if (tab === "Past") {
      list = list.filter((r) => r.type === "MEET" && isPastMeeting(r));
    } else if (tab === "Responded") {
      list = list.filter((r) => r.type === "ASK" && replyState(r) === "Responded");
    } else if (tab === "Unread") {
      list = list.filter((r) => hasUnreadReply(r));
    } else if (tab !== "All") {
      list = list.filter((r) => (r.status || "Pending") === tab);
    }

    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((r) => {
        const hay = [
          r.id,
          r.type,
          r.status,
          r.topic,
          r.reason,
          r.sessionType,
          r.time,
          r.date,
          r.counselorName,
          r.message,
          r.counselorReply,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(qq);
      });
    }

    return list;
  }, [all, tab, q]);

  // ✅ what the UI will render (pagination)
  const paged = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visibleCount < filtered.length;

  const openDetails = (item) => {
    setSelected(item);
    setStep(1);

    // ✅ user-friendly: if it has unread reply, mark read immediately when opened
    if (hasUnreadReply(item)) {
      updateRequest(item.id, { readByStudentAt: new Date().toISOString() });
      setRefreshKey((k) => k + 1);
    }
  };

  const backToList = () => setStep(0);

  const emptyMessage = useMemo(() => {
    if (tab === "Unread") return "No unread replies. You’re all caught up ✅";
    if (tab === "Responded") return "No counselor replies yet. Check later or request a session.";
    if (tab === "Past") return "No past meetings yet. Your completed sessions will appear here.";
    if (tab === "Pending") return "No pending items right now.";
    if (tab === "Approved") return "No approved items right now.";
    if (tab === "Disapproved") return "No disapproved items right now.";
    return "Submit a request first, then it will show here.";
  }, [tab]);

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[22px] bg-transparent">
          {/* close X */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-2 top-2 z-30 h-10 w-10 rounded-full bg-white/80 hover:bg-white transition flex items-center justify-center"
          >
            <span className="text-2xl leading-none" style={{ color: TEXT_MAIN }}>
              ×
            </span>
          </button>

          <section className="w-full px-2 py-6 md:px-6 md:py-10">
            <div className="text-center">
              <h2 className="font-[Nunito] text-[30px] md:text-[38px] font-extrabold" style={{ color: TEXT_MAIN }}>
                View My Requests
              </h2>
              <p className="mt-2 font-[Lora] text-[15.5px] md:text-[16.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                See your messages, counselor replies, and session history — fast and easy.
              </p>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <TabBtn active={tab === "All"} onClick={() => setTab("All")} label={`All (${counts.All})`} />
              <TabBtn active={tab === "Pending"} onClick={() => setTab("Pending")} label={`Pending (${counts.Pending})`} />
              <TabBtn active={tab === "Approved"} onClick={() => setTab("Approved")} label={`Approved (${counts.Approved})`} />
              <TabBtn active={tab === "Disapproved"} onClick={() => setTab("Disapproved")} label={`Disapproved (${counts.Disapproved})`} />
              <TabBtn active={tab === "Responded"} onClick={() => setTab("Responded")} label={`Responded (${counts.Responded})`} />
              <TabBtn active={tab === "Unread"} onClick={() => setTab("Unread")} label={`Unread Replies (${counts.Unread})`} />
              <TabBtn active={tab === "Past"} onClick={() => setTab("Past")} label={`Past Meetings (${counts.Past})`} />
            </div>

            {/* PANEL SLIDER */}
            <div className="mt-6 rounded-2xl bg-white/85 overflow-hidden">
              <div
                className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${step * 50}%)` }}
              >
                {/* LEFT: LIST */}
                <div className="w-1/2 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-[Nunito] font-extrabold text-[16.5px]" style={{ color: TEXT_MAIN }}>
                        Records
                      </div>
                      <div className="mt-1 font-[Lora] text-[14.5px]" style={{ color: TEXT_MUTED }}>
                        Tap a card to open. Unread counselor replies are highlighted.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* DEV helper: remove if you want */}
                      <button
                        type="button"
                        onClick={() => {
                          seedSampleData(false);
                          setRefreshKey((k) => k + 1);
                        }}
                        className={miniBtn}
                        title="Dev only"
                      >
                        Seed Sample Data
                      </button>

                      <button type="button" onClick={() => navigate("/services/counseling/request")} className={miniBtn}>
                        New
                      </button>
                    </div>
                  </div>

                  {/* Search + Sort */}
                  <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Search topic, counselor, status, ID..."
                          className="w-full h-11 rounded-xl bg-white/90 px-11 pr-4 font-[Lora] text-[14.5px] outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black/20"
                          style={{ color: TEXT_MAIN }}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                          <SearchIcon />
                        </span>
                        {q ? (
                          <button
                            type="button"
                            onClick={() => setQ("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-black/5 transition flex items-center justify-center"
                            aria-label="Clear search"
                          >
                            <span className="text-[18px]" style={{ color: TEXT_MAIN }}>
                              ×
                            </span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                        Sort
                      </div>
                      <button
                        type="button"
                        onClick={() => setSort((s) => (s === "Newest" ? "Oldest" : "Newest"))}
                        className="h-11 px-4 rounded-xl bg-white/90 hover:bg-white transition font-[Nunito] text-[14px] font-extrabold ring-1 ring-black/10"
                        style={{ color: TEXT_MAIN }}
                        title="Toggle sort"
                      >
                        {sort}
                      </button>
                    </div>
                  </div>

                  {/* Showing X of Y */}
                  <div className="mt-3 text-[12.5px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                    Showing <b style={{ color: TEXT_MAIN }}>{Math.min(visibleCount, filtered.length)}</b> of{" "}
                    <b style={{ color: TEXT_MAIN }}>{filtered.length}</b>
                    {filtered.length >= 500 ? " (large list — loading in parts for speed)" : ""}
                  </div>

                  {/* Empty */}
                  {filtered.length === 0 ? (
                    <div className="mt-5 rounded-2xl bg-white/80 px-4 py-5 ring-1 ring-black/5">
                      <div className="font-[Nunito] font-extrabold text-[16px]" style={{ color: TEXT_MAIN }}>
                        No items here
                      </div>
                      <div className="mt-1 font-[Lora] text-[14.5px]" style={{ color: TEXT_MUTED }}>
                        {emptyMessage}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3">
                        {paged.map((r) => {
                          const isAsk = r.type !== "MEET";
                          const replied = isAsk ? replyState(r) : null;
                          const unread = hasUnreadReply(r);

                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => openDetails(r)}
                              className={[
                                "w-full text-left rounded-2xl px-4 py-4 transition ring-1",
                                unread ? "bg-white ring-black/20" : "bg-white/90 ring-black/5 hover:bg-white",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold"
                                      style={{ backgroundColor: `${LOGIN_PRIMARY}33`, color: TEXT_MAIN }}
                                    >
                                      {typeLabel(r.type)}
                                    </span>

                                    <span
                                      className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold"
                                      style={statusChipStyle(r.status || "Pending")}
                                    >
                                      {r.status || "Pending"}
                                    </span>

                                    {replied ? (
                                      <span
                                        className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold"
                                        style={{
                                          backgroundColor:
                                            replied === "Responded" ? "rgba(185,255,102,0.22)" : "rgba(20,20,20,0.06)",
                                          color: TEXT_MAIN,
                                        }}
                                      >
                                        {replied}
                                      </span>
                                    ) : null}

                                    {unread ? (
                                      <span
                                        className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold"
                                        style={{ backgroundColor: "rgba(198,40,40,0.12)", color: ERROR_TEXT }}
                                      >
                                        New reply
                                      </span>
                                    ) : null}

                                    {r.type === "MEET" && isPastMeeting(r) ? (
                                      <span
                                        className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold"
                                        style={{ backgroundColor: "rgba(20,20,20,0.06)", color: "rgba(20,20,20,0.78)" }}
                                      >
                                        Past
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-2 font-[Nunito] font-extrabold text-[16px] md:text-[17px] truncate" style={{ color: TEXT_MAIN }}>
                                    {r.type === "MEET"
                                      ? `${r.reason || "Meeting"} • ${r.sessionType || "—"}`
                                      : `${r.topic || "Question"}`}
                                  </div>

                                  <div className="mt-1 font-[Lora] text-[14.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                                    {r.type === "MEET" ? getMeetPreview(r) : getAskPreview(r)}
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                                    <span>Submitted: {isoNiceDate(r.createdAt)}</span>
                                    {isAsk && r.repliedAt ? <span>• Replied: {isoNiceDate(r.repliedAt)}</span> : null}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <div className="text-[12.5px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                                    ID
                                  </div>
                                  <div className="text-[13px] font-[Nunito] font-extrabold" style={{ color: TEXT_MAIN }}>
                                    {(r.id || "—").toString().slice(0, 10)}
                                  </div>
                                  <div className="mt-2" style={{ color: TEXT_SOFT }}>
                                    <ArrowRightIcon />
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Load more for 1000+ */}
                      {canLoadMore ? (
                        <div className="mt-4 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))}
                            className="h-11 px-6 rounded-xl bg-white hover:bg-white/95 transition font-[Nunito] text-[14px] font-extrabold ring-1 ring-black/10"
                            style={{ color: TEXT_MAIN }}
                          >
                            Load more
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Bottom actions */}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button type="button" onClick={close} className={ghostBtn}>
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/services/counseling/request")}
                      className={primaryBtn}
                      style={{ backgroundColor: LOGIN_PRIMARY }}
                    >
                      Request a Session
                    </button>
                  </div>
                </div>

                {/* RIGHT: DETAILS */}
                <div className="w-1/2 border-l border-black/10 p-5 md:p-6">
                  {!selected ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center ring-1 ring-black/10" style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
                        <ChatIcon />
                      </div>
                      <div className="mt-4 font-[Nunito] text-[18px] font-extrabold" style={{ color: TEXT_MAIN }}>
                        Select a request
                      </div>
                      <div className="mt-1 font-[Lora] text-[14.5px]" style={{ color: TEXT_MUTED }}>
                        Your message and counselor response will show here.
                      </div>
                    </div>
                  ) : (
                    <DetailsPane
                      item={selected}
                      onBack={backToList}
                      onClose={() => setSelected(null)}
                      onDelete={() => {
                        removeRequest(selected.id);
                        setSelected(null);
                        setStep(0);
                        setRefreshKey((k) => k + 1);
                      }}
                      onMarkPast={() => {
                        updateRequest(selected.id, { completedAt: new Date().toISOString() });
                        setSelected(null);
                        setStep(0);
                        setRefreshKey((k) => k + 1);
                      }}
                      onGoList={() => setStep(0)}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ===================== DETAILS PANE ===================== */
function DetailsPane({ item, onBack, onClose, onDelete, onMarkPast }) {
  const isMeet = item.type === "MEET";
  const replied = item.type === "ASK" ? replyState(item) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-[Nunito] font-extrabold text-[18px] md:text-[20px]" style={{ color: TEXT_MAIN }}>
            Request Details
          </div>
          <div className="mt-1 font-[Lora] text-[14.5px]" style={{ color: TEXT_MUTED }}>
            {typeLabel(item.type)} • {item.status || "Pending"}
            {replied ? ` • ${replied}` : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-black/5 hover:bg-black/10 transition flex items-center justify-center"
          aria-label="Close details"
          title="Close details"
        >
          <span className="text-2xl leading-none" style={{ color: TEXT_MAIN }}>
            ×
          </span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold" style={{ backgroundColor: `${LOGIN_PRIMARY}33`, color: TEXT_MAIN }}>
          {typeLabel(item.type)}
        </span>
        <span className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold" style={statusChipStyle(item.status || "Pending")}>
          {item.status || "Pending"}
        </span>
        <span className="px-3 py-1 rounded-full text-[12.5px] font-[Nunito] font-extrabold" style={{ backgroundColor: "rgba(20,20,20,0.06)", color: "rgba(20,20,20,0.78)" }}>
          ID: {item.id || "—"}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-4 rounded-2xl bg-white/90 ring-1 ring-black/5 p-4">
        <div className="grid gap-2 text-[14.5px] font-[Lora]" style={{ color: TEXT_MUTED }}>
          {isMeet ? (
            <>
              <div><b style={{ color: TEXT_MAIN }}>Session:</b> {item.sessionType || "—"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Reason:</b> {item.reason || "—"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Schedule:</b> {isoNiceDate(item.date)} • {item.time || "—"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Counselor:</b> {item.counselorName || "Any counselor"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Submitted:</b> {isoNiceDate(item.createdAt)}</div>
            </>
          ) : (
            <>
              <div><b style={{ color: TEXT_MAIN }}>Topic:</b> {item.topic || "—"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Anonymous:</b> {item.anonymous ? "Yes" : "No"}</div>
              <div><b style={{ color: TEXT_MAIN }}>Submitted:</b> {isoNiceDate(item.createdAt)} {item.createdAt ? `(${isoNiceTime(item.createdAt)})` : ""}</div>
              <div><b style={{ color: TEXT_MAIN }}>Counselor:</b> {item.counselorName || "Assigned later"}</div>
              {item.repliedAt ? (
                <div><b style={{ color: TEXT_MAIN }}>Replied:</b> {isoNiceDate(item.repliedAt)} ({isoNiceTime(item.repliedAt)})</div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="mt-4 flex-1 overflow-auto rounded-2xl bg-white/80 ring-1 ring-black/5 p-4">
        <div className="font-[Nunito] font-extrabold text-[15px]" style={{ color: TEXT_MAIN }}>
          {isMeet ? "Notes" : "Conversation"}
        </div>

        {isMeet ? (
          <div className="mt-3 text-[14.5px] font-[Lora] whitespace-pre-wrap" style={{ color: TEXT_MUTED }}>
            {item.notes || "—"}
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {/* Student bubble */}
            <div className="flex items-start gap-2">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center font-[Nunito] font-extrabold text-[14px] ring-1 ring-black/10"
                style={{ backgroundColor: "rgba(255,255,255,0.95)", color: TEXT_MAIN }}
                title="You"
              >
                You
              </div>
              <div className="max-w-[88%]">
                <div className="rounded-2xl rounded-tl-md px-4 py-3 ring-1 ring-black/10" style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
                  <div className="text-[14.5px] font-[Lora] whitespace-pre-wrap" style={{ color: TEXT_MAIN }}>
                    {item.message || "—"}
                  </div>
                </div>
                <div className="mt-1 text-[12px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                  {isoNiceDate(item.createdAt)} {item.createdAt ? isoNiceTime(item.createdAt) : ""}
                </div>
              </div>
            </div>

            {/* Counselor bubble */}
            <div className="flex items-start gap-2 justify-end">
              <div className="max-w-[88%] text-right">
                <div className="rounded-2xl rounded-tr-md px-4 py-3 ring-1 ring-black/10" style={{ backgroundColor: "rgba(185,255,102,0.30)" }}>
                  <div className="text-[14.5px] font-[Lora] whitespace-pre-wrap" style={{ color: TEXT_MAIN }}>
                    {item.counselorReply
                      ? item.counselorReply
                      : "No reply yet. Please check back later. If urgent, request a session or use the hotline."}
                  </div>
                </div>
                <div className="mt-1 text-[12px] font-[Lora]" style={{ color: TEXT_SOFT }}>
                  {item.counselorReply ? `${item.counselorName || "Counselor"} • ${isoNiceDate(item.repliedAt)} ${isoNiceTime(item.repliedAt)}` : ""}
                </div>
              </div>
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center font-[Nunito] font-extrabold text-[13px] ring-1 ring-black/10"
                style={{ backgroundColor: "rgba(255,255,255,0.95)", color: TEXT_MAIN }}
                title={item.counselorName || "Counselor"}
              >
                C
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className={ghostBtn}>
          ← Back to list
        </button>

        <div className="flex flex-wrap gap-2 justify-end">
          {isMeet ? (
            <button type="button" onClick={onMarkPast} className={miniBtn} title="Frontend-only marker">
              Mark as Past
            </button>
          ) : null}

          <button
            type="button"
            onClick={onDelete}
            className="h-11 px-6 rounded-xl bg-black/10 hover:bg-black/15 transition font-[Nunito] text-[14px] font-extrabold"
            style={{ color: TEXT_MAIN }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-2 text-[12.5px] font-[Lora]" style={{ color: TEXT_SOFT }}>
        * Frontend-only: in real system, counselor replies come from backend and notifications can be added.
      </div>
    </div>
  );
}

/* ===================== UI PIECES ===================== */
function TabBtn({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 px-4 rounded-xl transition font-[Nunito] text-[14px] font-extrabold",
        active ? "bg-white ring-2 ring-black/10" : "bg-white/80 hover:bg-white",
      ].join(" ")}
      style={{ color: TEXT_MAIN }}
    >
      {label}
    </button>
  );
}

/* ===================== CLASSES ===================== */
const primaryBtn =
  "h-12 px-7 rounded-xl hover:brightness-95 transition font-[Nunito] text-[15.5px] font-extrabold text-[#141414]";

const ghostBtn =
  "h-12 px-6 rounded-xl bg-white/90 hover:bg-white transition font-[Nunito] text-[15.5px] font-bold text-[#141414]";

const miniBtn =
  "h-11 px-6 rounded-xl bg-white/90 hover:bg-white transition font-[Nunito] text-[14px] font-extrabold text-[#141414]";

/* ===================== ICONS ===================== */
function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 7l5 5-5 5" stroke={TEXT_MAIN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke={TEXT_MAIN} strokeWidth="2" opacity="0.55" />
      <path d="M21 21l-4.3-4.3" stroke={TEXT_MAIN} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.2-4.6A8 8 0 1 1 21 12Z"
        stroke={TEXT_MAIN}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.65"
      />
    </svg>
  );
}

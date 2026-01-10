// src/components/MessagesDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const CHECKIN_GREEN = "#B9FF66";
const TEXT_MAIN = "#141414";

/** small helper hook for responsive inline-styles */
function useMedia(query) {
  const get = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();

    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);

    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isToday = sameDay(d, now);
  const isYday = sameDay(d, yesterday);

  if (isToday) return "Today";
  if (isYday) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Expected thread shape:
 * {
 *   id: string,
 *   name: string,
 *   avatarUrl?: string,
 *   subtitle?: string,        // e.g. "Guidance Counselor"
 *   lastMessage?: string,
 *   lastTime?: string,        // "17h"
 *   unread?: number,
 *   // messages: [{ id, from: "me"|"them", text, time, createdAt? }]
 * }
 */
export default function MessagesDrawer({
  open,
  onClose,
  threads = [],
  initialThreadId = "",
  onSendMessage, // async ({ threadId, text }) => messageObject
  title = "Messages",
}) {
  const PAGE_SIZE = 10;

  const [view, setView] = useState("list"); // "list" | "chat"
  const [dir, setDir] = useState("left"); // "left" | "right"
  const [activeId, setActiveId] = useState(
    initialThreadId || threads?.[0]?.id || ""
  );
  const [draft, setDraft] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // responsive flags
  const isMobile = useMedia("(max-width: 520px)");
  const isSmallHeight = useMedia("(max-height: 640px)");

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  // normalize messages (ensure createdAt exists for separators; fallback to "now")
  const normalizedMessages = useMemo(() => {
    const all = activeThread?.messages || [];
    return all.map((m, idx) => ({
      ...m,
      _idx: idx,
      createdAt: m.createdAt || m.time || Date.now(),
    }));
  }, [activeThread]);

  const visibleMessages = useMemo(() => {
    const all = normalizedMessages;
    const start = Math.max(0, all.length - visibleCount);
    return all.slice(start);
  }, [normalizedMessages, visibleCount]);

  // ✅ reset ONLY when opening (not when threads update)
  useEffect(() => {
    if (!open) return;

    setView("list");
    setDir("left");
    setDraft("");
    setVisibleCount(PAGE_SIZE);
    setActiveId((prev) => prev || initialThreadId || threads?.[0]?.id || "");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // refs for scroll control
  const chatEndRef = useRef(null);
  const chatBodyRef = useRef(null);

  // ✅ always start at bottom when entering chat / switching thread / visible messages changes
  useEffect(() => {
    if (!open) return;
    if (view !== "chat") return;

    requestAnimationFrame(() => {
      const el = chatBodyRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [open, view, activeId, visibleMessages.length]);

  // responsive drawer style (inline)
  const drawerStyle = useMemo(() => {
    if (isMobile) {
      return {
        ...styles.drawer,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        borderRadius: 0,
        border: "none",
      };
    }

    return {
      ...styles.drawer,
      width: 380,
      height: isSmallHeight ? 540 : 600,
      right: 18,
      bottom: 18,
      borderRadius: 22,
      border: "1px solid rgba(20,20,20,0.10)",
    };
  }, [isMobile, isSmallHeight]);

  const overlayStyle = useMemo(() => {
    return {
      ...styles.overlay,
      background: isMobile ? "rgba(0,0,0,0.45)" : styles.overlay.background,
    };
  }, [isMobile]);

  const headerStyle = useMemo(() => {
    if (!isMobile) return styles.header;
    return {
      ...styles.header,
      padding: "12px 14px",
      gridTemplateColumns: "44px 1fr 44px",
    };
  }, [isMobile]);

  const headerBtnStyle = useMemo(() => {
    if (!isMobile) return styles.headerBtn;
    return { ...styles.headerBtn, width: 44, height: 44, borderRadius: 14 };
  }, [isMobile]);

  const isOpen = !!open;

  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => sum + (t.unread || 0), 0);
  }, [threads]);



  async function handleSend() {
    const text = draft.trim();
    if (!text || !activeThread) return;

    setDraft("");
    try {
      await onSendMessage?.({ threadId: activeThread.id, text });

      requestAnimationFrame(() => {
        const el = chatBodyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      console.error(e);
      setDraft(text);
    }
  }

  function goToChat(threadId) {
    setDir("left");
    setActiveId(threadId);
    setVisibleCount(PAGE_SIZE);
    setView("chat");
  }

  function goBackToList() {
    setDir("right");
    setView("list");
  }

  // load older when scrolling near top (and keep scroll position stable)
  function onChatScroll(e) {
    const el = e.currentTarget;
    if (el.scrollTop > 16) return;

    const total = normalizedMessages.length || 0;
    if (visibleCount >= total) return;

    const prevHeight = el.scrollHeight;

    setVisibleCount((c) => Math.min(total, c + PAGE_SIZE));

    requestAnimationFrame(() => {
      const newHeight = el.scrollHeight;
      el.scrollTop = newHeight - prevHeight;
    });
  }

  // Build rows with: date separators + bubble grouping
  const chatRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < visibleMessages.length; i++) {
      const m = visibleMessages[i];
      const prev = visibleMessages[i - 1];
      const next = visibleMessages[i + 1];

      const showDay =
        !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);

      const sameAsPrevSender = !!prev && prev.from === m.from;
      const sameAsNextSender = !!next && next.from === m.from;

      const isStart = !sameAsPrevSender || showDay; // start of group or after separator
      const isEnd = !sameAsNextSender; // end of group

      if (showDay) {
        rows.push({ type: "day", key: `day-${m._idx}`, label: dayLabel(m.createdAt) });
      }

      rows.push({
        type: "msg",
        key: m.id || `m-${m._idx}`,
        msg: m,
        isStart,
        isEnd,
      });
    }
    return rows;
  }, [visibleMessages]);

  return !isOpen ? null : (
    <>
      {/* overlay */}
      <div style={overlayStyle} onClick={onClose} />

      {/* drawer */}
      <div style={drawerStyle} role="dialog" aria-label="Messages">
        {/* header */}
        <div style={headerStyle}>
          {view === "chat" ? (
            <button
              style={headerBtnStyle}
              onClick={goBackToList}
              aria-label="Back"
              title="Back"
            >
              ←
            </button>
          ) : (
            <span style={{ width: isMobile ? 44 : 34 }} />
          )}

          <div style={styles.headerTitleWrap}>
            {view === "list" ? (
              <div style={styles.headerTitleRow}>
                <span style={styles.headerTitle}>{title}</span>
                {totalUnread > 0 && (
                  <span style={styles.headerBadge}>{totalUnread}</span>
                )}
              </div>
            ) : (
              <div style={styles.chatHeader}>
                <img
                  src={activeThread?.avatarUrl || "https://via.placeholder.com/44"}
                  alt=""
                  style={styles.chatHeaderAvatar}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={styles.chatHeaderName}>
                    {activeThread?.name || "Conversation"}
                  </div>
                  <div style={styles.chatHeaderSub}>
                    {activeThread?.subtitle || "Counselor"}
                    <span style={styles.dot} />
                    <span style={styles.replyHint}>Replies as soon as possible</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            style={headerBtnStyle}
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* body (animated) */}
        <div
          key={view}
          style={{
            ...styles.bodyAnimator,
            ...(dir === "left" ? styles.slideInLeft : styles.slideInRight),
          }}
        >
          {view === "list" ? (
            <div style={styles.list}>
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goToChat(t.id)}
                  style={styles.thread}
                >
                  <img
                    src={t.avatarUrl || "https://via.placeholder.com/48"}
                    alt=""
                    style={styles.threadAvatar}
                  />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={styles.threadTop}>
                      <span style={styles.threadName}>{t.name}</span>
                      <span style={styles.threadTime}>{t.lastTime || ""}</span>
                    </div>

                    <div style={styles.threadBottom}>
                      <span style={styles.threadLast}>
                        {t.lastMessage || "No messages yet."}
                      </span>
                      {t.unread > 0 && <span style={styles.unreadPill}>{t.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.chatWrap}>
              {/* privacy as a system bubble (calm + readable) */}
              <div style={styles.systemWrap}>
                <div style={styles.systemBubble}>
                  <div style={styles.systemTitle}>Your privacy is valued.</div>
                  <div style={styles.systemText}>
                    Counselors will reply as soon as possible. If this is an
                    emergency, contact your local hotline.
                  </div>
                </div>
              </div>

              {/* messages */}
              <div
                ref={chatBodyRef}
                style={styles.chatBody}
                onScroll={onChatScroll}
              >
                {/* top fade */}
                <div style={styles.topFade} aria-hidden="true" />

                {normalizedMessages.length > visibleCount ? (
                  <div style={styles.loadMoreHint}>Loading earlier messages…</div>
                ) : (
                  <div style={styles.loadMoreHintDim}>Start of conversation</div>
                )}

                {chatRows.map((row) => {
                  if (row.type === "day") {
                    return (
                      <div key={row.key} style={styles.dayRow}>
                        <span style={styles.dayChip}>{row.label}</span>
                      </div>
                    );
                  }

                  const m = row.msg;
                  const isMe = m.from === "me";

                  const bubbleStyle = {
                    ...styles.bubble,
                    ...(isMe ? styles.bubbleMe : styles.bubbleThem),
                    ...(row.isStart ? null : (isMe ? styles.bubbleMeMid : styles.bubbleThemMid)),
                    ...(row.isEnd ? null : (isMe ? styles.bubbleMeMid2 : styles.bubbleThemMid2)),
                  };

                  return (
                    <div
                      key={row.key}
                      style={{
                        display: "flex",
                        justifyContent: isMe ? "flex-end" : "flex-start",
                        marginBottom: row.isEnd ? 10 : 4,
                      }}
                    >
                      <div style={bubbleStyle}>
                        <div style={styles.bubbleText}>{m.text}</div>
                        {row.isEnd && m.time ? (
                          <div style={styles.bubbleTime}>{m.time}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                <div ref={chatEndRef} />
              </div>

              {/* input */}
              <div style={styles.inputBar}>
                <button
                  style={styles.iconBtn}
                  type="button"
                  aria-label="Emoji"
                  title="Emoji"
                >
                  🙂
                </button>

                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  style={styles.textarea}
                  rows={1}
                />

                <button
                  style={styles.iconBtn}
                  type="button"
                  aria-label="Attach"
                  title="Attach"
                >
                  📎
                </button>

                <button
                  style={{
                    ...styles.sendIcon,
                    ...(draft.trim() ? null : styles.sendIconDisabled),
                  }}
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  aria-label="Send"
                  title="Send"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>

        {/* keyframes */}
        <style>{`
          @keyframes msgSlideInLeft { from { transform: translateX(10px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
          @keyframes msgSlideInRight { from { transform: translateX(-10px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    zIndex: 9998,
  },

  // LIGHT drawer (surpasses readability)
  drawer: {
    position: "fixed",
    zIndex: 9999,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    color: TEXT_MAIN,
  },

  header: {
    padding: "12px 12px",
    display: "grid",
    gridTemplateColumns: "34px 1fr 34px",
    alignItems: "center",
    borderBottom: "1px solid rgba(20,20,20,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86))",
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(20,20,20,0.10)",
    background: "rgba(20,20,20,0.04)",
    color: TEXT_MAIN,
    cursor: "pointer",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
  },

  headerTitleWrap: { minWidth: 0, paddingLeft: 10, paddingRight: 10 },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerTitle: {
    color: TEXT_MAIN,
    fontFamily: "Lora, serif",
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: "0.2px",
  },
  headerBadge: {
    background: "#FF3B30",
    color: "#fff",
    borderRadius: 999,
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 12,
    padding: "2px 8px",
  },

  // chat header
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    objectFit: "cover",
    border: `2px solid ${CHECKIN_GREEN}`,
    flex: "0 0 auto",
  },
  chatHeaderName: {
    fontFamily: "Lora, serif",
    fontWeight: 800,
    fontSize: 15,
    color: TEXT_MAIN,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    maxWidth: 210,
  },
  chatHeaderSub: {
    marginTop: 2,
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 800,
    fontSize: 12,
    color: "rgba(20,20,20,0.62)",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "rgba(20,20,20,0.25)",
    display: "inline-block",
  },
  replyHint: { fontWeight: 800 },

  bodyAnimator: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  slideInLeft: { animation: "msgSlideInLeft 220ms cubic-bezier(0.22, 1, 0.36, 1)" },
  slideInRight: { animation: "msgSlideInRight 220ms cubic-bezier(0.22, 1, 0.36, 1)" },

  list: { padding: 10, overflow: "auto" },

  thread: {
    width: "100%",
    display: "flex",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 16,
    border: "1px solid rgba(20,20,20,0.08)",
    background: "rgba(255,255,255,0.72)",
    cursor: "pointer",
    textAlign: "left",
    marginBottom: 10,
  },
  threadAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    objectFit: "cover",
    border: `2px solid ${CHECKIN_GREEN}`,
    flex: "0 0 auto",
  },
  threadTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  threadName: {
    color: TEXT_MAIN,
    fontFamily: "Lora, serif",
    fontWeight: 800,
    fontSize: 15,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  threadTime: {
    color: "rgba(20,20,20,0.55)",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 800,
    fontSize: 12,
    flex: "0 0 auto",
  },
  threadBottom: {
    marginTop: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  threadLast: {
    color: "rgba(20,20,20,0.70)",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
    fontSize: 12,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  unreadPill: {
    background: "#2F80FF",
    color: "#fff",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 11,
    borderRadius: 999,
    padding: "2px 8px",
    flex: "0 0 auto",
  },

  chatWrap: { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 },

  // chat background pattern
  chatBody: {
    padding: 12,
    overflow: "auto",
    flex: 1,
    background:
      "radial-gradient(circle at 18% 30%, rgba(185,255,102,0.16) 0 2px, transparent 3px), radial-gradient(circle at 68% 70%, rgba(185,255,102,0.12) 0 2px, transparent 3px), linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.92))",
  },
  topFade: {
    position: "sticky",
    top: 0,
    height: 14,
    marginTop: -12,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0))",
    zIndex: 2,
  },

  // system bubble
  systemWrap: {
    padding: "10px 12px 0",
  },
  systemBubble: {
    borderRadius: 16,
    border: "1px dashed rgba(20,20,20,0.18)",
    background: "rgba(255,255,255,0.75)",
    padding: "10px 12px",
  },
  systemTitle: {
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 12,
    color: TEXT_MAIN,
    letterSpacing: "0.2px",
  },
  systemText: {
    marginTop: 4,
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
    fontSize: 12,
    color: "rgba(20,20,20,0.70)",
    lineHeight: 1.35,
  },

  loadMoreHint: {
    textAlign: "center",
    padding: "10px 0 12px",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 12,
    color: "rgba(20,20,20,0.58)",
  },
  loadMoreHintDim: {
    textAlign: "center",
    padding: "10px 0 12px",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 12,
    color: "rgba(20,20,20,0.38)",
  },

  dayRow: { display: "flex", justifyContent: "center", margin: "6px 0 10px" },
  dayChip: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(20,20,20,0.06)",
    border: "1px solid rgba(20,20,20,0.08)",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 11,
    color: "rgba(20,20,20,0.65)",
  },

  // bubbles
  bubble: {
    maxWidth: "78%",
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid rgba(20,20,20,0.08)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
  },
  bubbleMe: {
    background: CHECKIN_GREEN,
    color: TEXT_MAIN,
    borderColor: "rgba(0,0,0,0.10)",
    borderTopRightRadius: 10,
  },
  bubbleThem: {
    background: "rgba(255,255,255,0.95)",
    color: TEXT_MAIN,
    borderTopLeftRadius: 10,
  },

  // grouping tweaks (mid bubbles look connected)
  bubbleMeMid: { borderTopRightRadius: 8 },
  bubbleMeMid2: { borderBottomRightRadius: 8 },
  bubbleThemMid: { borderTopLeftRadius: 8 },
  bubbleThemMid2: { borderBottomLeftRadius: 8 },

  bubbleText: {
    fontFamily: "Nunito, sans-serif",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  bubbleTime: {
    marginTop: 6,
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 10,
    opacity: 0.65,
    textAlign: "right",
  },

  inputBar: {
    padding: 10,
    paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
    borderTop: "1px solid rgba(20,20,20,0.08)",
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "rgba(255,255,255,0.92)",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: "1px solid rgba(20,20,20,0.10)",
    background: "rgba(20,20,20,0.04)",
    color: TEXT_MAIN,
    cursor: "pointer",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
  },

  // textarea (multiline + readable)
  textarea: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    resize: "none",
    borderRadius: 16,
    border: "1px solid rgba(20,20,20,0.10)",
    background: "rgba(255,255,255,0.82)",
    color: TEXT_MAIN,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 800,
    fontSize: 13,
    lineHeight: 1.35,
  },

  sendIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: CHECKIN_GREEN,
    color: TEXT_MAIN,
    cursor: "pointer",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 900,
    fontSize: 16,
    display: "grid",
    placeItems: "center",
  },
  sendIconDisabled: { opacity: 0.55, cursor: "not-allowed" },
};

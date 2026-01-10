// src/components/FloatingMessagesPill.js
import React from "react";

export default function FloatingMessagesPill({
  accent = "#B9FF66",
  unread = 0,
  onClick,
  hidden = false,
}) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Messages"
      title="Messages"
      className="fixed right-4 bottom-4 z-[70] flex items-center gap-3 px-4 py-3 rounded-full shadow-2xl border border-black/10 bg-white/90 hover:bg-white transition"
      style={{ backdropFilter: "blur(10px)" }}
    >
      {/* icon */}
      <span
        className="h-10 w-10 rounded-full grid place-items-center"
        style={{ backgroundColor: `${accent}55`, color: "#141414" }}
      >
        💬
      </span>

      <div className="text-left leading-tight">
        <div className="font-[Nunito] font-extrabold text-[14.5px]" style={{ color: "#141414" }}>
          Messages
        </div>
        <div className="font-[Lora] text-[12.5px]" style={{ color: "rgba(20,20,20,0.70)" }}>
          {unread > 0 ? "You have new replies" : "Talk to a counselor"}
        </div>
      </div>

      {/* badge */}
      {unread > 0 ? (
        <span className="ml-1 px-2 py-[2px] rounded-full text-[12px] font-[Nunito] font-extrabold text-white bg-red-500">
          {unread}
        </span>
      ) : null}
    </button>
  );
}

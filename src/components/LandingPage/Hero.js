import { useEffect, useRef, useState } from "react";
import heroImg from "../../assets/Hero.png";
import bottomParallaxImg from "../../assets/Parallax.png";

export default function Hero() {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        setOffset(y * 0.12);
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section
      className="w-full bg-white overflow-hidden"
      style={{ fontFamily: "Nunito, sans-serif" }}
    >
      {/* TOP HERO */}
      <div className="mx-auto max-w-[1300px] px-10 py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* LEFT CONTENT */}
          <div>
            <h1 className="text-[40px] leading-[1.15] font-extrabold text-[#141414]">
              Take a Minute to Check In
              <br />
              With Yourself.
            </h1>

            {/* SUBHEADING = BLACK */}
            <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-[#141414]">
              A quick, confidential PHQ-9 self-check designed to support your
              mental well-being. Because school is tough—and your mental health
              deserves attention too.
            </p>

            {/* BUTTON — SAME DESIGN + BETTER HOVER */}
            <button
              className="
                mt-7
                inline-flex items-center justify-center
                rounded-lg
                border border-[#9FE84B]
                bg-[#B9FF66]
                px-8 py-4
                text-[14px]
                font-extrabold
                text-[#141414]
                shadow-sm
                transition-all
                duration-200
                ease-out
                hover:-translate-y-[2px]
                hover:shadow-[0_12px_28px_rgba(185,255,102,0.55)]
                active:translate-y-0
                active:shadow-[0_6px_18px_rgba(185,255,102,0.35)]
              "
            >
              Take an Assessment Now !
            </button>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Floating plus icons */}
            <div className="absolute right-6 top-8 flex flex-col gap-4 z-10">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#141414] text-[20px] font-black text-white">
                +
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#B9FF66] text-[20px] font-black text-[#141414]">
                +
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#141414] text-[20px] font-black text-white">
                +
              </span>
            </div>

            {/* PARALLAX HERO IMAGE */}
            <div
              className="will-change-transform"
              style={{
                transform: `translate3d(0, ${-offset}px, 0)`,
                transition: "transform 60ms linear",
              }}
            >
              <img
                src={heroImg}
                alt="Mental Health Illustration"
                className="w-full max-w-[620px] object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ BOTTOM PARALLAX IMAGE SECTION (like your screenshot) */}
      {/* ✅ FULL-WIDTH BOTTOM PARALLAX IMAGE */}
<div className="relative w-screen overflow-hidden">
  <div className="h-[260px] w-screen overflow-hidden">
    <img
      src={bottomParallaxImg}
      alt="Parallax section"
      className="h-full w-full object-cover will-change-transform"
      style={{
        transform: `translate3d(0, ${offset * 0.6}px, 0)`,
        transition: "transform 60ms linear",
      }}
      draggable={false}
    />
  </div>

  {/* subtle fade like the reference */}
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
</div>

    </section>
  );
}

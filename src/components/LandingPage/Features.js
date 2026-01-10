import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import guidanceImg from "../../assets/Guidance (1).png";
import journalImg from "../../assets/Journal.png";
import phqImg from "../../assets/Phq9.png";
import hotlineImg from "../../assets/Hotline.png";

import starImg from "../../assets/stars.png";
import arrowIcon from "../../assets/Icon.png";

/** Fade-up on scroll (runs once) */
function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(el);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return [ref, inView];
}

function FeatureCard({
  variant = "gray",
  topLabel,
  line2,
  desc,
  img,
  scale = 1.1,
  delay = 0,
  to,
  onNavigate,
}) {
  const isGreen = variant === "green";
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`
        w-full
        rounded-[24px]
        border-4 border-black
        overflow-hidden
        flex flex-col
        ${isGreen ? "bg-[#B9FF66]" : "bg-[#E9ECE7]"}
        shadow-[0_10px_0_rgba(0,0,0,0.1)]
        transition-all duration-700 ease-out
        hover:scale-[1.02] hover:shadow-[0_16px_0_rgba(0,0,0,0.12)]

        ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
      `}
    >
      {/* Top black strip */}
      <div className="h-[10px] w-full bg-black/15 shrink-0" />

      {/* Content */}
      <div className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col items-center text-center">
        {/* Image with playful tilt */}
        <div className="relative mb-6">
          <div
            className={`
              absolute -inset-4
              rounded-[28px]
              border-4 border-black
              ${isGreen ? "bg-white/60" : "bg-white/50"}
              rotate-12
            `}
          />
          <img
            src={img}
            alt={topLabel}
            draggable={false}
            style={{ transform: `scale(${scale})` }}
            className="
              relative
              h-[120px] sm:h-[160px] lg:h-[200px]
              w-auto object-contain
              drop-shadow-[0_8px_0_rgba(0,0,0,0.16)]
            "
          />
        </div>

        {/* Text content */}
        <div className="space-y-4 max-w-[48ch]">
          {/* Top label */}
          <span
            className={`
              inline-flex items-center gap-2
              px-4 py-2
              rounded-[14px]
              border-4 border-black
              font-extrabold
              text-[16px] sm:text-[18px] lg:text-[22px]
              ${isGreen ? "bg-white" : "bg-[#B9FF66]"}
            `}
          >
            {topLabel}
            <span className="w-3 h-3 rounded-full bg-black/70" />
          </span>

          {/* Title */}
          {line2 && (
            <h3
              className="
                font-extrabold
                text-[#222]
                text-[24px] sm:text-[28px] lg:text-[32px]
                leading-[1.1]
                tracking-tight
              "
            >
              {line2}
            </h3>
          )}

          {/* Description */}
          {desc && (
            <p
              className="
                text-[15px] sm:text-[16px] lg:text-[18px]
                leading-[1.6]
                text-black/70
              "
            >
              {desc}
            </p>
          )}
        </div>

        {/* Bottom row: tags + CTA */}
        <div className="mt-auto pt-8 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex justify-center gap-3">
            <span className="px-4 py-2 rounded-full border-4 border-black text-[13px] font-bold bg-white/70">
              Private
            </span>
            <span className="px-4 py-2 rounded-full border-4 border-black text-[13px] font-bold bg-white/55">
              Easy
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (to && onNavigate) onNavigate(to);
            }}
            className="
              inline-flex items-center justify-center gap-3
              min-h-[52px]
              px-6 py-3
              rounded-full
              bg-black text-white
              text-[15px] sm:text-[16px]
              font-bold
              active:scale-95
              transition-transform
            "
          >
            <span>Learn more</span>
            <img
              src={arrowIcon}
              alt=""
              className="w-[18px] h-[18px] invert"
              draggable={false}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-white py-16 sm:py-20 lg:py-28 overflow-hidden font-sans">
      <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-[32px] sm:text-[40px] lg:text-[48px] font-extrabold leading-tight">
            Features
          </h2>

          <div className="mt-4 flex justify-center">
            <img
              src={starImg}
              alt="stars"
              draggable={false}
              className="h-[36px] sm:h-[44px] lg:h-[52px] w-auto"
            />
          </div>

          <p className="mt-4 mx-auto max-w-[70ch] text-[16px] sm:text-[18px] lg:text-[20px] text-black/70 leading-[1.5]">
            Simple tools designed for mobile first, without sacrificing desktop
            clarity.
          </p>
        </div>

        {/* Grid: 1 column mobile, 2 columns md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <FeatureCard
            delay={0}
            variant="gray"
            topLabel="Guidance"
            line2="Counseling"
            desc="Connect with a counselor for support and safe conversations."
            img={guidanceImg}
            to="/services/counseling"
            onNavigate={navigate}
          />

          <FeatureCard
            delay={120}
            variant="green"
            topLabel="Journal"
            line2="Daily Notes"
            desc="Write thoughts, track moods, and reflect with clarity."
            img={journalImg}
            to="/services/journal"
            onNavigate={navigate}
          />

          <FeatureCard
            delay={240}
            variant="gray"
            topLabel="Self-Check"
            line2="Assessment"
            desc="Answer a short check-in to understand how you’re feeling."
            img={phqImg}
            to="/services/assessment"
            onNavigate={navigate}
          />

          <FeatureCard
            delay={360}
            variant="green"
            topLabel="Emergency"
            line2="Hotline"
            desc="Quick access to help when you need it most."
            img={hotlineImg}
            to="/services/emergency"
            onNavigate={navigate}
          />
        </div>
      </div>
    </section>
  );
}

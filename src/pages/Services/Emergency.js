import { useEffect, useMemo, useRef, useState } from "react";

/** Fade-up on scroll (runs once) */
function useInView(options = { threshold: 0.18 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        obs.unobserve(el);
      }
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return [ref, inView];
}

/** --- Minimal doodles (lighter + fewer) --- */
function DoodleSpark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 10l8 20 20 8-20 8-8 20-8-20-20-8 20-8 8-20Z"
        stroke="#141414"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M18 88c14-10 32-10 46 0"
        stroke="#141414"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
    </svg>
  );
}

function DoodleWave({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 48c22-22 46 22 68 0s46 22 68 0 46 22 68 0"
        stroke="#141414"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoodleHeart({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 98C26 72 14 56 14 38c0-13 10-23 23-23 10 0 18 6 23 14 5-8 13-14 23-14 13 0 23 10 23 23 0 18-12 34-46 60Z"
        stroke="#141414"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icons (simple, school-friendly) */
function PhoneIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M6.6 10.8c1.7 3.2 3.4 4.9 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.2 1 .4 2.2.7 3.4.8.5.1.9.5.9 1v3.5c0 .6-.5 1-1.1 1C11 21.3 2.7 13 2.7 2.2c0-.6.4-1.1 1-1.1h3.5c.5 0 .9.4 1 1 .2 1.2.4 2.3.8 3.4.2.4.1.9-.2 1.2L6.6 10.8Z"
        stroke="#141414"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M12 2l8 4v7c0 5-3.6 8.7-8 9-4.4-.3-8-4-8-9V6l8-4Z"
        stroke="#141414"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 7v6" stroke="#141414" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SchoolIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M12 3l10 5-10 5L2 8l10-5Z"
        stroke="#141414"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 11v6c0 2 3 4 6 4s6-2 6-4v-6"
        stroke="#141414"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22 8v6"
        stroke="#141414"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Minimal card (less “cardboard”) */
function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "relative rounded-[18px] border border-black/20 bg-white",
        "shadow-[0_10px_24px_rgba(0,0,0,0.06)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function EmergencyCard({ item, delay = 0 }) {
  const [ref, inView] = useInView({ threshold: 0.25 });
  const safeTel = (item.tel || item.number || "").replace(/[^\d+]/g, "");

  const ctaHref =
    item.href ||
    (item.mode === "link" ? "#" : item.mode === "text" ? `sms:${safeTel}` : `tel:${safeTel}`);

  const ctaLabel =
    item.cta ||
    (item.mode === "text" ? "Text now" : item.mode === "link" ? "Open" : "Call now");

  return (
    <div
      ref={ref}
      style={{
        transform: inView ? "translateY(0)" : "translateY(10px)",
        opacity: inView ? 1 : 0,
        transitionDelay: `${delay}ms`,
        transitionProperty: "transform, opacity",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <Card className="overflow-hidden">
        {/* tiny corner doodle only */}
        <DoodleSpark className="absolute -top-6 -right-6 w-[120px] opacity-[0.10] pointer-events-none" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-[46px] h-[46px] rounded-[14px] border border-black/25 bg-[#B9FF66] flex items-center justify-center">
                {item.icon}
              </div>
            </div>

            <div className="min-w-0">
              <p
                className="text-[12px] font-extrabold tracking-wide uppercase text-black/45"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {item.tag}
              </p>

              <h3
                className="text-[18px] sm:text-[20px] font-bold leading-tight text-[#141414]"
                style={{ fontFamily: "Lora, serif" }}
              >
                {item.title}
              </h3>

              <p
                className="mt-2 text-[14px] text-black/65 leading-relaxed"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {item.desc}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-full border border-black/25 bg-[#B9FF66] px-4 py-2 text-[14px] font-extrabold text-[#141414] hover:brightness-[0.99] active:scale-[0.99] transition"
                  style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  <PhoneIcon className="w-5 h-5" />
                  {item.number}
                </a>

                <span
                  className="text-[13px] text-black/50"
                  style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  {ctaLabel}
                </span>
              </div>
            </div>
          </div>

          {/* very light bottom accent */}
          <DoodleWave className="mt-5 w-[190px] opacity-[0.10]" />
        </div>
      </Card>
    </div>
  );
}

export default function Emergency() {
  const [heroRef, heroInView] = useInView({ threshold: 0.2 });

  const sections = useMemo(
    () => [
      {
        title: "For students & campus concerns",
        subtitle: "Start here if you're safe and need school-based support.",
        items: [
          {
            tag: "Campus Support",
            title: "Guidance / Counselor Office",
            number: "School Office",
            href: "#",
            mode: "link",
            cta: "Update with your campus contact",
            desc: "If you're feeling overwhelmed, anxious, or unsafe, reach out to your guidance office for support and referral.",
            icon: <SchoolIcon className="w-6 h-6" />,
          },
          {
            tag: "Trusted adult",
            title: "Teacher / Adviser",
            number: "Message your adviser",
            href: "#",
            mode: "link",
            cta: "Ask for help today",
            desc: "If you don’t know where to start, message a trusted teacher/adviser and tell them you need support.",
            icon: <DoodleHeart className="w-6 h-6" />,
          },
        ],
      },
      {
        title: "If it’s urgent or life-threatening",
        subtitle: "Call immediately if someone is in immediate danger.",
        items: [
          {
            tag: "Emergency",
            title: "National Emergency Hotline",
            number: "911",
            tel: "911",
            desc: "For urgent life-threatening situations. Share your exact location and follow instructions.",
            icon: <ShieldIcon className="w-6 h-6" />,
          },
        ],
      },
      {
        title: "Crisis & mental health support (PH)",
        subtitle: "Confidential support when you need someone to talk to.",
        items: [
          {
            tag: "Mental Health",
            title: "NCMH Crisis Hotline",
            number: "1553",
            tel: "1553",
            desc:
              "24/7 crisis support and referral. If you can’t connect, try again or use their mobile lines (Smart/TNT: 0919-057-1553; Globe/TM: 0917-899-8727).",
            icon: <DoodleHeart className="w-6 h-6" />,
          },
          {
            tag: "Crisis Support",
            title: "In Touch: Crisis Line",
            number: "(02) 8893 7603",
            tel: "+63288937603",
            desc:
              "Free, anonymous, and confidential emotional support with trained responders—helpful when you need someone to talk to right now.",
            icon: <ShieldIcon className="w-6 h-6" />,
          },
          {
            tag: "Suicide Prevention",
            title: "HOPELINE",
            number: "(02) 8804 4673",
            tel: "+63288044673",
            desc:
              "Suicide prevention and emotional crisis support. You can also reach HOPELINE via 0917-558-4673 (Globe) or 0918-873-4673 (Smart).",
            icon: <DoodleHeart className="w-6 h-6" />,
          },
          {
            tag: "Child Protection",
            title: "Bantay Bata Helpline",
            number: "163",
            tel: "163",
            desc:
              "For child-related concerns (abuse, neglect, violence, counseling, and guidance). If a child is in immediate danger, call emergency services too.",
            icon: <ShieldIcon className="w-6 h-6" />,
          },
        ],
      },
    ],
    []
  );

  return (
    <section className="relative w-full overflow-hidden bg-[#fbfbfb]">
      {/* Minimal paper-ish background + few doodles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-[260px] bg-[#E9ECE7]" />
        <div className="absolute -top-10 -left-10 w-[180px] opacity-[0.10] rotate-[-10deg]">
          <DoodleSpark />
        </div>
        <div className="absolute top-[120px] -right-10 w-[260px] opacity-[0.08] rotate-[8deg]">
          <DoodleWave />
        </div>
        <div className="absolute bottom-[80px] left-[8%] w-[110px] opacity-[0.08] rotate-[-6deg]">
          <DoodleHeart />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 md:px-[70px] py-12 sm:py-14">
        {/* HERO (minimal + school/student tone) */}
        <div
          ref={heroRef}
          className="relative rounded-[22px] border border-black/20 bg-white/75 backdrop-blur-[1px]"
          style={{
            transform: heroInView ? "translateY(0)" : "translateY(12px)",
            opacity: heroInView ? 1 : 0,
            transition:
              "transform 650ms cubic-bezier(.2,.8,.2,1), opacity 650ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <DoodleWave className="absolute -bottom-10 -left-10 w-[320px] opacity-[0.10] pointer-events-none" />
          <DoodleSpark className="absolute -top-8 -right-8 w-[160px] opacity-[0.10] pointer-events-none" />

          <div className="p-7 sm:p-9 md:p-10">
            <p
              className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-4 py-2 text-[12.5px] font-extrabold text-[#141414]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#B9FF66] border border-black/25" />
              Student Emergency & Support
            </p>

            <h1
              className="mt-4 text-[30px] sm:text-[38px] md:text-[46px] leading-[1.08] font-bold text-[#141414]"
              style={{ fontFamily: "Lora, serif" }}
            >
              Quick help for school life — <br className="hidden sm:block" />
              safety, crisis, and support.
            </h1>

            <p
              className="mt-4 text-[14.5px] sm:text-[16px] text-black/65 leading-relaxed max-w-[70ch]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              If you’re in immediate danger, call emergency services right away.
              If you’re safe but struggling, start with campus support — you don’t
              have to handle it alone.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="tel:911"
                className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-[#B9FF66] px-5 py-3 text-[14px] font-extrabold text-[#141414] active:scale-[0.99] transition"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                <PhoneIcon className="w-5 h-5" />
                Call 911
              </a>

              <span
                className="text-[12.5px] text-black/50"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Tip: share your location (building, floor, landmark).
              </span>
            </div>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="mt-10 space-y-10">
          {sections.map((sec, sIdx) => (
            <div key={sIdx}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2
                    className="text-[22px] sm:text-[24px] font-bold text-[#141414]"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    {sec.title}
                  </h2>
                  <p
                    className="mt-1 text-[13.5px] text-black/55"
                    style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                  >
                    {sec.subtitle}
                  </p>
                </div>

                {/* tiny doodle label */}
                <div className="hidden sm:flex items-center gap-2 opacity-80">
                  <DoodleSpark className="w-[38px]" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {sec.items.map((item, i) => (
                  <EmergencyCard key={i} item={item} delay={i * 110} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p
          className="mt-10 text-center text-[12px] text-black/45"
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          Replace the campus links with your real school contacts (guidance office,
          adviser, security). Keep this page accessible for students.
        </p>
      </div>
    </section>
  );
}

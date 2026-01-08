import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import missionImg from "../../assets/Mission.png";
import visionImg from "../../assets/Vision.png";
import arrowIcon from "../../assets/Icon.png";
import logoImg from "../../assets/logo.png";

/** Reusable FadeUp wrapper (IntersectionObserver) */
function FadeUp({
  children,
  delay = 0,
  once = true,
  className = "",
  y = 18,
}) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setShow(false);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transform: show ? "translateY(0px)" : `translateY(${y}px)`,
        opacity: show ? 1 : 0,
      }}
      className={`
        will-change-transform will-change-opacity
        transition-[transform,opacity] duration-700 ease-out
        motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default function Miss() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full bg-[#A7B59B] py-20 overflow-hidden">
      {/* Zigzag borders */}
      <div className="pointer-events-none absolute top-0 left-0 w-full h-7 bg-[linear-gradient(135deg,#fff_25%,transparent_25%),linear-gradient(225deg,#fff_25%,transparent_25%)] bg-[length:26px_26px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-full h-7 rotate-180 bg-[linear-gradient(135deg,#fff_25%,transparent_25%),linear-gradient(225deg,#fff_25%,transparent_25%)] bg-[length:26px_26px]" />

      <div className="mx-auto w-full max-w-[1280px] px-6">
        {/* Logo */}
        <FadeUp delay={0} className="flex justify-center mb-16">
          <img
            src={logoImg}
            alt="CheckIn"
            className="h-[96px] md:h-[120px] lg:h-[140px] w-auto"
            draggable={false}
          />
        </FadeUp>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12">
          {/* Mission */}
          <FadeUp delay={120} y={22}>
            <div className="bg-[#DCE7D2] rounded-[18px] border-2 border-black px-10 py-10 text-center min-h-[520px] flex flex-col items-center">
              <h3
                className="mb-5 text-[48px] md:text-[56px] leading-none"
                style={{ fontFamily: "'Luckiest Guy', cursive" }}
              >
                Mission
              </h3>

              <p className="text-[14px] leading-relaxed mx-auto max-w-[360px] mb-8">
                To empower students to care for their mental well-being through
                confidential self-checks and guided support.
              </p>

              <img
                src={missionImg}
                alt="Mission illustration"
                className="mt-auto mx-auto h-[220px] md:h-[240px] lg:h-[260px] w-auto object-contain"
                draggable={false}
              />
            </div>
          </FadeUp>

          {/* Vision */}
          <FadeUp delay={240} y={22}>
            <div className="bg-[#DCE7D2] rounded-[18px] border-2 border-black px-10 py-10 text-center min-h-[520px] flex flex-col items-center">
              <h3
                className="mb-5 text-[48px] md:text-[56px] leading-none"
                style={{ fontFamily: "'Luckiest Guy', cursive" }}
              >
                Vision
              </h3>

              <p className="text-[14px] leading-relaxed mx-auto max-w-[360px] mb-8">
                A campus where every student feels supported, heard, and mentally
                well.
              </p>

              <img
                src={visionImg}
                alt="Vision illustration"
                className="mt-auto mx-auto h-[220px] md:h-[240px] lg:h-[260px] w-auto object-contain"
                draggable={false}
              />
            </div>
          </FadeUp>
        </div>

        {/* Learn more */}
        <FadeUp delay={380} y={16} className="flex justify-center mt-12">
          <button
            onClick={() => navigate("/about-us")}
            className="flex items-center gap-2 text-[13px] font-semibold hover:opacity-80 transition"
          >
            <span>Learn More</span>
            <img src={arrowIcon} alt="arrow" className="w-6 h-6" />
          </button>
        </FadeUp>
      </div>
    </section>
  );
}

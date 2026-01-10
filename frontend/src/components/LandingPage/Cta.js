import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mentalImg from "../../assets/Mental.png";
import parallaxImg from "../../assets/Parallax-2.png";

export default function LandingHero() {
  const navigate = useNavigate();

  const [bgOffset, setBgOffset] = useState(0);
  const [visible, setVisible] = useState(false);

  const rafRef = useRef(null);
  const heroRef = useRef(null);

  /* ================= FADE-IN ON VIEW ================= */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ================= MOBILE PARALLAX ================= */
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        const raw = (window.scrollY || 0) * 0.06;
        const clamped = Math.max(-40, Math.min(40, raw));
        setBgOffset(clamped);
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
    <section className="w-full bg-white overflow-x-hidden">
      {/* ================= HERO ================= */}
      <div
        ref={heroRef}
        className="w-full px-5 sm:px-8 md:px-[70px] pt-10 sm:pt-12 md:pt-[55px] pb-10 md:pb-[40px]"
      >
        <div className="max-w-[1200px] mx-auto flex flex-col-reverse lg:flex-row items-center lg:items-start justify-between gap-10 lg:gap-14">
          {/* LEFT */}
          <div
            className={`
              w-full max-w-[600px] text-center lg:text-left
              transition-all duration-[700ms] ease-out
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
            `}
          >
            <h1 className="font-lora text-[32px] sm:text-[38px] md:text-[46px] font-bold leading-[1.15] text-black">
              Let’s make things happen.
            </h1>

            <p className="font-nunito mt-4 sm:mt-5 text-[15px] sm:text-[16px] md:text-[18px] leading-[1.8] text-black/80 max-w-[560px] mx-auto lg:mx-0">
              Reach out to us for guidance, support, and mental wellness care.
              Through CheckIn, students can access guided assessments, reflect
              on their well-being, and take steps toward appropriate help in a
              safe and supportive space.
            </p>

            {/* ✅ ACTION BUTTONS (MATCH YOUR ROUTES) */}
            <div className="mt-7 sm:mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 md:gap-6">
              <button
                type="button"
                onClick={() => navigate("/sign-up")}  // ✅ your route is /sign-up
                className="h-[44px] sm:h-[42px] w-full sm:w-auto px-8 sm:px-10 rounded-[10px] bg-[#B9FF66] text-[15px] font-extrabold text-black border-2 border-black/70 hover:brightness-95 transition"
              >
                Register Now!
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")} // ✅ keep as /login if route is /login
                className="h-[44px] sm:h-[42px] w-full sm:w-auto px-10 sm:px-12 rounded-[10px] bg-white text-[15px] font-extrabold text-black border-2 border-black/70 hover:bg-black/5 transition"
              >
                Login
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div
            className={`
              w-full lg:w-auto flex justify-center lg:justify-end
              transition-all duration-[900ms] ease-out delay-100
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
            `}
          >
            <img
              src={mentalImg}
              alt="Mental Health and Wellness"
              className="w-[260px] sm:w-[320px] md:w-[400px] lg:w-[460px] h-auto object-contain"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* ================= PARALLAX STRIP ================= */}
      <div className="relative w-full overflow-hidden">
        {/* DESKTOP */}
        <div className="hidden lg:block relative h-[160px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${parallaxImg})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div>
              <h2 className="font-lora text-white text-[26px] lg:text-[30px] font-bold">
                You’re doing better than you think.
              </h2>
              <p className="mt-2 font-nunito text-white/85 text-[14.5px]">
                One step, one check-in, one moment at a time.
              </p>
            </div>
          </div>
        </div>

        {/* MOBILE */}
        <div
          className="relative block lg:hidden h-[110px] sm:h-[140px] md:h-[160px]"
          style={{
            backgroundImage: `url(${parallaxImg})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: `center calc(50% + ${bgOffset}px)`,
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <h2 className="font-lora text-white text-[20px] sm:text-[22px] font-bold">
                You’re doing better than you think.
              </h2>
              <p className="mt-1 font-nunito text-white/85 text-[13.5px]">
                One step at a time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ add
import heroImg from "../../assets/Hero.png";
import bottomParallaxImg from "../../assets/Parallax.png";

export default function Hero() {
  const navigate = useNavigate(); // ✅ add

  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(false);

  const rafRef = useRef(null);
  const sectionRef = useRef(null);

  /* ================= PARALLAX ================= */
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        setOffset(window.scrollY || 0);
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

  /* ================= FADE-UP ================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.22 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const heroY = -(offset * 0.12);
  const easeSmooth = "ease-[cubic-bezier(.2,.8,.2,1)]";

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-white overflow-hidden font-nunito"
    >
      {/* ================= FULL-WIDTH GREEN LIGHT ================= */}
      <div className="pointer-events-none absolute inset-0 w-screen overflow-hidden">
        <div className="absolute -top-32 -left-44 h-[440px] w-[440px] rounded-full bg-[#EFFFCC] blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-52 h-[380px] w-[380px] rounded-full bg-[#EFFFCC] blur-3xl opacity-60" />
      </div>

      {/* ================= TOP HERO CONTENT ================= */}
      <div className="relative z-10 mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-16 xl:px-20 pt-12 sm:pt-14 lg:pt-16 pb-16 lg:pb-24">
        <div className="grid items-center gap-10 sm:gap-12 lg:gap-16 xl:gap-20 lg:grid-cols-2">
          {/* LEFT CONTENT */}
          <div
            className={`
              transition-all duration-[850ms] ${easeSmooth}
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
              text-center lg:text-left
              max-w-[860px] mx-auto lg:mx-0
            `}
            style={{ transitionDelay: visible ? "60ms" : "0ms" }}
          >
            <h1
              className="
                font-lora text-[#141414] font-extrabold tracking-[-0.02em]
                text-[38px] leading-[1.1]
                sm:text-[50px] sm:leading-[1.07]
                md:text-[58px]
                lg:text-[70px] lg:leading-[1.03]
                xl:text-[80px]
                2xl:text-[88px]
              "
            >
              Take a Minute to Check In
              <span className="hidden sm:inline">
                <br />
              </span>{" "}
              With Yourself.
            </h1>

            <p
              className="
                mt-5 sm:mt-6
                mx-auto lg:mx-0
                max-w-[700px]
                text-[#1A1A1A]
                text-[15px] leading-[1.85]
                sm:text-[16.5px]
                md:text-[17.5px]
                lg:text-[19px] lg:leading-[1.95]
              "
            >
              A quick, confidential PHQ-9 self-check designed to support your
              mental well-being. Because school is tough—and your mental health
              deserves attention too.
            </p>

            <div className="mt-10 flex justify-center lg:justify-start">
              <button
               onClick={() => navigate("/services/assessment")}
                className="
                  inline-flex items-center justify-center
                  rounded-xl
                  border-2 border-black
                  bg-[#B9FF66]
                  px-9 py-4 sm:px-11 sm:py-5
                  text-[14px] sm:text-[15px]
                  font-extrabold text-[#141414]
                  transition-all duration-200 ease-out
                  hover:-translate-y-[3px]
                  hover:shadow-[0_14px_30px_rgba(185,255,102,0.55)]
                  active:translate-y-0
                "
              >
                Take an Assessment Now !
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div
            className={`
              relative
              transition-all duration-[1000ms] ${easeSmooth}
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
              flex justify-center lg:justify-end
            `}
            style={{ transitionDelay: visible ? "140ms" : "0ms" }}
          >
            {/* Editorial bleed on ultra-wide */}
            <div
              className="
                will-change-transform
                w-full
                max-w-[520px] sm:max-w-[660px] md:max-w-[740px]
                lg:max-w-[980px] xl:max-w-[1150px] 2xl:max-w-[1300px]
                xl:-mr-10 2xl:-mr-28
              "
              style={{
                transform: `translate3d(0, ${heroY}px, 0)`,
              }}
            >
              <img
                src={heroImg}
                alt="Mental Health Illustration"
                className="w-full h-auto object-contain select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM PARALLAX ================= */}
      <div className="relative w-full">
        {/* Desktop */}
        <div className="hidden lg:block relative h-[420px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bottomParallaxImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          />
          <div className="absolute inset-0 bg-black/45" />

          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div className="max-w-[760px]">
              <h2 className="font-lora text-white text-[38px] xl:text-[46px] leading-[1.2] font-bold">
                It’s okay to pause.
              </h2>
              <p className="mt-4 font-nunito text-white/85 text-[16.5px] xl:text-[18px] leading-[1.9]">
                Checking in with yourself is a small step, but it can make a real
                difference in how you feel today.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet */}
        <div className="relative block lg:hidden h-[300px] sm:h-[360px] overflow-hidden">
          <img
            src={bottomParallaxImg}
            alt="Parallax section"
            className="h-full w-full object-cover select-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/45" />

          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="max-w-[560px]">
              <h2 className="font-lora text-white text-[26px] sm:text-[30px] leading-[1.25] font-bold">
                It’s okay to pause.
              </h2>
              <p className="mt-3 font-nunito text-white/85 text-[15px] sm:text-[15.5px] leading-[1.75]">
                One honest check-in is enough for today.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

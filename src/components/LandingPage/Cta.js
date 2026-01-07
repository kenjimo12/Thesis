import { useEffect, useRef, useState } from "react";
import mentalImg from "../../assets/Mental.png";
import parallaxImg from "../../assets/Parallax-2.png";

export default function LandingHero() {
  const [bgOffset, setBgOffset] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setBgOffset((window.scrollY || 0) * 0.18);
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
      {/* MAIN HERO */}
      <div className="w-full px-5 sm:px-8 md:px-[70px] pt-10 sm:pt-12 md:pt-[55px] pb-10 md:pb-[40px]">
        <div className="max-w-[1200px] mx-auto flex flex-col-reverse lg:flex-row items-center lg:items-start justify-between gap-10 lg:gap-14">
          {/* LEFT CONTENT */}
          <div className="w-full max-w-[600px] text-center lg:text-left">
            {/* TITLE — NUNITO */}
            <h1 className="font-nunito text-[32px] sm:text-[38px] md:text-[46px] font-extrabold leading-[1.15] text-black">
              Let’s make things happen.
            </h1>

            {/* DESCRIPTION — LORA */}
            <p className="font-lora mt-4 sm:mt-5 text-[15px] sm:text-[16px] md:text-[18px] leading-[1.8] text-black/85 max-w-[560px] mx-auto lg:mx-0">
              Reach out to us for guidance, support, and mental wellness care.
              Through CheckIn, students can access guided assessments, reflect
              on their well-being, and take steps toward appropriate help in a
              safe and supportive space.
            </p>

            {/* BUTTONS */}
            <div className="mt-7 sm:mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 md:gap-6">
              <button className="h-[44px] sm:h-[42px] w-full sm:w-auto px-8 sm:px-10 rounded-[10px] bg-[#B9FF66] text-[15px] font-semibold text-black shadow hover:brightness-95 transition">
                Register Now !
              </button>

              <button className="h-[44px] sm:h-[42px] w-full sm:w-auto px-10 sm:px-12 rounded-[10px] bg-[#B9FF66] text-[15px] font-semibold text-black shadow hover:brightness-95 transition">
                Login
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <img
              src={mentalImg}
              alt="Mental Health and Wellness"
              className="w-[260px] sm:w-[320px] md:w-[400px] lg:w-[460px] h-auto object-contain"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* PARALLAX STRIP */}
      <div
        className="w-full h-[110px] sm:h-[140px] md:h-[160px]"
        style={{
          backgroundImage: `url(${parallaxImg})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: `center calc(50% + ${bgOffset}px)`,
        }}
      />
    </section>
  );
}

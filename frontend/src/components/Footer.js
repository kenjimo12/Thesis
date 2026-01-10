import { useEffect, useRef, useState } from "react";

import facebook from "../assets/Facebook.png";
import twitter from "../assets/Twitter.png";
import instagram from "../assets/Instagram.png";
import linkedin from "../assets/Linkedin.png";
import logoOutlined from "../assets/logo-outlined 1.png";

export default function Footer() {
  const [visible, setVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseFade =
    "transition-all duration-700 ease-out will-change-transform will-change-opacity";

  const socials = [
    { icon: facebook, label: "Facebook", href: "#" },
    { icon: twitter, label: "Twitter", href: "#" },
    { icon: instagram, label: "Instagram", href: "#" },
    { icon: linkedin, label: "LinkedIn", href: "#" },
  ];

  return (
    <footer
      ref={footerRef}
      className="w-full bg-[#B9FF66] overflow-x-hidden"
      style={{ fontFamily: "Nunito, sans-serif" }}
    >
      {/* Optional top line (remove if you don’t want it) */}
      <div className="w-full h-[2px] bg-black/15" />

      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8 py-10 sm:py-12">
        {/* SOCIAL ICONS */}
        <div className="flex justify-center items-center gap-6 sm:gap-7 mb-4 sm:mb-5">
          {socials.map((s, i) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              className={`
                inline-flex items-center justify-center
                ${baseFade}
                ${
                  visible
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-4 scale-90"
                }
              `}
              style={{ transitionDelay: visible ? `${i * 90}ms` : "0ms" }}
            >
              <img
                src={s.icon}
                alt={s.label}
                className="
                  w-[37px] h-[37px]
                  select-none
                  transition-transform duration-200
                  hover:scale-110 hover:-translate-y-1
                "
                draggable="false"
              />
            </a>
          ))}
        </div>

        {/* TAGLINE */}
        <p
          className={`
            text-center text-[13px] sm:text-[14px] font-semibold text-black mb-5 sm:mb-6
            ${baseFade}
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
          style={{ transitionDelay: visible ? "380ms" : "0ms" }}
        >
          Student-Centered Mental Wellness Support
        </p>

        {/* LOGO */}
        <div
          className={`
            flex justify-center mb-3 sm:mb-4
            ${baseFade}
            ${
              visible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-6 scale-95"
            }
          `}
          style={{ transitionDelay: visible ? "500ms" : "0ms" }}
        >
          <img
            src={logoOutlined}
            alt="CheckIn Logo"
            className="
              w-[258px] h-[110px]
              object-contain
              max-w-full
              select-none
            "
            draggable="false"
          />
        </div>

        {/* COPYRIGHT */}
        <p
          className={`
            text-center text-[12px] sm:text-[12.5px] text-black/70 leading-relaxed
            ${baseFade}
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
          style={{ transitionDelay: visible ? "650ms" : "0ms" }}
        >
          © 2024 All Rights Reserved
          <br />
          Arellano University – Andres Bonifacio Campus
        </p>
      </div>
    </footer>
  );
}

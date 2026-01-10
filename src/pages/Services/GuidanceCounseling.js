// src/components/GuidanceHero.js
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import friendImg from "../../assets/friend.png"; // ✅ adjust path if needed

function FadeUp({ children, delay = 0, once = true, className = "" }) {
  const elRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={elRef}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function GuidanceHero({ showExtras = true }) {
  const navigate = useNavigate();

  return (
    <section className="relative bg-white pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
      {/* subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lime-50/40 via-white to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT */}
          <div className="space-y-7 lg:space-y-9">
            <FadeUp>
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-lime-100/70 border border-lime-200 text-lime-800 text-sm font-medium">
                <span className="size-2.5 rounded-full bg-[#B9FF66] animate-pulse" />
                Confidential • 24/7 Support
              </div>
            </FadeUp>

            <FadeUp delay={80}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-gray-900">
                Talk to someone who{" "}
                <span className="relative inline-block">
                  really gets it
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-lime-300/60 -z-10 rounded-full" />
                </span>
              </h1>
            </FadeUp>

            <FadeUp delay={160}>
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">
                Connect with a caring guidance counselor — private, free, and always here when you need support.
              </p>
            </FadeUp>

            {showExtras && (
              <FadeUp delay={240}>
                <div className="flex flex-wrap gap-3 pt-2">
                  <span className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                    Student-First
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                    Easy Scheduling
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                    100% Confidential
                  </span>
                </div>
              </FadeUp>
            )}

            <FadeUp delay={340}>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => navigate("/services/counseling/request")}
                  className="px-8 py-4 bg-[#B9FF66] hover:bg-lime-500 active:bg-lime-600 
                           text-gray-900 font-semibold text-base rounded-2xl 
                           border-2 border-black shadow-[4px_4px_0_0_#000] 
                           hover:shadow-[3px_3px_0_0_#000] active:shadow-[2px_2px_0_0_#000] 
                           hover:-translate-y-0.5 transition-all duration-200"
                >
                  Request a Session →
                </button>

                <button
                  onClick={() => navigate("/services/counseling/requests")}
                  className="px-8 py-4 bg-white border-2 border-gray-300 hover:border-gray-400 
                           text-gray-800 font-semibold text-base rounded-2xl 
                           shadow-sm hover:shadow transition-all duration-200"
                >
                  View My Requests
                </button>
              </div>
            </FadeUp>
          </div>

          {/* RIGHT */}
          <FadeUp delay={120} className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[520px] lg:max-w-[580px]">
              <div className="absolute inset-0 bg-gradient-to-br from-lime-200/20 to-transparent rounded-3xl blur-2xl -rotate-2 scale-105" />

              <div className="relative rounded-3xl overflow-hidden border-8 border-white shadow-2xl">
                <img
                  src={friendImg}
                  alt="Friendly counseling session"
                  className="w-full h-auto object-cover"
                  draggable={false}
                />
              </div>

              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white px-7 py-3 rounded-full shadow-lg border border-lime-200 whitespace-nowrap">
                <p className="text-base font-medium text-gray-800">
                  You're never alone <span className="text-red-500">♥</span>
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { pathname } = useLocation();
  const isSignup = pathname.startsWith("/sign-up");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false); // close when route changes
  }, [pathname]);

  const links = [
    { to: "/", label: "Home", end: true },
    { to: "/about-us", label: "About us" },
    { to: "/privacy-policy", label: "Privacy Policy" },
    { to: "/faqs", label: "FAQS" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-black/10">
      <div className="h-16 px-5 sm:px-9 flex items-center justify-between">
        {/* BRAND */}
        <NavLink to="/" className="flex items-center gap-2.5 select-none">
          <span className="text-[22px] font-extrabold text-[#7cdc3b]">✓</span>
          <span className="text-[18px] font-extrabold text-[#141414]">
            CheckIn
          </span>
        </NavLink>

        {/* DESKTOP NAV */}
        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex gap-[26px] text-[14px] font-semibold">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `hover:opacity-70 ${
                    isActive ? "font-extrabold text-[#141414]" : "text-[#141414]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* AUTH PILL (DESKTOP) */}
          <div className="relative inline-flex h-10 rounded-full border-2 border-[#8b8b8b] bg-white overflow-hidden">
            <div
              className={`
                absolute top-0 bottom-0 w-1/2 bg-[#B9FF66]
                transition-transform duration-300 ease-out
                ${isSignup ? "translate-x-full" : "translate-x-0"}
              `}
            />
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#8b8b8b]" />

            <NavLink
              to="/login"
              end
              className={({ isActive }) =>
                `relative z-10 inline-flex items-center justify-center gap-2 w-28 text-[14px] font-extrabold
                 ${isActive ? "text-[#141414]" : "text-[#141414]/80"}`
              }
            >
              {!isSignup && <span className="text-[16px] leading-none">✓</span>}
              Login
            </NavLink>

            <NavLink
              to="/sign-up"
              className={({ isActive }) =>
                `relative z-10 inline-flex items-center justify-center w-28 text-[14px] font-extrabold
                 ${isActive ? "text-[#141414]" : "text-[#141414]/80"}`
              }
            >
              Sign-up
            </NavLink>
          </div>
        </div>

        {/* MOBILE RIGHT (Burger always visible on mobile) */}
        <div className="lg:hidden flex items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="h-11 w-11 rounded-full border-2 border-black/15 inline-flex items-center justify-center hover:bg-black/5 transition"
          >
            {/* Animated Burger -> X */}
            <div className="relative w-6 h-6">
              <span
                className={`absolute left-0 right-0 h-[2px] bg-[#141414] transition-all duration-200 ${
                  open ? "top-3 rotate-45" : "top-1"
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[2px] bg-[#141414] transition-all duration-200 ${
                  open ? "opacity-0" : "top-3 opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[2px] bg-[#141414] transition-all duration-200 ${
                  open ? "top-3 -rotate-45" : "top-5"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5">
          <div className="rounded-2xl border-2 border-black/10 bg-white shadow-sm p-4">
            {/* Links */}
            <nav className="flex flex-col gap-1 text-[14px] font-semibold">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 transition hover:bg-black/5 ${
                      isActive ? "bg-[#B9FF66]/60 font-extrabold" : ""
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Auth buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `h-11 rounded-xl border-2 border-black/15 font-extrabold text-[14px] inline-flex items-center justify-center hover:opacity-80 transition ${
                    isActive ? "bg-[#B9FF66]/70" : "bg-white"
                  }`
                }
              >
                Login
              </NavLink>

              <NavLink
                to="/sign-up"
                className={({ isActive }) =>
                  `h-11 rounded-xl border-2 border-black/15 font-extrabold text-[14px] inline-flex items-center justify-center hover:opacity-80 transition ${
                    isActive ? "bg-[#B9FF66]/70" : "bg-white"
                  }`
                }
              >
                Sign-up
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
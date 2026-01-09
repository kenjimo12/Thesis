import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";

import heroImg from "../assets/mental-health.png";
import { signInWithGoogle } from "../auth";

import { setAuth, clearAuth, getUser, getToken } from "../utils/auth";

/* ======================
   SPINNER COMPONENT
====================== */
function Spinner({ size = 18 }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/* ======================
   TERMS MODAL
====================== */
function TermsModal({ open, onClose, onAgree, agreed, setAgreed, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[min(760px,94vw)] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-black/10">
          <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-[0.12em]">
            TERMS & CONDITIONS
          </h2>
          <p className="text-[13px] text-black/60 mt-2">
            Please review and accept to continue.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[52vh] overflow-y-auto text-[13px] sm:text-[14px] leading-relaxed text-black/75">
          <p className="font-bold text-black/80 mb-2">
            Summary (student-friendly)
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              CheckIn supports student well-being using tools like journaling and
              PHQ-9 self-assessment.
            </li>
            <li>
              CheckIn is <span className="font-semibold">not</span> a diagnostic
              tool and does not replace professional mental health care.
            </li>
            <li>
              You are responsible for keeping your account secure and using the
              platform respectfully.
            </li>
            <li>
              If you are in immediate danger, contact emergency services or your
              local hotline.
            </li>
          </ul>

          <div className="mt-5">
            <p className="font-bold text-black/80 mb-2">Full Terms</p>
            <p className="mb-3">
              By using CheckIn, you agree to follow these terms and to use the
              platform only for lawful, respectful, and appropriate purposes.
              You must not misuse the platform, harm others, attempt to access
              accounts without permission, or interfere with system security.
            </p>
            <p className="mb-3">
              CheckIn may store and process information you provide (such as
              journal entries and PHQ-9 responses) to deliver features, improve
              performance, and provide support when you request it. Your content
              is private by default and remains under your control.
            </p>
            <p className="mb-3">
              CheckIn is provided “as is.” While we aim for reliability, we
              cannot guarantee the service will always be available or error-free.
            </p>
            <p>
              You may stop using CheckIn at any time. We may update these terms
              when needed. If major changes happen, we may provide notice in the app.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2 text-[13px] font-bold">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-greenBorder"
            />
            I agree to the Terms & Conditions
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black bg-white hover:bg-black/5"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!agreed || loading}
              onClick={onAgree}
              className={`px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black
                flex items-center gap-2 justify-center
                ${
                  agreed
                    ? "bg-black text-white hover:opacity-90"
                    : "bg-black/30 text-white cursor-not-allowed"
                }
              `}
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  Loading
                </>
              ) : (
                "Agree & Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function redirectByRole(navigate, role) {
  if (role === "Admin") return navigate("/admin");
  if (role === "Consultant") return navigate("/consultant");
  return navigate("/dashboard"); // Student
}

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [error, setError] = useState("");

  const [showRoleModal, setShowRoleModal] = useState(true);
  const [role, setRole] = useState(""); // selected role portal only

  // form state
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  // TERMS
  const [showTerms, setShowTerms] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    if (savedRole) {
      setRole(savedRole);
      setShowRoleModal(false);
    }

    const savedTerms = localStorage.getItem("termsAccepted") === "true";
    setTermsAgreed(savedTerms);

    // auto redirect if already logged in
    const token = getToken();
    const user = getUser();
    if (token && user?.role) {
      redirectByRole(navigate, user.role);
    }
  }, [navigate]);

  const confirmRole = () => {
    if (!role) return;
    localStorage.setItem("userRole", role);
    setShowRoleModal(false);
  };

  const requireTermsThen = async (fn) => {
    if (!termsAgreed) {
      setShowTerms(true);
      return;
    }
    await fn();
  };

  const handleAgreeTerms = () => {
    setTermsLoading(true);
    setTimeout(() => {
      localStorage.setItem("termsAccepted", "true");
      setTermsAgreed(true);
      setShowTerms(false);
      setTermsLoading(false);
    }, 500);
  };

  const enforceRoleMatchOrLogout = (dbRole) => {
    if (role && dbRole && role !== dbRole) {
      clearAuth();
      throw new Error(`Role mismatch. Your account is ${dbRole}, not ${role}.`);
    }
  };

  /* ======================
     EMAIL/PASSWORD LOGIN
  ====================== */
  const handleEmailLogin = async () => {
    if (!role) {
      setShowRoleModal(true);
      return;
    }

    await requireTermsThen(async () => {
      setLoading(true);
      setError("");

      try {
        if (!emailOrUsername || !password) {
          throw new Error("Please enter email/username and password.");
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailOrUsername, password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Login failed");

        // ✅ store via helper (no scattered localStorage writes)
        setAuth(data.token, data.user);

        enforceRoleMatchOrLogout(data.user?.role);

        redirectByRole(navigate, data.user.role);
      } catch (err) {
        setError(err.message || "Login failed");
      } finally {
        setLoading(false);
      }
    });
  };

  /* ======================
     GOOGLE LOGIN
  ====================== */
  const handleGoogleLogin = async () => {
    if (!role) {
      setShowRoleModal(true);
      return;
    }

    await requireTermsThen(async () => {
      setLoading(true);
      setError("");

      try {
        const firebaseUser = await signInWithGoogle();

        const payload = {
          googleId: firebaseUser?.uid,
          email: firebaseUser?.email,
          fullName: firebaseUser?.displayName || "Google User",
        };

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Google login failed");

        // ✅ store via helper
        setAuth(data.token, data.user);

        enforceRoleMatchOrLogout(data.user?.role);

        redirectByRole(navigate, data.user.role);
      } catch (err) {
        setError(err.message || "Google login failed");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="relative">
      {/* TERMS MODAL */}
      <TermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAgree={handleAgreeTerms}
        agreed={termsAgreed}
        setAgreed={setTermsAgreed}
        loading={termsLoading}
      />

      {/* ROLE MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative w-[min(520px,92vw)] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] p-6">
            <h2 className="text-[18px] font-extrabold tracking-[0.18em]">
              ARE YOU A
            </h2>
            <p className="text-[13px] text-muted mt-2">Choose one to continue.</p>

            <div className="mt-5 flex flex-col gap-3">
              {["Student", "Consultant", "Admin"].map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between rounded-[14px] border-2 border-black px-4 py-3 cursor-pointer transition
                    ${role === r ? "bg-[#B9FF66]" : "bg-white hover:bg-black/5"}
                  `}
                >
                  <span className="font-bold capitalize">{r}</span>
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="accent-greenBorder"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={!role || roleLoading}
                onClick={() => {
                  setRoleLoading(true);
                  setTimeout(() => {
                    confirmRole();
                    setRoleLoading(false);
                  }, 600);
                }}
                className={`px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black
                  flex items-center gap-2 justify-center
                  ${
                    role
                      ? "bg-black text-white hover:opacity-90"
                      : "bg-black/30 text-white cursor-not-allowed"
                  }
                `}
              >
                {roleLoading ? (
                  <>
                    <Spinner size={16} />
                    Loading
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <div className="flex justify-between gap-[60px] px-[90px] pt-[70px] pb-10 lg:flex-row flex-col items-center">
        {/* LEFT */}
        <section className="w-[420px] mt-[18px] animate-slideIn max-w-[92vw]">
          <h1 className="text-[34px] font-black tracking-[.26em] mb-3">
            WELCOME
          </h1>

          <p className="text-[15px] text-muted mb-6">
            Welcome. Please enter your details.
          </p>

          {error && (
            <div className="mb-4 rounded-[14px] border-2 border-black bg-red-50 px-4 py-3 text-[13px] text-black">
              <span className="font-extrabold">Error:</span> {error}
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            <TextInput
              label="Email or Username"
              type="text"
              placeholder="Enter your email or username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
            />

            <TextInput
              label="Password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between text-[13px] mt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-greenBorder" />
                Remember me
              </label>

              <a href="#" className="font-bold hover:underline">
                Forgot password
              </a>
            </div>

            {/* LOGIN BUTTON */}
            <PrimaryButton
              disabled={loading}
              onClick={handleEmailLogin}
              className="mt-4 w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  Logging in
                </>
              ) : (
                "Login"
              )}
            </PrimaryButton>

            {/* GOOGLE BUTTON */}
            <GoogleButton onClick={handleGoogleLogin} loading={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  Connecting…
                </div>
              ) : (
                "Continue with Google"
              )}
            </GoogleButton>

            {/* Terms link */}
            <p className="text-[12px] text-black/60 mt-3 leading-relaxed">
              By continuing, you agree to CheckIn’s{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="font-extrabold underline"
              >
                Terms & Conditions
              </button>
              .
            </p>

            <p className="text-[13px] text-muted mt-4">
              Don&apos;t have an account?{" "}
              <Link to="/sign-up" className="font-extrabold hover:underline">
                Sign up for free!
              </Link>
            </p>

            {role && (
              <p className="text-[12px] mt-3">
                Role portal:{" "}
                <span className="font-bold capitalize">{role}</span>
                <button
                  onClick={() => setShowRoleModal(true)}
                  className="ml-2 underline font-bold"
                >
                  change
                </button>
              </p>
            )}
          </div>
        </section>

        {/* RIGHT */}
        <img
          src={heroImg}
          alt="Mental Health"
          className="w-[min(900px,62vw)] animate-fadeUp"
        />
      </div>
    </div>
  );
}

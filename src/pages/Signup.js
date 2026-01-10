import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";

import heroImg from "../assets/mental-health.png";
import { signInWithGoogle } from "../auth";

/* ======================
   SPINNER (for modal btn)
====================== */
function Spinner({ size = 16 }) {
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
            Please review and accept to create your account.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[52vh] overflow-y-auto text-[13px] sm:text-[14px] leading-relaxed text-black/75">
          <p className="font-bold text-black/80 mb-2">Summary</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              CheckIn supports student well-being using journaling and PHQ-9 self-assessment.
            </li>
            <li>
              CheckIn is <span className="font-semibold">not</span> a diagnostic tool and does not
              replace professional care.
            </li>
            <li>
              Use the platform respectfully. Do not attempt unauthorized access or misuse.
            </li>
            <li>
              If you are in immediate danger, contact emergency services or your local hotline.
            </li>
          </ul>

          <div className="mt-5">
            <p className="font-bold text-black/80 mb-2">Full Terms</p>
            <p className="mb-3">
              By creating an account and using CheckIn, you agree to use the platform only for
              lawful and appropriate purposes. You must not misuse the service, violate security,
              or disrupt the platform.
            </p>
            <p className="mb-3">
              CheckIn may store and process information you provide (such as journal entries and
              PHQ-9 responses) to deliver features and improve performance. Your content is private
              by default and remains under your control unless you explicitly share it for support.
            </p>
            <p className="mb-3">
              CheckIn is provided “as is.” While we aim for reliability, we cannot guarantee
              uninterrupted availability.
            </p>
            <p>
              We may update these terms when necessary. Continued use of the platform constitutes
              acceptance of updated terms.
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
                  <Spinner />
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

export default function Signup() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ form state (needed for backend POST)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    studentNumber: "",
    password: "",
    confirmPassword: "",
  });

  const setField = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  // terms flow
  const [showTerms, setShowTerms] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    const savedTerms = localStorage.getItem("termsAccepted") === "true";
    setTermsAgreed(savedTerms);
  }, []);

  const openTerms = () => setShowTerms(true);

  const handleAgreeTerms = () => {
    setTermsLoading(true);
    setTimeout(() => {
      localStorage.setItem("termsAccepted", "true");
      setTermsAgreed(true);
      setShowTerms(false);
      setTermsLoading(false);
    }, 450);
  };

  const requireTermsThen = async (fn) => {
    if (!termsAgreed) {
      setShowTerms(true);
      return;
    }
    await fn();
  };

  const handleGoogleSignup = async () => {
    await requireTermsThen(async () => {
      setLoading(true);
      setError("");

      try {
        const firebaseUser = await signInWithGoogle();

        // Depending on your auth.js, firebaseUser may be user or result.user
        const u = firebaseUser?.user || firebaseUser;

        const payload = {
          googleId: u?.uid,
          email: u?.email,
          fullName: u?.displayName || u?.email?.split("@")?.[0],
        };

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Google signup failed (backend).");
        }

        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/dashboard");
      } catch (error) {
        console.error(error);
        setError(error.message || "Google sign up failed");
      } finally {
        setLoading(false);
      }
    });
  };


  // ✅ THIS NOW POSTS TO BACKEND -> MongoDB
  const handleCreateAccount = async (e) => {
    e.preventDefault();

    await requireTermsThen(async () => {
      setLoading(true);
      setError("");

      try {
        // basic client-side checks
        if (!form.fullName || !form.email || !form.username || !form.studentNumber || !form.password) {
          throw new Error("Please fill in all required fields.");
        }
        if (form.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            username: form.username,
            studentNumber: form.studentNumber,
            password: form.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Signup failed.");
        }

        // Save session (JWT + user)
        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/dashboard");
      } catch (err) {
        setError(err.message || "Signup failed.");
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

      <div className="flex justify-between gap-[60px] px-[90px] pt-[70px] pb-10 lg:flex-row flex-col items-center">
        {/* LEFT: SIGNUP FORM */}
        <section className="w-[420px] mt-[18px] animate-slideIn max-w-[92vw]">
          <h1 className="text-[34px] font-black tracking-[.26em] mb-3">SIGN UP</h1>

          <p className="text-[15px] text-muted mb-6">
            Create your account. It only takes a minute.
          </p>

          {error && (
            <div className="mb-4 rounded-[14px] border-2 border-black bg-red-50 px-4 py-3 text-[13px] text-black">
              <span className="font-extrabold">Error:</span> {error}
            </div>
          )}

          <form className="flex flex-col gap-[6px]" onSubmit={handleCreateAccount}>
            <TextInput
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={setField("fullName")}
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={setField("email")}
            />
            <TextInput
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={setField("username")}
            />
            <TextInput
              label="Student number"
              type="text"
              placeholder="Enter your student number"
              value={form.studentNumber}
              onChange={setField("studentNumber")}
            />
            <TextInput
              label="Password"
              type="password"
              placeholder="********"
              value={form.password}
              onChange={setField("password")}
            />
            <TextInput
              label="Confirm Password"
              type="password"
              placeholder="********"
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
            />

            {/* Terms row */}
            <div className="flex items-start gap-2 text-[13px] mt-2">
              <input
                type="checkbox"
                className="accent-greenBorder mt-[2px]"
                checked={termsAgreed}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTermsAgreed(checked);
                  if (!checked) {
                    localStorage.removeItem("termsAccepted");
                  } else {
                    openTerms();
                  }
                }}
              />
              <p className="text-black/70 leading-relaxed">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={openTerms}
                  className="font-extrabold underline text-black"
                >
                  Terms & Conditions
                </button>
                .
              </p>
            </div>

            <PrimaryButton className="mt-4 w-full" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </PrimaryButton>

            <GoogleButton onClick={handleGoogleSignup} loading={loading}>
              {loading ? "Connecting…" : "Continue with Google"}
            </GoogleButton>

            <p className="text-[13px] text-muted mt-4">
              Already have an account?{" "}
              <Link to="/" className="font-extrabold hover:underline">
                Login
              </Link>
            </p>
          </form>
        </section>

        {/* RIGHT: HERO IMAGE */}
        <img
          src={heroImg}
          alt="Mental Health"
          className="w-[min(900px,62vw)] animate-fadeUp"
        />
      </div>
    </div>
  );
}

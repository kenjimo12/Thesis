import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** CheckIn palette */
const CHECKIN_GREEN = "#B9FF66";
const CHECKIN_DARK = "#141414";

/** Questions */
const QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure",
  "Trouble concentrating on things (e.g., studying)",
  "Moving or speaking slowly, or being restless",
  "Thoughts that you would be better off dead or hurting yourself",
];

const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

/** Icons */
function IconInfo({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 10.5v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 7.2h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconCheck({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconLock({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Doodles */
function DoodleSpark({ className = "" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <path
        d="M60 10l7 18 18 7-18 7-7 18-7-18-18-7 18-7 7-18Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M20 70c12-10 24-10 36 0s24 10 36 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function DoodleSquiggle({ className = "" }) {
  return (
    <svg viewBox="0 0 140 60" className={className} fill="none" aria-hidden="true">
      <path
        d="M5 35c12-18 22 18 34 0s22 18 34 0 22 18 34 0 22 18 34 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function DoodleHeart({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path
        d="M32 54S10 40 10 24c0-7 5-12 12-12 6 0 9 3 10 6 1-3 4-6 10-6 7 0 12 5 12 12 0 16-22 30-22 30Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Privacy modal */
function PrivacyModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-lg rounded-[22px] border border-black/10 bg-white shadow-xl overflow-hidden"
          >
            <div
              className="p-5"
              style={{
                background: `radial-gradient(700px 200px at 20% 0%, ${CHECKIN_GREEN} 0%, transparent 60%)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: CHECKIN_GREEN, color: CHECKIN_DARK }}
                >
                  <IconLock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-[16px] font-extrabold text-[#141414]">
                    Privacy Notice
                  </div>
                  <div className="text-[13px] text-black/60 mt-1">
                    Your PHQ-9 responses are treated as confidential.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-black/60 hover:text-black font-bold"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <ul className="text-[13px] text-black/70 leading-relaxed list-disc pl-5 space-y-2">
                  <li>
                    We only use your answers to provide screening feedback and
                    wellness guidance.
                  </li>
                  <li>Results are not a medical diagnosis.</li>
                  <li>You can reset the assessment anytime.</li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-full py-3 text-[13px] font-extrabold"
                style={{ backgroundColor: CHECKIN_DARK, color: "white" }}
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Reset confirmation modal */
function ResetConfirmModal({ open, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md rounded-[22px] border border-black/10 bg-white shadow-xl p-5"
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-[15px] font-extrabold text-[#141414]">
              Reset assessment?
            </div>
            <p className="mt-2 text-[13px] text-black/60">
              This will clear all answers and start over.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full py-3 text-[13px] font-extrabold bg-white hover:bg-black/5 transition"
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  color: CHECKIN_DARK,
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-full py-3 text-[13px] font-extrabold"
                style={{ backgroundColor: CHECKIN_DARK, color: "white" }}
              >
                Reset
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PHQ9() {
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("phq9_answers");
    return saved ? JSON.parse(saved) : Array(9).fill(null);
  });

  const [submitted, setSubmitted] = useState(() => {
    const saved = localStorage.getItem("phq9_submitted");
    return saved ? JSON.parse(saved) : false;
  });

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  /** one-at-a-time question index */
  const [activeIndex, setActiveIndex] = useState(0);
  const prevIndexRef = useRef(0);

  const answeredCount = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers]
  );
  const progressPct = useMemo(
    () => Math.round((answeredCount / 9) * 100),
    [answeredCount]
  );

  useEffect(() => {
    localStorage.setItem("phq9_answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem("phq9_submitted", JSON.stringify(submitted));
  }, [submitted]);

  /** show privacy modal first time only */
  useEffect(() => {
    const seen = localStorage.getItem("phq9_privacy_seen");
    if (!seen) {
      setPrivacyOpen(true);
      localStorage.setItem("phq9_privacy_seen", "1");
    }
  }, []);

  /** resume first unanswered */
  useEffect(() => {
    const firstEmpty = answers.findIndex((a) => a === null);
    if (firstEmpty !== -1) setActiveIndex(firstEmpty);
  }, []); // once

  /** track animation direction */
  const direction = activeIndex > prevIndexRef.current ? 1 : -1;
  useEffect(() => {
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  /** keyboard shortcuts */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (privacyOpen || confirmReset) return;
      if (submitted) return;

      if (e.key >= "1" && e.key <= "4") {
        const idx = Number(e.key) - 1;
        const opt = OPTIONS[idx];
        if (opt) setAnswer(activeIndex, opt.value);
        return;
      }

      if (e.key === "ArrowLeft") {
        setActiveIndex((x) => Math.max(0, x - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        setActiveIndex((x) => Math.min(QUESTIONS.length - 1, x + 1));
        return;
      }

      if (e.key === "Enter") {
        if (answers[activeIndex] !== null) {
          setActiveIndex((x) => Math.min(QUESTIONS.length - 1, x + 1));
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [privacyOpen, confirmReset, submitted, activeIndex, answers]);

  function setAnswer(qIndex, value) {
    if (submitted) return; // lock after submit
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = value;
      return next;
    });

    // auto-next: move forward if not last question
    if (qIndex < QUESTIONS.length - 1) {
      setTimeout(
        () => setActiveIndex((x) => Math.min(x + 1, QUESTIONS.length - 1)),
        180
      );
    }
  }

  function handleSubmit() {
    if (answeredCount !== 9) return;
    setSubmitted(true);
  }

  function resetAssessment() {
    setAnswers(Array(9).fill(null));
    setSubmitted(false);
    setActiveIndex(0);
  }

  const canSubmit = answeredCount === 9;
  const activeQuestion = QUESTIONS[activeIndex];
  const selected = answers[activeIndex];

  const slideVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? 30 : -30,
    }),
    center: {
      opacity: 1,
      x: 0,
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -30 : 30,
    }),
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%, #F7F7F7 100%)",
      }}
    >
      {/* spacing from navbar */}
      <div className="pt-[120px] sm:pt-[140px]">
        {/* doodle background */}
        <DoodleSpark className="absolute -top-8 -left-8 h-28 w-28 text-black/10 rotate-12" />
        <DoodleSquiggle className="absolute top-24 right-[-20px] h-16 w-44 text-black/10 rotate-[-8deg]" />
        <DoodleHeart className="absolute bottom-16 left-8 h-16 w-16 text-black/10" />
        <DoodleSpark className="absolute bottom-[-20px] right-10 h-24 w-24 text-black/10 -rotate-12" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
          <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
          <ResetConfirmModal
            open={confirmReset}
            onClose={() => setConfirmReset(false)}
            onConfirm={() => {
              setConfirmReset(false);
              resetAssessment();
            }}
          />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative rounded-[22px] border border-black/15 bg-white shadow-sm overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background: `radial-gradient(800px 200px at 20% 0%, ${CHECKIN_GREEN} 0%, transparent 60%)`,
              }}
            />
            <div className="relative p-6 sm:p-7 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: CHECKIN_GREEN, color: CHECKIN_DARK }}
                >
                  <IconInfo className="h-6 w-6" />
                </div>

                <div className="flex-1">
                  <h1 className="text-[20px] sm:text-[24px] font-extrabold tracking-tight text-[#141414]">
                    CheckIn: PHQ-9 Mental Wellness Check
                  </h1>
                  <p className="text-[13px] sm:text-[14px] text-black/60 mt-1 leading-relaxed">
                    Answer one question at a time. Your responses are confidential.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setPrivacyOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-[12px] font-extrabold text-black/70 hover:bg-black/5 transition"
                    >
                      <IconLock className="h-4 w-4" />
                      Privacy Notice
                    </button>

                    <div className="text-[12px] text-black/50 font-semibold">
                      Tips: Press <span className="font-extrabold text-black">0–3</span> to answer,{" "}
                      <span className="font-extrabold text-black">← →</span> to navigate.
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <div className="rounded-full border border-black/15 bg-white px-4 py-2">
                    <div className="text-[11px] text-black/50">Progress</div>
                    <div className="text-[14px] font-extrabold text-black">
                      {answeredCount}/9
                    </div>
                  </div>

                  {/* submitted state only */}
                  {submitted && (
                    <div
                      className="rounded-full border px-4 py-2 text-[13px] font-extrabold"
                      style={{
                        backgroundColor: CHECKIN_GREEN,
                        color: CHECKIN_DARK,
                        borderColor: "rgba(0,0,0,0.15)",
                      }}
                    >
                      Submitted
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-black/60 font-bold">
                    Question <span className="text-black">{activeIndex + 1}</span> / 9
                  </div>
                  <div className="text-[12px] text-black/60">{progressPct}% complete</div>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-black/5 overflow-hidden border border-black/10">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: CHECKIN_GREEN }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>

                {/* Mini map chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUESTIONS.map((_, i) => {
                    const done = answers[i] !== null;
                    const isActive = i === activeIndex;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className="h-9 w-9 rounded-full border text-[13px] font-extrabold transition"
                        style={{
                          borderColor: isActive
                            ? "rgba(0,0,0,0.35)"
                            : "rgba(0,0,0,0.15)",
                          background: isActive
                            ? "rgba(185,255,102,0.35)"
                            : done
                            ? CHECKIN_GREEN
                            : "white",
                          color: CHECKIN_DARK,
                        }}
                        title={done ? "Answered" : "Not answered"}
                      >
                        {done ? <IconCheck className="h-4 w-4 mx-auto" /> : i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Question (one at a time) */}
          <div className="mt-5">
            <div className="rounded-[22px] border border-black/10 bg-white shadow-sm overflow-hidden relative">
              <DoodleSquiggle className="absolute top-2 right-2 h-8 w-24 text-black/10" />

              <div className="px-5 py-4 bg-black/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-[13px]"
                    style={{ backgroundColor: CHECKIN_GREEN, color: CHECKIN_DARK }}
                  >
                    {activeIndex + 1}
                  </div>
                  <div className="text-[13px] font-extrabold text-[#141414]">
                    PHQ-9 Question
                  </div>
                </div>

                <div className="text-[12px] text-black/60">
                  {selected !== null ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-full border border-black/10 flex items-center justify-center"
                        style={{ backgroundColor: CHECKIN_DARK, color: "white" }}
                      >
                        <IconCheck className="h-4 w-4" />
                      </span>
                      Answered
                    </span>
                  ) : (
                    "Not answered"
                  )}
                </div>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <div className="text-[15px] sm:text-[16px] font-extrabold text-[#141414] leading-snug">
                      {activeQuestion}
                    </div>
                    <div className="mt-1 text-[12px] text-black/55">
                      Choose one option below.
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {OPTIONS.map((opt) => {
                        const active = selected === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={submitted}
                            onClick={() => setAnswer(activeIndex, opt.value)}
                            className="rounded-2xl border px-4 py-4 text-left transition shadow-sm disabled:opacity-60"
                            style={{
                              borderColor: active
                                ? "rgba(0,0,0,0.28)"
                                : "rgba(0,0,0,0.12)",
                              background: active
                                ? "rgba(185,255,102,0.35)"
                                : "white",
                              boxShadow: active
                                ? "0 10px 26px rgba(0,0,0,0.06)"
                                : undefined,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="text-[11px] font-extrabold px-2 py-1 rounded-full border"
                                style={{
                                  background: active ? "white" : "rgba(0,0,0,0.04)",
                                  borderColor: "rgba(0,0,0,0.10)",
                                  color: "rgba(0,0,0,0.70)",
                                }}
                              >
                                {opt.value} pts
                              </div>
                              <div
                                className="h-6 w-6 rounded-full border flex items-center justify-center"
                                style={{
                                  borderColor: "rgba(0,0,0,0.15)",
                                  background: active ? CHECKIN_DARK : "white",
                                  color: active ? "white" : "transparent",
                                }}
                              >
                                {active && <IconCheck className="h-4 w-4" />}
                              </div>
                            </div>

                            <div className="mt-2 font-extrabold text-[13px] text-[#141414]">
                              {opt.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation controls */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveIndex((x) => Math.max(0, x - 1))}
                    disabled={activeIndex === 0}
                    className="rounded-full px-5 py-3 text-[13px] font-extrabold bg-white hover:bg-black/5 transition disabled:opacity-40"
                    style={{ border: "1px solid rgba(0,0,0,0.15)", color: CHECKIN_DARK }}
                  >
                    Prev
                  </button>

                  <div className="text-[12px] text-black/50 font-semibold">
                    {activeIndex + 1} / 9
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((x) => Math.min(QUESTIONS.length - 1, x + 1))
                    }
                    disabled={activeIndex === QUESTIONS.length - 1}
                    className="rounded-full px-5 py-3 text-[13px] font-extrabold bg-white hover:bg-black/5 transition disabled:opacity-40"
                    style={{ border: "1px solid rgba(0,0,0,0.15)", color: CHECKIN_DARK }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit section */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 rounded-[22px] border border-black/10 bg-white shadow-sm p-5">
              <h4 className="text-[14px] font-extrabold text-[#141414]">Submit</h4>
              <p className="text-[13px] text-black/60 mt-1">
                Answer all questions to submit.
              </p>

              <button
                disabled={!canSubmit || submitted}
                onClick={handleSubmit}
                className="mt-4 w-full rounded-full py-3 text-[13px] font-extrabold transition disabled:opacity-50"
                style={{
                  backgroundColor: CHECKIN_GREEN,
                  color: CHECKIN_DARK,
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
              >
                {submitted ? "You already submitted" : "Submit Assessment"}
              </button>

              <button
                onClick={() => setConfirmReset(true)}
                className="mt-3 w-full rounded-full py-3 text-[13px] font-extrabold bg-white hover:bg-black/5 transition"
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  color: CHECKIN_DARK,
                }}
              >
                Reset
              </button>

              {!canSubmit && !submitted && (
                <p className="mt-3 text-[12px] text-black/55">
                  Remaining:{" "}
                  <span className="font-extrabold text-black">{9 - answeredCount}</span>
                </p>
              )}
            </div>

            {/* Status (no severity, no colors) */}
            <div className="lg:col-span-2 rounded-[22px] border border-black/10 bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[14px] font-extrabold text-[#141414]">Status</h4>
                  <p className="text-[13px] text-black/60 mt-1">
                    {submitted
                      ? "You already submitted your PHQ-9 assessment."
                      : "Submit to finalize your responses."}
                  </p>
                </div>

                {submitted && (
                  <div
                    className="rounded-full border px-4 py-2 text-[13px] font-extrabold"
                    style={{
                      backgroundColor: CHECKIN_GREEN,
                      color: CHECKIN_DARK,
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                  >
                    Submitted
                  </div>
                )}
              </div>

              {submitted ? (
                <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-4 text-[13px] text-black/70">
                  Thank you. Your responses have been recorded.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-4 text-[13px] text-black/60">
                  Complete all 9 questions to enable submit.
                </div>
              )}
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}

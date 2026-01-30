// src/components/GoogleButton.jsx

export default function GoogleButton({
  onClick,
  loading,
  label = "Login with Google",
  loadingLabel = "Signing in...",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="
        mt-3 h-[46px] rounded-xl border border-border bg-white
        flex items-center justify-center gap-2
        text-[14px] font-extrabold
        shadow-md
        transition-all
        hover:-translate-y-0.5 hover:shadow-lg
        disabled:opacity-60 disabled:cursor-not-allowed
      "
    >
      <span className="text-[16px] font-black">G</span>
      {loading ? loadingLabel : label}
    </button>
  );
}

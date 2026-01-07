import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";

import heroImg from "../assets/mental-health.png";
import { signInWithGoogle } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      console.log("Logged in user:", user);

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-between gap-[60px] px-[90px] pt-[70px] pb-10 lg:flex-row flex-col items-center">
      {/* LEFT: LOGIN FORM */}
      <section className="w-[420px] mt-[18px] animate-slideIn max-w-[92vw]">
        <h1 className="text-[34px] font-black tracking-[.26em] mb-3">
          WELCOME
        </h1>

        <p className="text-[15px] text-muted mb-6">
          Welcome. Please enter your details.
        </p>

        <div className="flex flex-col gap-[6px]">
          <TextInput
            label="Email"
            type="email"
            placeholder="Enter your email"
          />

          <TextInput
            label="Password"
            type="password"
            placeholder="********"
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

          <PrimaryButton className="mt-4 w-full">
            Login
          </PrimaryButton>

          <GoogleButton
            onClick={handleGoogleLogin}
            loading={loading}
          />

          <p className="text-[13px] text-muted mt-4">
            Don&apos;t have an account?{" "}
            <Link
              to="/sign-up"
              className="font-extrabold hover:underline"
            >
              Sign up for free!
            </Link>
          </p>
        </div>
      </section>

      {/* RIGHT: HERO IMAGE */}
      <img
        src={heroImg}
        alt="Mental Health"
        className="w-[min(900px,62vw)] animate-fadeUp"
      />
    </div>
  );
}

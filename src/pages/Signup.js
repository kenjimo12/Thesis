import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";

import heroImg from "../assets/mental-health.png";
import { signInWithGoogle } from "../auth";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      console.log("Google signup user:", user);

      // ✅ after signup, go dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Google sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();
    // TODO: add email/password signup here (Firebase createUserWithEmailAndPassword)
    alert("Email/Password signup not added yet.");
  };

  return (
    <div className="flex justify-between gap-[60px] px-[90px] pt-[70px] pb-10 lg:flex-row flex-col items-center">
      {/* LEFT: SIGNUP FORM */}
      <section className="w-[420px] mt-[18px] animate-slideIn max-w-[92vw]">
        <h1 className="text-[34px] font-black tracking-[.26em] mb-3">
          SIGN UP
        </h1>

        <p className="text-[15px] text-muted mb-6">
          Create your account. It only takes a minute.
        </p>

        <form className="flex flex-col gap-[6px]" onSubmit={handleCreateAccount}>
          <TextInput label="Full Name" type="text" placeholder="Enter your full name" />
          <TextInput label="Email" type="email" placeholder="Enter your email" />
          <TextInput label="Username" type="text" placeholder="Enter your username" />
          <TextInput label="Student number" type="password" placeholder="Enter your student number "/>
          <TextInput label="Password" type="password" placeholder="********" />
          <TextInput label="Confirm Password" type="password" placeholder="********" />

          <label className="flex items-center gap-2 text-[13px] mt-2">
            <input type="checkbox" className="accent-greenBorder" required />
            I agree to the Terms & Conditions
          </label>

          <PrimaryButton className="mt-4 w-full" type="submit">
            Create Account
          </PrimaryButton>

          <GoogleButton onClick={handleGoogleSignup} loading={loading} />

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
  );
}

// src/layouts/MainLayout.js
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ConfirmModal from "../components/ui/ConfirmModal";

function isPublicPath(pathname) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/sign-up" ||
    pathname === "/forgotpassword" ||
    pathname === "/about-us" ||
    pathname === "/privacy-policy" ||
    pathname === "/services/emergency" ||
    pathname === "/unauthorized"
  );
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Store last "safe/current page" so we can keep user here when blocked
  useEffect(() => {
    if (isPublicPath(location.pathname)) {
      sessionStorage.setItem("last_safe_path", location.pathname);
    }
  }, [location.pathname]);

  const authRequired = location.state?.authRequired === true;
  const intended = location.state?.intended || "";
  const message =
    location.state?.message ||
    "You are not logged in. Please log in to continue.";

  const [open, setOpen] = useState(false);

  // Open modal when ProtectedRoute sends authRequired state
  useEffect(() => {
    if (authRequired) setOpen(true);
  }, [authRequired, intended]);

  const clearAuthModalState = () => {
    setOpen(false);
    // ✅ remove the authRequired state without changing the current page
    navigate(location.pathname, { replace: true, state: null });
  };

  const goLogin = () => {
    setOpen(false);
    // ✅ allow login page to optionally redirect back after success
    navigate("/login", { state: { from: intended || "/" } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      <Navbar />

      {/* main content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <Footer />

      {/* ✅ Auth Notice Modal (stays on current page) */}
      <ConfirmModal
        open={open}
        title="LOGIN REQUIRED"
        message={message}
        confirmText="Go to Login"
        cancelText="Close"
        hideCancel={false}
        // background click closes (AppModal already supports it)
        onClose={clearAuthModalState}
        onConfirm={goLogin}
      />
    </div>
  );
}

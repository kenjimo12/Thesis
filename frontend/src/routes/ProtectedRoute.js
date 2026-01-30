// src/routes/ProtectedRoute.js
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

function isAuthenticated() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  const user = localStorage.getItem("user") || sessionStorage.getItem("user");

  return Boolean(token || user);
}

export default function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const authed = isAuthenticated();

  useEffect(() => {
    if (authed) return;

    // ✅ Keep them on a safe/current page, NOT the restricted one
    const lastSafe = sessionStorage.getItem("last_safe_path") || "/";

    navigate(lastSafe, {
      replace: true,
      state: {
        authRequired: true,
        intended: location.pathname,
        message: "You are not logged in. Please log in to access this feature.",
      },
    });
  }, [authed, navigate, location.pathname]);

  // Block restricted route content
  if (!authed) return null;

  return <Outlet />;
}

// src/routes/ProtectedRoute.js
import React from "react";
import { Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // ✅ TEMP: allow everyone (no auth checks)
  return <Outlet />;
}

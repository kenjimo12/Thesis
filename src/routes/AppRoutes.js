import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import AboutUs from "../pages/AboutUs";
import PrivacyPolicy from "../pages/PrivacyPolicy";

import GuidanceCounseling from "../pages/Services/GuidanceCounseling";
import Journal from "../pages/Services/Journal";
import Assessment from "../pages/Services/Assessment";
import Emergency from "../pages/Services/Emergency";

import ScrollToTop from "../components/ScrollToTop";

// ✅ add these imports
import ProtectedRoute from "../routes/ProtectedRoute";
import RequireRole from "../routes/RequireRole";
import Unauthorized from "../pages/Unauthorized";

// ✅ OPTIONAL: Only import these when you already have them
// import AdminDashboard from "../pages/Admin/AdminDashboard";
// import ConsultantDashboard from "../pages/Consultant/ConsultantDashboard";

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* =======================
            PUBLIC (NO TOKEN NEEDED)
           ======================= */}
        <Route element={<MainLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>

        {/* =======================
            PROTECTED (TOKEN REQUIRED)
           ======================= */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* General protected pages (any logged-in role) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Services Pages (any logged-in role) */}
            <Route path="/services/counseling" element={<GuidanceCounseling />} />
            <Route path="/services/journal" element={<Journal />} />
            <Route path="/services/assessment" element={<Assessment />} />
            <Route path="/services/emergency" element={<Emergency />} />

            {/* =======================
                ROLE-BASED (UNCOMMENT WHEN READY)
               ======================= */}

            {/* ✅ Admin only */}
            {/*
            <Route element={<RequireRole allowedRoles={["Admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            */}

            {/* ✅ Consultant only */}
            {/*
            <Route element={<RequireRole allowedRoles={["Consultant"]} />}>
              <Route path="/consultant" element={<ConsultantDashboard />} />
            </Route>
            */}
          </Route>
        </Route>
      </Routes>
    </>
  );
}

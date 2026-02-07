// src/routes/AppRoutes.js
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import AboutUs from "../pages/AboutUs";
import PrivacyPolicy from "../pages/PrivacyPolicy";

import GuidanceCounseling from "../pages/Services/GuidanceCounseling";
import Request from "../pages/Services/SessionType/Request";
import ViewRequest from "../pages/Services/SessionType/ViewRequest";

import Journal from "../pages/Services/Journal";
import Assessment from "../pages/Services/Assessment";
import Emergency from "../pages/Services/Emergency";

import ScrollToTop from "../components/ScrollToTop";
import Unauthorized from "../pages/Unauthorized";

// Students
import ProfileSettings from "../pages/Student/ProfileSettings";

// Admin/Counselor page
import CounselorDashboard from "../pages/CounselorDashboard/CounselorDashboard";

// ✅ your protected wrapper (currently OFF inside ProtectedRoute.js)
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* =======================
            COUNSELOR DASHBOARD
            NO NAVBAR + NO FOOTER
            ======================= */}
        <Route element={<ProtectedRoute />}>
          <Route path="/counselor/dashboard" element={<CounselorDashboard />} />
        </Route>

        {/* =======================
            MAIN SITE (WITH NAVBAR/FOOTER)
            ======================= */}
        <Route element={<MainLayout />}>
          {/* PUBLIC */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/services/emergency" element={<Emergency />} />

          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<Signup />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* TEMP: These were protected before, now open because ProtectedRoute allows all */}
          <Route element={<ProtectedRoute />}>
            {/* Guidance Counseling */}
            <Route path="/services/counseling" element={<GuidanceCounseling />} />
            <Route path="/services/counseling/request" element={<Request />} />
            <Route path="/services/counseling/requests" element={<ViewRequest />} />

            {/* Other services */}
            <Route path="/services/journal" element={<Journal />} />
            <Route path="/services/assessment" element={<Assessment />} />

            {/* Student */}
            <Route path="/profile-settings" element={<ProfileSettings />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

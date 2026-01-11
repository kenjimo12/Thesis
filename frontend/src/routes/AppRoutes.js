// src/routes/AppRoutes.js
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import AboutUs from "../pages/AboutUs";
import PrivacyPolicy from "../pages/PrivacyPolicy";

import GuidanceCounseling from "../pages/Services/GuidanceCounseling";
import Request from "../pages/Services/SessionType/Request";
import ViewRequest from "../pages/Services/SessionType/ViewRequest";

import Journal from "../pages/Services/Journal";
import Assessment from "../pages/Services/Assessment";
import Emergency from "../pages/Services/Emergency";

import ScrollToTop from "../components/ScrollToTop";

// Guards

import Unauthorized from "../pages/Unauthorized";

// Students
import ProfileSettings from "../pages/Student/ProfileSettings";

// Admin page
import CounselorDashboard from "../pages/CounselorDashboard/CounselorDashboard";

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* =======================
            PUBLIC (NO TOKEN NEEDED)
           ======================= */}
           <Route path="/counselor/dashboard" element={<CounselorDashboard />} />
        <Route element={<MainLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>

        {/* =======================
            PROTECTED (TOKEN REQUIRED)
           ======================= */}
        {/* =<Route element={<ProtectedRoute />}>  remove this when api is ready     */}
          <Route element={<MainLayout />}>
            {/* General protected pages (any logged-in role) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Services Pages (any logged-in role) */}
            <Route path="/services/counseling" element={<GuidanceCounseling />} />
            <Route path="/services/counseling/request" element={<Request />} />
            <Route path="/services/counseling/requests" element={<ViewRequest />} />

            <Route path="/services/journal" element={<Journal />} />
            <Route path="/services/assessment" element={<Assessment />} />
            <Route path="/services/emergency" element={<Emergency />} />

            <Route path="/student/profilesettings" element={<ProfileSettings/>} />
            
            {/* =======================
                ROLE-BASED
               ======================= */}
            {/*<{/*Route element={<RequireRole allowedRoles={["Admin"]} />}>
              
            </Route>*/}

            
         
          </Route>
        {/*</Route>*/}

      </Routes>
    </>
  );
}

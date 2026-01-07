import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Signup from "../pages/Signup";


export default function AppRoutes() {
  return (
    <Routes>
      {/* AUTH PAGES */}
      <Route element={<MainLayout/>}>
        <Route path="/login" element={<Login />} />
        <Route path="/sign-up" element={<Signup />} />
      </Route>

      {/* PROTECTED PAGES */}
     
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
   
    </Routes>
  );
}

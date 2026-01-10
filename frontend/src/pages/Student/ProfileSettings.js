import React, { useMemo, useState } from "react";

/* ===================== THEME (match Request.js) ===================== */
const ACCENT = "#B9FF66";
const TEXT_MAIN = "#141414";
const TEXT_MUTED = "rgba(20,20,20,0.82)";
const TEXT_SOFT = "rgba(20,20,20,0.66)";

/* ===================== DATA ===================== */
const campuses = [
  "Andres Bonifacio",
  "Juan Sumulong",
  "Apolinario Mabini",
  "Jose Abad Santos",
  "Elisa Esguera",
  "Jose Rizal",
  "Plaridel",
];

const seniorHighStrands = ["STEM", "ABM", "HUMSS", "GAS", "TVL"];

const collegeCourses = [
  "BS Computer Science",
  "BS Information Technology",
  "BS Psychology",
  "BS Business Administration",
  "BS Nursing",
];

/* ===================== COMPONENT ===================== */
export default function ProfileSettings() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    profilePicture: null,
    email: "",
    studentId: "",
    campus: "",
    course: "",
    gradeLevel: "",
    password: "",
  });

  const isSeniorHigh =
    profileData.gradeLevel === "Grade 11" || profileData.gradeLevel === "Grade 12";

  const isCollege =
    profileData.gradeLevel === "1st Year College" ||
    profileData.gradeLevel === "2nd Year College" ||
    profileData.gradeLevel === "3rd Year College" ||
    profileData.gradeLevel === "4th Year College";

  const profilePreviewUrl = useMemo(() => {
    if (!profileData.profilePicture) return "";
    return URL.createObjectURL(profileData.profilePicture);
  }, [profileData.profilePicture]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setProfileData((p) => ({ ...p, profilePicture: file }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If grade level changes, reset course so it won't keep old strand/course
    if (name === "gradeLevel") {
      setProfileData((p) => ({ ...p, gradeLevel: value, course: "" }));
      return;
    }

    setProfileData((p) => ({ ...p, [name]: value }));
  };

  const handleSave = () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setEditing(false);
      alert("Profile updated successfully!");
    }, 2000);
  };

  const toggleEdit = () => setEditing((prev) => !prev);

  return (
    <div className="w-full min-h-screen flex items-start justify-center px-4 pt-6 pb-10">
      <div className="w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-[22px] bg-transparent">
          <div className="px-2 py-6 md:px-6 md:py-10">
            {/* Header */}
            <div className="text-center">
              <h2
                className="font-[Nunito] text-[30px] md:text-[38px] font-extrabold"
                style={{ color: TEXT_MAIN }}
              >
                Profile Settings
              </h2>
              <p
                className="mt-2 font-[Lora] text-[15.5px] md:text-[16.5px] leading-relaxed"
                style={{ color: TEXT_MUTED }}
              >
                Update your account info. Tap <span className="font-semibold">Edit</span> to make changes.
              </p>
            </div>

            {/* Card container */}
            <div className="mt-7 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
              {/* Left: Profile picture */}
              <div className="rounded-2xl bg-white/85 px-5 py-5">
                <div
                  className="font-[Nunito] font-extrabold text-[16.5px]"
                  style={{ color: TEXT_MAIN }}
                >
                  Profile Picture
                </div>
                <div
                  className="mt-1 font-[Lora] text-[14.5px] leading-relaxed"
                  style={{ color: TEXT_MUTED }}
                >
                  Upload a clear photo. This will be shown on your account.
                </div>

                <div className="mt-5 flex flex-col items-center">
                  <div
                    className="h-28 w-28 rounded-full overflow-hidden border border-black/10 bg-white/90 flex items-center justify-center"
                    title="Profile preview"
                  >
                    {profilePreviewUrl ? (
                      <img
                        src={profilePreviewUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center px-4">
                        <div
                          className="font-[Nunito] font-extrabold text-[14px]"
                          style={{ color: TEXT_SOFT }}
                        >
                          No photo
                        </div>
                        <div
                          className="font-[Lora] text-[12.5px]"
                          style={{ color: TEXT_SOFT }}
                        >
                          Upload when ready
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 w-full">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={!editing}
                      className={[
                        inputClass,
                        "h-auto py-3 cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-2 file:font-[Nunito] file:font-extrabold file:text-[13px] file:text-[#141414] hover:file:bg-black/10",
                        !editing ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    />
                    {!editing ? (
                      <div
                        className="mt-2 text-[13.5px] font-[Lora]"
                        style={{ color: TEXT_SOFT }}
                      >
                        Enable Edit to upload a new photo.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl p-4 border border-black/10">
                  <div
                    className="font-[Nunito] font-extrabold text-[15.5px]"
                    style={{ color: TEXT_MAIN }}
                  >
                    Status
                  </div>
                  <div
                    className="mt-1 font-[Lora] text-[14.5px]"
                    style={{ color: TEXT_MUTED }}
                  >
                    {editing ? "Editing enabled." : "Viewing only."}
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="rounded-2xl bg-white/85 px-5 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Student ID">
                    <input
                      type="text"
                      name="studentId"
                      value={profileData.studentId}
                      onChange={handleChange}
                      disabled={!editing}
                      className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                      placeholder="Enter your student number"
                    />
                  </Field>

                  <Field label="Email Address">
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      disabled={!editing}
                      className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                      placeholder="name@student.edu"
                    />
                  </Field>

                  <Field label="Campus">
                    <select
                      name="campus"
                      value={profileData.campus}
                      onChange={handleChange}
                      disabled={!editing}
                      className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                    >
                      <option value="">Select Campus</option>
                      {campuses.map((campus) => (
                        <option key={campus} value={campus}>
                          {campus}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Grade Level">
                    <select
                      name="gradeLevel"
                      value={profileData.gradeLevel}
                      onChange={handleChange}
                      disabled={!editing}
                      className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                    >
                      <option value="">Select Grade Level</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                      <option value="1st Year College">1st Year College</option>
                      <option value="2nd Year College">2nd Year College</option>
                      <option value="3rd Year College">3rd Year College</option>
                      <option value="4th Year College">4th Year College</option>
                    </select>
                  </Field>

                  {/* Strand / Course */}
                  {isSeniorHigh ? (
                    <Field label="Strand" className="md:col-span-2">
                      <select
                        name="course"
                        value={profileData.course}
                        onChange={handleChange}
                        disabled={!editing}
                        className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                      >
                        <option value="">Select Strand</option>
                        {seniorHighStrands.map((strand) => (
                          <option key={strand} value={strand}>
                            {strand}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 font-[Lora] text-[13.5px]" style={{ color: TEXT_SOFT }}>
                        This will appear on your profile.
                      </div>
                    </Field>
                  ) : null}

                  {isCollege ? (
                    <Field label="Course" className="md:col-span-2">
                      <select
                        name="course"
                        value={profileData.course}
                        onChange={handleChange}
                        disabled={!editing}
                        className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                      >
                        <option value="">Select Course</option>
                        {collegeCourses.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 font-[Lora] text-[13.5px]" style={{ color: TEXT_SOFT }}>
                        Choose the program you’re enrolled in.
                      </div>
                    </Field>
                  ) : null}

                  <Field label="Password" className="md:col-span-2">
                    <input
                      type="password"
                      name="password"
                      value={profileData.password}
                      onChange={handleChange}
                      disabled={!editing}
                      className={[inputClass, !editing ? "opacity-60" : ""].join(" ")}
                      placeholder="••••••••"
                    />
                    <div className="mt-2 font-[Lora] text-[13.5px]" style={{ color: TEXT_SOFT }}>
                      Tip: use at least 8 characters.
                    </div>
                  </Field>

                  {/* Actions */}
                  <div className="md:col-span-2 pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={toggleEdit}
                      disabled={loading}
                      className={[
                        ghostBtn,
                        loading ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {editing ? "Cancel" : "Edit"}
                    </button>

                    <div className="flex flex-col items-end gap-2">
                      {editing ? (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={loading}
                          className={[
                            primaryBtn,
                            loading ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                          style={{ backgroundColor: ACCENT }}
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                      ) : (
                        <span
                          className="text-[12.5px] font-[Lora] text-right"
                          style={{ color: TEXT_SOFT }}
                        >
                          Enable Edit to update your profile.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="md:col-span-2">
                    <div
                      className="mt-2 rounded-2xl bg-white/90 px-4 py-3 text-[14.5px] font-[Lora]"
                      style={{ color: TEXT_MUTED }}
                    >
                      Your changes will be saved to your account after you tap <b style={{ color: TEXT_MAIN }}>Save</b>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tiny accent hint */}
            <div className="mt-6 flex justify-center">
              <span
                className="px-3 py-1 rounded-full text-[13px] font-[Nunito] font-extrabold"
                style={{ backgroundColor: `${ACCENT}55`, color: TEXT_MAIN }}
              >
                Accent: {ACCENT}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== CLASSES (match Request.js) ===================== */
const inputClass =
  "w-full h-12 px-4 rounded-xl bg-white/90 hover:bg-white focus:bg-white outline-none focus:ring-2 focus:ring-black/10 font-[Nunito] text-[15.5px] text-[#141414] disabled:cursor-not-allowed";

const primaryBtn =
  "h-12 px-7 rounded-xl hover:brightness-95 transition font-[Nunito] text-[15.5px] font-extrabold text-[#141414]";

const ghostBtn =
  "h-12 px-6 rounded-xl bg-white/90 hover:bg-white transition font-[Nunito] text-[15.5px] font-bold text-[#141414]";

/* ===================== UI ===================== */
function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label
        className="block mb-2 font-[Nunito] font-extrabold text-[16px]"
        style={{ color: TEXT_MAIN }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

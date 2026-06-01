import React, { useState } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader, 
  Sparkles,
  ArrowRight
} from "lucide-react";

export const ProfileHub = ({ studentProfile, onRefreshProfile }) => {
  const { token } = useAuth();
  const [mobile, setMobile] = useState(studentProfile?.mobile || "");
  const [email, setEmail] = useState(studentProfile?.email || "");
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [notif, setNotif] = useState({ text: "", type: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // Face uploads state
  const [frontImage, setFrontImage] = useState(null);
  const [leftImage, setLeftImage] = useState(null);
  const [rightImage, setRightImage] = useState(null);
  const [registeringFaces, setRegisteringFaces] = useState(false);
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);

  const showNotification = (text, type = "info") => {
    setNotif({ text, type });
    setTimeout(() => setNotif({ text: "", type: "" }), 5000);
  };

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!mobile || !email) {
      showNotification("Please fill in both mobile and email", "error");
      return;
    }
    setSavingDetails(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentProfile.student_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobile, email }),
      });
      if (response.ok) {
        showNotification("Contact information updated successfully", "success");
        onRefreshProfile();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update profile");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!email) {
      showNotification("Please update your email address first", "error");
      return;
    }
    setSendingEmail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentProfile.student_id}/send-verification-email?email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setEmailSent(true);
        showNotification("Mock verification code sent! Use code: 589410", "success");
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Failed to send email");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (!verificationCode) return;
    setVerifyingEmail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentProfile.student_id}/verify-email?code=${verificationCode}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        showNotification("Email verified successfully!", "success");
        setEmailSent(false);
        setVerificationCode("");
        onRefreshProfile();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Invalid code. Please try again.");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleProfilePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePhoto(e.target.files[0]);
    }
  };

  const handleUploadProfilePhoto = async () => {
    if (!profilePhoto) return;
    setUploadingProfilePhoto(true);
    const formData = new FormData();
    formData.append("file", profilePhoto);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentProfile.student_id}/profile-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        showNotification("Profile picture updated", "success");
        setProfilePhoto(null);
        onRefreshProfile();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Photo upload failed");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

  const handleFaceRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!frontImage || !leftImage || !rightImage) {
      showNotification("Please select all three angles (Front, Left, Right)", "error");
      return;
    }
    setRegisteringFaces(true);
    const formData = new FormData();
    formData.append("front", frontImage);
    formData.append("left", leftImage);
    formData.append("right", rightImage);

    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentProfile.student_id}/register-faces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        showNotification("Multi-angle face model trained and live!", "success");
        setFrontImage(null);
        setLeftImage(null);
        setRightImage(null);
        onRefreshProfile();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Face registration failed");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setRegisteringFaces(false);
    }
  };

  const completionPct = studentProfile?.profile_completed_percentage || 25;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          Profile Completion Center
        </h1>
        <p className="text-slate-400 text-sm">
          Complete your credentials, verify your contact information, and upload multi-angle face profiles.
        </p>
      </div>

      {/* Progress Card */}
      <div className="relative overflow-hidden glass-panel p-6 group">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <ShieldCheck className="w-32 h-32 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-lg font-bold text-white">Your Profile is {completionPct}% Complete</h2>
            <p className="text-xs text-slate-400 max-w-lg">
              {completionPct < 100 
                ? "You must complete 100% of your profile before you can access the QR scanners or other attendance student portals."
                : "Excellent! Your profile is verified and active. You are fully authorized to mark attendance."
              }
            </p>
          </div>
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Overall Progress</span>
              <span>{completionPct}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-700" 
                style={{ width: `${completionPct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {notif.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
          notif.type === "success" 
            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            : "bg-red-950/20 border-red-500/30 text-red-300"
        }`}>
          {notif.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notif.text}</span>
        </div>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Credentials & Contact Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              1. Basic Credentials
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Student Name</span>
                <p className="text-slate-200 font-medium">{studentProfile?.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Student ID / Roll</span>
                <p className="text-slate-200 font-medium font-mono">{studentProfile?.student_id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Course</span>
                <p className="text-slate-200 font-medium">{studentProfile?.course}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Year / Division</span>
                <p className="text-slate-200 font-medium">{studentProfile?.year} - Div {studentProfile?.division || "N/A"}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateDetails} className="space-y-4 pt-4 border-t border-slate-800/50">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingDetails}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {savingDetails ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-indigo-400" />}
                Save Credentials
              </button>
            </form>
          </div>

          {/* Email Verification Section */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              2. Email Verification
            </h3>
            {studentProfile?.is_email_verified ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Email address verified</p>
                  <p className="text-xs text-slate-400 mt-0.5">{studentProfile.email}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Verify your email address to secure your account. Click below to trigger a verification code.
                </p>
                {!emailSent ? (
                  <button
                    onClick={handleSendVerificationEmail}
                    disabled={sendingEmail}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {sendingEmail ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Send Verification Email
                  </button>
                ) : (
                  <form onSubmit={handleVerifyEmailCode} className="space-y-3">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-indigo-400 font-medium">
                      Enter the mock code 589410 below to confirm verification.
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="flex-1 px-4 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white text-center font-semibold tracking-widest placeholder-slate-600"
                        maxLength={6}
                        required
                      />
                      <button
                        type="submit"
                        disabled={verifyingEmail}
                        className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {verifyingEmail ? <Loader className="w-4 h-4 animate-spin" /> : "Verify"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Photos & Face Registration */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              3. Profile Picture
            </h3>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden relative group/avatar">
                {studentProfile?.profile_photo ? (
                  <img 
                    src={`${API_BASE_URL.replace("/api/v1", "")}${studentProfile.profile_photo}`} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-slate-400">
                  Upload a standard high-quality headshot avatar for list displays.
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                    id="profile-photo-upload"
                  />
                  <label
                    htmlFor="profile-photo-upload"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {profilePhoto ? profilePhoto.name : "Select Image"}
                  </label>
                  {profilePhoto && (
                    <button
                      onClick={handleUploadProfilePhoto}
                      disabled={uploadingProfilePhoto}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      {uploadingProfilePhoto ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Upload"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Angle Face Registration */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              4. 3-Angle AI Face Scan Model
            </h3>
            {studentProfile?.face_registered ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Faces registered successfully</p>
                  <p className="text-xs text-slate-400 mt-0.5">Your 3-angle facial verification model is now trained and live.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFaceRegisterSubmit} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload three clear headshot pictures from three distinct angles: **Front Profile**, **Left Profile**, and **Right Profile**. 
                  Our anti-spoof model will check image blurriness, face count, and aspect ratios.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Front */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Front Angle</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFrontImage(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="front-angle-upload"
                    />
                    <label
                      htmlFor="front-angle-upload"
                      className={`w-full aspect-square border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        frontImage 
                          ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-400" 
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-semibold">{frontImage ? "Selected" : "Upload"}</span>
                    </label>
                    {frontImage && (
                      <span className="text-[8px] text-slate-400 mt-1 truncate max-w-full">{frontImage.name}</span>
                    )}
                  </div>

                  {/* Left */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Left Angle</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLeftImage(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="left-angle-upload"
                    />
                    <label
                      htmlFor="left-angle-upload"
                      className={`w-full aspect-square border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        leftImage 
                          ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-400" 
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-semibold">{leftImage ? "Selected" : "Upload"}</span>
                    </label>
                    {leftImage && (
                      <span className="text-[8px] text-slate-400 mt-1 truncate max-w-full">{leftImage.name}</span>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Right Angle</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setRightImage(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="right-angle-upload"
                    />
                    <label
                      htmlFor="right-angle-upload"
                      className={`w-full aspect-square border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        rightImage 
                          ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-400" 
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-semibold">{rightImage ? "Selected" : "Upload"}</span>
                    </label>
                    {rightImage && (
                      <span className="text-[8px] text-slate-400 mt-1 truncate max-w-full">{rightImage.name}</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={registeringFaces}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/35"
                >
                  {registeringFaces ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Training facial recognition models...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Train AI Models</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileHub;

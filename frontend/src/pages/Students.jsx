import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Plus, 
  Trash2, 
  Upload, 
  Cpu, 
  AlertCircle, 
  Loader, 
  CheckCircle2, 
  XCircle,
  UserPlus,
  Users
} from "lucide-react";

export const Students = () => {
  const { token } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Registration Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [mobile, setMobile] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // File Upload State
  const [uploadingId, setUploadingId] = useState(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load students list.");
      }
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          name,
          department,
          year,
          mobile
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create student.");
      }

      setSuccessMsg("Student created successfully! You can now upload face photos.");
      setShowAddModal(false);
      
      // Clear form
      setStudentId("");
      setName("");
      setDepartment("");
      setYear("");
      setMobile("");
      
      // Reload
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student and their face dataset?")) return;
    setError("");
    setSuccessMsg("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete student.");
      }

      setSuccessMsg("Student deleted successfully.");
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (studentId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingId(studentId);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}/upload-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to upload photo.");
      }

      setSuccessMsg("Photo uploaded successfully! Train the model to update predictions.");
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const handleTrainModel = async () => {
    setTrainingLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/students/train-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("AI training failed.");
      }

      const data = await response.json();
      setSuccessMsg(data.detail || "AI Model trained successfully!");
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrainingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Student Management</h1>
          <p className="text-slate-400 text-sm">Register new profiles, manage face datasets, and train the AI recognizer</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleTrainModel}
            disabled={trainingLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/25 transition-all"
          >
            {trainingLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Training AI...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Train AI Model</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold rounded-lg border border-slate-700 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center space-x-2 bg-red-950/30 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Student List Card */}
      <div className="glass-panel p-5">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-slate-500 text-xs">Fetching students database...</p>
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Student ID</th>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Dept & Year</th>
                  <th className="py-3 px-4 font-semibold">Mobile</th>
                  <th className="py-3 px-4 font-semibold">Dataset Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {students.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{row.student_id}</td>
                    <td className="py-3.5 px-4 text-white font-medium">{row.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {row.department} — {row.year} Year
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{row.mobile || "N/A"}</td>
                    <td className="py-3.5 px-4">
                      {row.face_registered ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Photos Loaded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 border border-red-500/20 text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>No Faces</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Image Upload Input */}
                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 transition">
                          {uploadingId === row.student_id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(row.student_id, e)}
                            className="hidden"
                            disabled={uploadingId !== null}
                          />
                        </label>
                        
                        <button
                          onClick={() => handleDeleteStudent(row.student_id)}
                          className="bg-red-950/20 hover:bg-red-900/30 text-red-400 p-2 rounded-lg border border-red-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-slate-700 mb-3" />
            <h5 className="font-semibold text-slate-300 text-sm">No students registered yet</h5>
            <p className="text-slate-500 text-xs max-w-sm mt-1">Register students, upload face images, and start marking automatic attendance.</p>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 border border-slate-800 relative">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>Register New Student</span>
            </h3>
            
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Student ID</label>
                <input
                  type="text"
                  placeholder="e.g. S1001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full glass-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alice Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full glass-input text-xs"
                    required
                  >
                    <option value="" disabled>Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1234567890"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
                >
                  {formLoading ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Register Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Students;

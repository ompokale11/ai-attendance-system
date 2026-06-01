import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Users, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Loader, 
  Filter 
} from "lucide-react";

export const PreRecords = () => {
  const { token } = useAuth();
  const [preRecords, setPreRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states for manual record
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [division, setDivision] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Excel import state
  const [excelFile, setExcelFile] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPreRecords();
  }, []);

  const fetchPreRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/pre-records`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPreRecords(data);
      } else {
        throw new Error("Failed to load student registry.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !name || !course || !year || !division || !rollNumber) {
      setError("Please fill in all fields");
      return;
    }
    setSubmittingManual(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`${API_BASE_URL}/students/pre-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          name,
          course,
          year,
          division,
          roll_number: rollNumber,
        }),
      });
      if (response.ok) {
        setSuccessMsg(`Student ${name} pre-registered successfully!`);
        // Reset form
        setStudentId("");
        setName("");
        setCourse("");
        setYear("");
        setDivision("");
        setRollNumber("");
        fetchPreRecords();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create pre-record");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) return;
    setImportingExcel(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      const response = await fetch(`${API_BASE_URL}/students/import-excel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        setSuccessMsg(`Excel import complete: Imported ${result.imported} students, skipped ${result.skipped} duplicates.`);
        setExcelFile(null);
        fetchPreRecords();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Excel import failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImportingExcel(false);
    }
  };

  const filteredRecords = preRecords.filter((rec) => {
    const query = searchQuery.toLowerCase();
    return (
      rec.name.toLowerCase().includes(query) ||
      rec.student_id.toLowerCase().includes(query) ||
      rec.course.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400" />
          Student Registry Management
        </h1>
        <p className="text-slate-400 text-sm">
          Pre-register students manually or bulk upload them via Excel spreadsheets to validate logins.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Manual Pre-Record Form */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Student Manually
          </h2>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Student ID / Roll (Unique)</label>
              <input
                type="text"
                placeholder="e.g. STU1001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Course / Department</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                required
              >
                <option value="">Select Year</option>
                <option value="FY">FY (First Year)</option>
                <option value="SY">SY (Second Year)</option>
                <option value="TY">TY (Third Year)</option>
                <option value="BE">BE (Final Year)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Division</label>
              <input
                type="text"
                placeholder="e.g. A"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Roll Number</label>
              <input
                type="text"
                placeholder="e.g. 42"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submittingManual}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {submittingManual ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Student Pre-Record
              </button>
            </div>
          </form>
        </div>

        {/* Excel File Import */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Import via Excel / CSV
          </h2>
          <form onSubmit={handleExcelUpload} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Spreadsheet columns must be named: 
              <br />
              <code className="text-indigo-400 font-semibold font-mono text-[10px]">student_id, name, course, year, division, roll_number</code>
            </p>
            
            <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-slate-700 transition-all flex flex-col items-center justify-center bg-slate-950/20">
              <Upload className="w-8 h-8 text-slate-600 mb-2" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
                className="hidden"
                id="excel-file-selector"
              />
              <label
                htmlFor="excel-file-selector"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Select Spreadsheet
              </label>
              {excelFile && (
                <span className="text-[10px] text-slate-400 mt-2 truncate max-w-full block">
                  {excelFile.name}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={importingExcel || !excelFile}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {importingExcel ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import Students
            </button>
          </form>
        </div>

      </div>

      {/* Pre-Records List Table */}
      <div className="glass-panel p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Registered Pre-Records Directory ({filteredRecords.length})
          </h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by ID, name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-500 mt-2">Reading registry records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-semibold text-xs">Student ID</th>
                  <th className="py-3 px-4 font-semibold text-xs">Name</th>
                  <th className="py-3 px-4 font-semibold text-xs">Course</th>
                  <th className="py-3 px-4 font-semibold text-xs">Year</th>
                  <th className="py-3 px-4 font-semibold text-xs">Div</th>
                  <th className="py-3 px-4 font-semibold text-xs">Roll No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-400">{row.student_id}</td>
                      <td className="py-3 px-4 text-white font-medium">{row.name}</td>
                      <td className="py-3 px-4 text-slate-300">{row.course}</td>
                      <td className="py-3 px-4 text-slate-300">{row.year}</td>
                      <td className="py-3 px-4 text-slate-300">{row.division}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{row.roll_number}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                      No matching student pre-records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default PreRecords;

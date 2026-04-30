import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { usePopup } from "../../context/PopupContext";
import { db, storage } from "../../lib/firebase";
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, where, getDocs, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Shield, Search, Plus, Briefcase, Mail, Phone, Eye, Printer, Edit2, Trash2, Users, UserCheck, X, Camera, Calendar, Loader2, Save, Clock, User } from "lucide-react";

const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", required = false, autoComplete = "off" }) => (
  <div className="space-y-2 group">
    <label className="text-sm font-medium tracking-wide text-white/70 group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
      {Icon && <Icon size={14} className="text-[#D0B079]" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#D0B079]/20 focus:border-[#D0B079]/40 transition-all text-base"
      />
    </div>
  </div>
);

export default function StaffManagement() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceFilters, setAttendanceFilters] = useState({ from: "", to: "" });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Filter by created_by so each manager only sees their own staff.
    // Sorting done client-side to avoid needing a composite Firestore index.
    const q = user.uid
      ? query(collection(db, "staff"), where("created_by", "==", user.uid))
      : query(collection(db, "staff"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      setStaff(staffList);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        full_name: item.full_name || "",
        email: item.email || "",
        password: "",
        phone_number: item.phone_number || "",
        designation: item.designation || "",
        gender: item.gender || "Male",
        dob: item.dob || "",
      });
      setImagePreview(item.profile_image || null);
    } else {
      setEditingId(null);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        phone_number: "",
        designation: "",
        gender: "Male",
        dob: "",
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const restaurantId = user.uid || "";
      const isSuperAdmin = Number(user.role_id) === 6;

      if (restaurantId && !isSuperAdmin) {

        const restDoc = await getDoc(doc(db, "restaurants", restaurantId));
        if (restDoc.exists()) {
          const restData = restDoc.data();
          if (!restData.restaurant_name || restData.restaurant_name.trim() === "") {
            showPopup({
              title: "Profile Incomplete",
              message: "Please fill in your Restaurant Name in the Restaurant Profile before adding staff.",
              type: "error"
            });
            return;
          }
        } else {
          showPopup({
            title: "Profile Incomplete",
            message: "Please setup your Restaurant Profile before adding staff.",
            type: "error"
          });
          return;
        }
      }

      setSaving(true);

      const updates = {
        ...formData,
        restaurant_id: String(user.restaurant_id || ""),
        updated_at: new Date()
      };

      if (!updates.password) delete updates.password;

      if (imageFile) {
        const imageRef = ref(storage, `profiles/${editingId || 'new'}_${Date.now()}`);
        await uploadBytes(imageRef, imageFile);
        updates.profile_image = await getDownloadURL(imageRef);
      }

      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), updates);
      } else {
        updates.created_at = new Date();
        updates.is_active = true;
        updates.created_by = user.uid || "";
        await addDoc(collection(db, "staff"), updates);
      }


      showPopup({
        title: "Success",
        message: editingId ? "Account updated successfully" : "Staff account created",
        type: "success"
      });
      setShowModal(false);
    } catch (err) {
      console.error(err);
      showPopup({
        title: "Error",
        message: "Operation failed",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    showPopup({
      title: "Remove account?",
      message: "This action will permanently delete the staff member's access.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "staff", id));
          showPopup({ title: "Removed", message: "Account deleted", type: "success" });
        } catch (err) {
          console.error(err);
          showPopup({ title: "Error", message: "Failed to delete", type: "error" });
        }
      }
    });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "staff", id), { is_active: !currentStatus });
      showPopup({ title: "Updated", message: `Account ${currentStatus ? 'deactivated' : 'activated'}`, type: "success" });
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to update status", type: "error" });
    }
  };

  const handleViewAttendance = async (id, filters = null) => {
    try {
      setLoadingAttendance(true);
      setShowAttendanceModal(true);

      const params = filters || attendanceFilters;
      let q = query(collection(db, "attendance"), where("staff_id", "==", id), orderBy("clock_in", "desc"));

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        clock_in: doc.data().clock_in?.toDate ? doc.data().clock_in.toDate() : doc.data().clock_in,
        clock_out: doc.data().clock_out?.toDate ? doc.data().clock_out.toDate() : doc.data().clock_out,
      }));

      const staffMember = staff.find(s => s.id === id);
      setAttendanceData({
        staff: staffMember,
        records: records,
        from: params.from || "",
        to: params.to || ""
      });
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to fetch attendance", type: "error" });
    } finally {
      setLoadingAttendance(false);
    }
  };

  const groupedRecords = useMemo(() => {
    if (!attendanceData || !Array.isArray(attendanceData.records)) return [];

    const groups = {};
    attendanceData.records.forEach(record => {
      if (!record || !record.date) return;

      // Use the date part only for grouping
      const dateKey = (record.date instanceof Date ? record.date.toISOString() : String(record.date)).split('T')[0];

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: record.date,
          first_in: record.clock_in,
          last_out: record.clock_out,
          total_minutes: 0,
          sessions: []
        };
      }

      const g = groups[dateKey];

      // Update first in for the day summary
      if (record.clock_in) {
        if (!g.first_in || new Date(record.clock_in) < new Date(g.first_in)) {
          g.first_in = record.clock_in;
        }
      }
      // Update last out for the day summary
      if (record.clock_out) {
        if (!g.last_out || new Date(record.clock_out) > new Date(g.last_out)) {
          g.last_out = record.clock_out;
        }
      }

      g.total_minutes += (record.total_minutes || 0);
      g.sessions.push(record);
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceData?.records]);

  const toLocalISO = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleUpdateAttendanceRecord = async (e) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setUpdatingAttendance(true);
    try {
      await updateDoc(doc(db, "attendance", editingAttendance.id), {
        clock_in: new Date(editingAttendance.clock_in),
        clock_out: new Date(editingAttendance.clock_out)
      });
      showPopup({ title: "Success", message: "Attendance updated", type: "success" });
      setEditingAttendance(null);
      handleViewAttendance(attendanceData.staff.id);
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to update attendance", type: "error" });
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const handleOpenReport = async (staffId) => {
    try {
      setLoading(true);
      const staffMember = staff.find(s => s.id === staffId);
      if (!staffMember) throw new Error("Staff member not found");

      let q = query(
        collection(db, "attendance"),
        where("staff_id", "==", staffId),
        orderBy("clock_in", "desc")
      );

      // Apply date filters if available
      if (attendanceFilters.from) {
        const fromDate = new Date(attendanceFilters.from);
        fromDate.setHours(0, 0, 0, 0);
        q = query(q, where("clock_in", ">=", fromDate));
      }
      if (attendanceFilters.to) {
        const toDate = new Date(attendanceFilters.to);
        toDate.setHours(23, 59, 59, 999);
        q = query(q, where("clock_in", "<=", toDate));
      }

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        clock_in: doc.data().clock_in?.toDate ? doc.data().clock_in.toDate() : doc.data().clock_in,
        clock_out: doc.data().clock_out?.toDate ? doc.data().clock_out.toDate() : doc.data().clock_out,
      }));

      setAttendanceData({ staff: staffMember, records: records });
      setShowReportModal(true);
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to load report from Firestore", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatWorkTime = (minutes) => {
    if (!minutes || isNaN(minutes)) return "0h 0m";
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${minutes < 0 ? "-" : ""}${h}h ${m}m`;
  };

  const filteredStaff = staff.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.designation?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "all" || 
      (filterStatus === "active" && s.is_active) || 
      (filterStatus === "inactive" && !s.is_active);

    return matchSearch && matchStatus;
  });


  return (
    <div className="min-h-screen flex flex-col bg-[#071428] font-sans selection:bg-[#D0B079]/30 text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 pt-28 pb-20 px-6 sm:px-10">
          <div className="max-w-6xl mx-auto">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-6"
              >
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-4 whitespace-nowrap">
                  Staff management
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/40 tracking-wider">
                    {staff.length} Members
                  </span>
                </h1>
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-64">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D0B079] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search directory..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-semibold placeholder-white/20 focus:outline-none focus:border-[#D0B079]/50 transition-all text-xs"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-auto px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/70 font-semibold focus:outline-none focus:border-[#D0B079]/50 transition-all text-xs cursor-pointer [&>option]:bg-[#071428]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenModal()}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#D0B079] hover:bg-[#b8965f] text-slate-900 font-bold rounded-2xl shadow-xl shadow-[#D0B079]/10 transition-all flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                >
                  <Plus size={16} />
                  Register staff
                </motion.button>
              </div>
            </div>


            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
                  ))
                ) : filteredStaff.length > 0 ? (
                  filteredStaff.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative bg-white/[0.02] border border-white/[0.08] hover:border-[#D0B079]/30 hover:bg-white/[0.04] p-4 rounded-3xl transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          {item.profile_image ? (
                            <img
                              src={item.profile_image}
                              alt={item.full_name}
                              className="w-16 h-16 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D0B079] to-[#b8965f] flex items-center justify-center font-bold text-slate-900 text-xl shadow-lg">
                              {item.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold text-white truncate group-hover:text-[#D0B079] transition-colors">{item.full_name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 text-[#D0B079] font-bold text-[10px] tracking-wide bg-[#D0B079]/10 px-2 py-0.5 rounded-lg border border-[#D0B079]/20">
                              <Briefcase size={10} />
                              {item.designation || "Staff member"}
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${item.is_active !== 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                              {item.is_active !== 0 ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        <div className="hidden lg:flex flex-col gap-1 flex-1 min-w-0 px-4 border-l border-white/5">
                          <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Mail size={12} className="shrink-0" />
                            <span className="truncate">{item.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Phone size={12} className="shrink-0" />
                            <span className="truncate">{item.phone_number || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleStatus(item.id, item.is_active)}
                          className={`relative inline-flex h-9 w-14 items-center rounded-xl transition-colors focus:outline-none ${item.is_active ? 'bg-green-500/20' : 'bg-white/5'} hover:bg-white/10`}
                          title={item.is_active ? "Deactivate user" : "Activate user"}
                        >
                          <span className={`inline-block h-6 w-6 transform rounded-lg transition-transform ${item.is_active ? 'translate-x-7 bg-green-500' : 'translate-x-1 bg-white/30'}`} />
                        </button>

                        <div className="h-8 w-px bg-white/5 mx-2 hidden md:block" />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewAttendance(item.id)}
                            className="p-2.5 bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-400 rounded-xl border border-white/5 transition-all"
                            title="View attendance"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenReport(item.id)}
                            className="p-2.5 bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 rounded-xl border border-white/5 transition-all"
                            title="Generate report"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-2.5 bg-white/5 hover:bg-[#D0B079]/20 text-white/40 hover:text-[#D0B079] rounded-xl border border-white/5 transition-all"
                            title="Edit profile"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded-xl border border-white/5 transition-all"
                            title="Delete account"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-32 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
                    <div className="p-8 bg-white/5 rounded-full mb-8 text-white/10">
                      <Users size={64} strokeWidth={1} />
                    </div>
                    <h3 className="text-2xl font-semibold text-white/30 tracking-tight">Empty directory</h3>
                    <p className="text-white/10 font-medium mt-2">Start registering your team members today.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-4xl bg-[#0b1a3d] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-white/5 px-10 py-10 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[#D0B079] font-bold tracking-wider mb-2">
                    <UserCheck size={14} />
                    <span className="text-[10px] font-semibold tracking-widest">Onboarding process</span>
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-4">
                    {editingId ? "Update staff profile" : "Register new account"}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-4 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-500 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-12 overflow-y-auto max-h-[70vh] custom-scrollbar" autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                  <div className="lg:col-span-4 flex flex-col items-center">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="h-52 w-52 rounded-[3rem] overflow-hidden border-2 border-dashed border-white/20 group-hover:border-[#D0B079] transition-all duration-500 bg-white/[0.02] flex items-center justify-center">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="flex flex-col items-center text-white/10 group-hover:text-[#D0B079] transition-colors">
                            <Camera size={56} strokeWidth={1} />
                            <span className="text-[10px] font-semibold tracking-[0.2em] mt-6">Upload image</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#D0B079] text-slate-900 rounded-xl font-semibold text-[10px] tracking-widest shadow-2xl transition-all group-hover:scale-105 active:scale-95 group-hover:bg-[#b8965f]">
                        Select photo
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>

                    <div className="mt-16 w-full space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest ml-1">Gender identity</label>
                        <div className="grid grid-cols-2 gap-4">
                          {['Male', 'Female'].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setFormData(p => ({ ...p, gender: g }))}
                              className={`py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest transition-all border ${formData.gender === g
                                  ? 'bg-[#D0B079] text-slate-900 border-[#D0B079] shadow-xl shadow-[#D0B079]/20'
                                  : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'
                                }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField
                        label="Full name"
                        icon={User}
                        value={formData.full_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const capitalized = val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : val;
                          setFormData(p => ({ ...p, full_name: capitalized }));
                        }}
                        placeholder="e.g. Johnathan Doe"
                        required
                      />
                      <InputField
                        label="Designation"
                        icon={Briefcase}
                        value={formData.designation}
                        onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
                        placeholder="e.g. Head Chef"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField
                        label="Email ID"
                        icon={Mail}
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="staff@watanstaff.com"
                        type="email"
                        required
                      />
                      <InputField
                        label="Phone number"
                        icon={Phone}
                        value={formData.phone_number}
                        onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                        placeholder="+44 7700 900000"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField
                        label="Password"
                        icon={Shield}
                        value={formData.password}
                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                        placeholder={editingId ? "Leave empty to keep current" : "Minimum 8 characters"}
                        type="password"
                        required={!editingId}
                        autoComplete="new-password"
                      />
                      <InputField
                        label="Date of birth"
                        icon={Calendar}
                        value={formData.dob}
                        onChange={(e) => setFormData(p => ({ ...p, dob: e.target.value }))}
                        type="date"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-6 border-t border-white/5 pt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-semibold text-xs rounded-[1.5rem] transition-all"
                  >
                    Discard changes
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-12 py-5 bg-[#D0B079] hover:bg-[#b8965f] text-slate-900 font-semibold text-xs rounded-[1.5rem] shadow-2xl shadow-[#D0B079]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttendanceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttendanceModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-5xl bg-[#0b1a3d] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-white/5 px-10 py-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[#D0B079] font-bold tracking-wider mb-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-semibold tracking-widest">Time tracking log</span>
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight">
                    {attendanceData?.staff?.full_name}'s attendance
                  </h2>
                </div>
                <button onClick={() => setShowAttendanceModal(false)} className="p-4 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-500 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="flex flex-col md:flex-row items-end gap-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-semibold text-white/30 tracking-widest ml-1">From date</label>
                    <input
                      type="date"
                      value={attendanceFilters.from}
                      onChange={(e) => setAttendanceFilters(p => ({ ...p, from: e.target.value }))}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-semibold text-white/30 tracking-widest ml-1">To date</label>
                    <input
                      type="date"
                      value={attendanceFilters.to}
                      onChange={(e) => setAttendanceFilters(p => ({ ...p, to: e.target.value }))}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleViewAttendance(attendanceData?.staff?.id)}
                    className="px-8 py-3 bg-[#D0B079] text-slate-900 font-semibold rounded-xl text-xs tracking-widest hover:bg-[#b8965f] transition-all"
                  >
                    Apply filter
                  </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40">Date</th>
                        <th className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40">Clock in</th>
                        <th className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40">Clock out</th>
                        <th className="px-6 py-4 text-[10px] font-semibold tracking-widest text-white/40 text-right">Work hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingAttendance ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-20 text-center">
                            <Loader2 className="animate-spin inline-block text-[#D0B079] mb-4" size={40} />
                            <p className="text-white/20 font-bold tracking-widest text-xs">Fetching records...</p>
                          </td>
                        </tr>
                      ) : groupedRecords.length > 0 ? (
                        groupedRecords.map((group) => (
                          <React.Fragment key={group.date}>
                            {group.sessions.map((session, sIdx) => (
                              <tr key={session.id} className="hover:bg-white/[0.02] transition-colors group">
                                {sIdx === 0 && (
                                  <td className="px-6 py-4 border-b border-white/5" rowSpan={group.sessions.length}>
                                    <div className="text-white font-bold">{new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                    {group.sessions.length > 1 && (
                                      <div className="mt-1 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D0B079]/30" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{group.sessions.length} sessions recorded</span>
                                      </div>
                                    )}
                                  </td>
                                )}
                                <td className="px-6 py-4 border-b border-white/5">
                                  {editingAttendance?.id === session.id ? (
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase text-white/40 font-bold">Clock In</label>
                                      <input
                                        type="datetime-local"
                                        value={editingAttendance.clock_in}
                                        onChange={(e) => setEditingAttendance(p => ({ ...p, clock_in: e.target.value }))}
                                        className="w-full bg-white/5 border border-[#D0B079]/30 rounded-lg px-2 py-1.5 text-xs text-[#D0B079] focus:outline-none focus:border-[#D0B079]"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      <span className="text-green-400 font-mono text-sm">
                                        {session.clock_in ? new Date(session.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 border-b border-white/5">
                                  {editingAttendance?.id === session.id ? (
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase text-white/40 font-bold">Clock Out</label>
                                      <input
                                        type="datetime-local"
                                        value={editingAttendance.clock_out}
                                        onChange={(e) => setEditingAttendance(p => ({ ...p, clock_out: e.target.value }))}
                                        className="w-full bg-white/5 border border-[#D0B079]/30 rounded-lg px-2 py-1.5 text-xs text-[#D0B079] focus:outline-none focus:border-[#D0B079]"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      <span className="text-rose-400 font-mono text-sm">
                                        {session.clock_out ? new Date(session.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right border-b border-white/5">
                                  <div className="flex items-center justify-end gap-4">
                                    {editingAttendance?.id === session.id ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={handleUpdateAttendanceRecord}
                                          disabled={updatingAttendance}
                                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                                          title="Save changes"
                                        >
                                          {updatingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        </button>
                                        <button
                                          onClick={() => setEditingAttendance(null)}
                                          className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all"
                                          title="Cancel"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-[#D0B079] font-black text-sm">{formatWorkTime(session.total_minutes)}</div>
                                        <button
                                          onClick={() => {
                                            setEditingAttendance({
                                              id: session.id,
                                              clock_in: toLocalISO(session.clock_in),
                                              clock_out: toLocalISO(session.clock_out)
                                            });
                                          }}
                                          className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-[#D0B079]/20 hover:text-[#D0B079] opacity-40 group-hover:opacity-100 transition-all"
                                          title="Edit this session"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-20 text-center text-white/20 font-bold tracking-widest text-xs">
                            No attendance records found for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {attendanceData?.records?.length > 0 && (
                      <tfoot>
                        <tr className="bg-white/5 font-black">
                          <td colSpan="3" className="px-6 py-6 text-right text-white/40 tracking-widest text-[10px]">Total hours worked</td>
                          <td className="px-6 py-6 text-right text-2xl text-[#D0B079]">
                            {formatWorkTime(attendanceData.records.reduce((sum, r) => sum + (r.total_minutes || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl no-print" />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }} className="relative w-full max-w-5xl bg-[#0b1a3d] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              <div className="bg-white/5 px-10 py-6 border-b border-white/10 flex items-center justify-between no-print">
                <div>
                  <h2 className="text-2xl font-semibold">Report preview</h2>
                  <p className="text-white/40 text-xs mt-1">Ready for printing or PDF export</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="px-6 py-3 bg-[#D0B079] text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-[#b8965f] transition-all"
                  >
                    <Printer size={14} /> Print / Save as PDF
                  </button>
                  <button onClick={() => setShowReportModal(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar">
                <div id="report-content" style={{ backgroundColor: '#ffffff', color: '#0f172a' }} className="p-12 rounded-lg">
                  {/* Report Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8" style={{ borderBottomColor: '#e2e8f0' }}>
                    <div>
                      <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ color: '#0f172a' }}>Attendance Report</h1>
                      <p className="text-sm font-bold mt-1" style={{ color: '#64748b' }}>Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{ color: '#1e293b' }}>Watan Group</div>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{attendanceData?.staff?.restaurant_name || "Restaurant Staff"}</p>
                    </div>
                  </div>

                  {/* Staff Info */}
                  <div className="mb-10">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Staff details</p>
                    <h3 className="text-xl font-bold" style={{ color: '#1e293b' }}>{attendanceData?.staff?.full_name}</h3>
                    <p className="text-sm font-semibold" style={{ color: '#64748b' }}>
                      ID: {attendanceData?.staff?.employee_id || "N/A"} • {attendanceData?.staff?.designation || "Staff"}
                    </p>
                    <p className="text-sm font-bold mt-3" style={{ color: '#D0B079' }}>
                      Period: {attendanceFilters.from || "Start"} — {attendanceFilters.to || "End"}
                    </p>
                  </div>

                  {/* Table */}
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-y-2 border-slate-900 bg-slate-50/50" style={{ borderTopColor: '#0f172a', borderBottomColor: '#0f172a', backgroundColor: '#f8fafc' }}>
                        <th className="px-4 py-4 text-left font-black uppercase tracking-widest text-[10px]">Date</th>
                        <th className="px-4 py-4 text-left font-black uppercase tracking-widest text-[10px]">Clock in</th>
                        <th className="px-4 py-4 text-left font-black uppercase tracking-widest text-[10px]">Clock out</th>
                        <th className="px-4 py-4 text-right font-black uppercase tracking-widest text-[10px]">Total hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100" style={{ borderColor: '#f1f5f9' }}>
                      {groupedRecords.length > 0 ? (
                        groupedRecords.map((group, i) => (
                          <tr key={i}>
                            <td className="px-4 py-4 font-bold" style={{ color: '#334155' }}>
                              {new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-4 font-mono font-bold" style={{ color: '#475569' }}>
                              {group.first_in ? new Date(group.first_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                            </td>
                            <td className="px-4 py-4 font-mono font-bold" style={{ color: '#475569' }}>
                              {group.last_out ? new Date(group.last_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                            </td>
                            <td className="px-4 py-4 text-right font-mono font-black" style={{ color: '#0f172a' }}>
                              {formatWorkTime(group.total_minutes)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-20 text-center font-bold italic" style={{ color: '#94a3b8' }}>No attendance records found for this period</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-slate-50/30" style={{ borderTopColor: '#0f172a', backgroundColor: '#f8fafc' }}>
                        <td colSpan="3" className="px-4 py-6 text-right font-black uppercase tracking-widest text-xs" style={{ color: '#94a3b8' }}>Grand Total</td>
                        <td className="px-4 py-6 text-right font-black text-2xl" style={{ color: '#0f172a' }}>
                          {formatWorkTime(Array.isArray(attendanceData?.records) ? attendanceData.records.reduce((sum, r) => sum + (r.total_minutes || 0), 0) : 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Footer */}
                  <div className="mt-12 pt-8 border-t border-slate-100 text-center italic text-[10px]" style={{ borderTopColor: '#f1f5f9', color: '#94a3b8' }}>
                    <p>© Watan Staff Management System • Report Generated on {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { 
            visibility: visible !important; 
            opacity: 1 !important;
          }
          #report-content {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            z-index: 9999999;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2, Save, Loader2, User, Camera, Briefcase, Shield, Calendar, Eye, Clock, XCircle,
  Users, Search, X, Building2, Phone, Mail, ShieldCheck, ShieldOff, ChevronRight, Printer, FileText, Download, Bell
} from "lucide-react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import { db, storage, secondaryAuth } from "../../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, where, getDocs, orderBy, setDoc, deleteDoc, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { usePopup } from "../../context/PopupContext.jsx";
import Footer from "../../components/common/footer.jsx";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}
function Avatar({ src, name, size = "md" }) {
  const [imgUrl, setImgUrl] = useState(null);
  const cls = size === "lg"
    ? "w-20 h-20 rounded-[2rem] text-xl"
    : "w-11 h-11 rounded-xl text-sm";

  useEffect(() => {
    if (src && (src.startsWith('http') || src.startsWith('blob:'))) {
      setImgUrl(src);
    } else if (src) {
      // If it's a Firebase storage path or just a filename
      const imageRef = ref(storage, `profiles/${src}`);
      getDownloadURL(imageRef).then(url => setImgUrl(url)).catch(() => setImgUrl(null));
    }
  }, [src]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={name}
        className={`${cls} object-cover border border-white/10`}
      />
    );
  }
  return (
    <div
      className={`${cls} flex items-center justify-center font-bold text-white border border-white/10`}
      style={{ background: "linear-gradient(135deg, #D0B079, #b8965f)" }}
    >
      {getInitials(name)}
    </div>
  );
}

const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", required = false, autoComplete = "off" }) => (
  <div className="space-y-2 group">
    <label className="text-sm font-medium tracking-wide text-white/70 group-focus-within:text-[#D0B079] transition-colors flex items-center gap-2">
      {Icon && <Icon size={14} className="text-[#D0B079]" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#D0B079]/20 focus:border-[#D0B079]/40 transition-all text-base"
    />
  </div>
);

export default function AllStaffPage() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [restaurantsMap, setRestaurantsMap] = useState({});

  // Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: "", email: "", password: "", phone_number: "",
    designation: "", gender: "Male", dob: "",
  });

  // Attendance state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceFilters, setAttendanceFilters] = useState({ from: "", to: "" });
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  
  // Notification state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ title: "", body: "" });

  useEffect(() => {
    setLoading(true);

    const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const rMap = {};
      snapshot.forEach(doc => {
        rMap[doc.id] = doc.data().restaurant_name || "Unknown Restaurant";
      });
      setRestaurantsMap(rMap);
    }, (err) => {
      console.error("Failed to load restaurants:", err);
    });

    const q = query(collection(db, "staff"), orderBy("full_name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaff(staffList);
      setLoading(false);

      // --- GLOBAL AUTO-REPAIR ---
      const brokenStaff = staffList.filter(s => !s.restaurant_id && s.created_by);
      if (brokenStaff.length > 0) {
        brokenStaff.forEach(async (s) => {
          try {
            await updateDoc(doc(db, "staff", s.id), {
              restaurant_id: String(s.created_by),
              updated_at: new Date()
            });
          } catch (e) {
            console.error("Global auto-repair failed:", e);
          }
        });
      }
    }, (err) => {
      console.error(err);
      setError("Failed to load staff.");
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubRestaurants();
    };
  }, []);

  const handleOpenModal = (item) => {
    setEditingId(item.id);
    setFormData({
      full_name: item.full_name || "",
      email: item.email || "",
      password: "",
      phone_number: item.phone_number || "",
      designation: item.designation || "",
      gender: item.gender || "Male",
      dob: item.dob || "",
      restaurant_id: item.restaurant_id || ""
    });
    setImagePreview(null); // Will be handled by Avatar or similar logic if needed
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


  const handleViewAttendance = async (id, params = {}) => {
    setLoadingAttendance(true);
    setShowAttendanceModal(true);
    try {
      // Index-free query (only one where)
      let q = query(collection(db, "attendance"), where("staff_id", "==", id));
      
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert all potential timestamps to JS Dates
          clock_in: data.clock_in?.toDate ? data.clock_in.toDate() : data.clock_in,
          clock_out: data.clock_out?.toDate ? data.clock_out.toDate() : data.clock_out,
          date: data.date?.toDate ? data.date.toDate() : data.date,
        };
      });

      // Sort in JavaScript to avoid index requirement
      records.sort((a, b) => {
        const dateA = a.clock_in instanceof Date ? a.clock_in : new Date(a.clock_in || 0);
        const dateB = b.clock_in instanceof Date ? b.clock_in : new Date(b.clock_in || 0);
        return dateB - dateA;
      });

      const staffMember = staff.find(s => s.id === id);
      setAttendanceData({ 
        staff: staffMember, 
        records: records,
        from: params.from || "",
        to: params.to || ""
      });

    } catch (err) {
      console.error("Attendance Fetch Error:", err);
      showPopup({ 
        title: "Error", 
        message: `Failed to fetch attendance: ${err.message || "Unknown error"}`, 
        type: "error" 
      });
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
      const cin = new Date(editingAttendance.clock_in);
      const cout = new Date(editingAttendance.clock_out);
      const totalMinutes = Math.floor((cout - cin) / 60000);

      await updateDoc(doc(db, "attendance", editingAttendance.id), {
        clock_in: cin,
        clock_out: cout,
        total_minutes: Math.max(0, totalMinutes)
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

  const formatWorkTime = (minutes) => {
    if (!minutes || isNaN(minutes)) return "0h 0m";
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${minutes < 0 ? "-" : ""}${h}h ${m}m`;
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "staff", id), { is_active: !currentStatus });
      showPopup({ title: "Updated", message: `Account ${currentStatus ? "deactivated" : "activated"}`, type: "success" });
    } catch {
      showPopup({ title: "Error", message: "Failed to update status", type: "error" });
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationData.title || !notificationData.body) {
      showPopup({ title: "Required", message: "Please enter both title and message", type: "warning" });
      return;
    }
    setSendingNotification(true);
    try {
      await addDoc(collection(db, "notifications"), {
        title: notificationData.title,
        body: notificationData.body,
        staff_id: notificationTarget.id,
        staff_name: notificationTarget.name,
        sent_at: serverTimestamp(),
        status: "pending",
        type: "direct_message",
        fcm_token: notificationTarget.fcmToken || null,
        platform: notificationTarget.platform || "unknown"
      });
      showPopup({ title: "Sent", message: "Notification sent successfully", type: "success" });
      setShowNotificationModal(false);
      setNotificationData({ title: "", body: "" });
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to send notification", type: "error" });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleOpenReport = async (staffId) => {
    try {
      setLoading(true);
      const staffMember = staff.find(sm => sm.id === staffId);
      if (!staffMember) throw new Error("Staff member not found");

      // Index-free query
      let q = query(collection(db, "attendance"), where("staff_id", "==", staffId));

      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          clock_in: data.clock_in?.toDate ? data.clock_in.toDate() : data.clock_in,
          clock_out: data.clock_out?.toDate ? data.clock_out.toDate() : data.clock_out,
          date: data.date?.toDate ? data.date.toDate() : data.date,
        };
      });

      // Filter and Sort in JS
      if (attendanceFilters.from) {
        const fromDate = new Date(attendanceFilters.from);
        records = records.filter(r => new Date(r.clock_in) >= fromDate);
      }
      if (attendanceFilters.to) {
        const toDate = new Date(attendanceFilters.to);
        toDate.setHours(23, 59, 59, 999);
        records = records.filter(r => new Date(r.clock_in) <= toDate);
      }

      records.sort((a, b) => {
        const dateA = a.clock_in instanceof Date ? a.clock_in : new Date(a.clock_in || 0);
        const dateB = b.clock_in instanceof Date ? b.clock_in : new Date(b.clock_in || 0);
        return dateB - dateA;
      });

      setAttendanceData({ staff: staffMember, records: records });
      setShowReportModal(true);
    } catch (err) {
      console.error("Report Fetch Error:", err);
      showPopup({ 
        title: "Error", 
        message: `Failed to load report: ${err.message || "Unknown error"}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }

  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      showPopup({ title: "Required", message: "Name and Email are mandatory", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      let photoUrl = imagePreview;

      if (imageFile) {
        const fileRef = ref(storage, `profiles/${editingId || Date.now()}`);
        await uploadBytes(fileRef, imageFile);
        photoUrl = await getDownloadURL(fileRef);
      }

      const staffData = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number || "",
        designation: formData.designation || "",
        gender: formData.gender || "Male",
        dob: formData.dob || "",
        restaurant_id: formData.restaurant_id || "",
        profile_image: photoUrl || "",
        updated_at: serverTimestamp()
      };

      if (formData.password) {
        staffData.password = formData.password;
      }

      await updateDoc(doc(db, "staff", editingId), staffData);
      
      showPopup({ title: "Success", message: "Staff profile updated successfully", type: "success" });
      setShowModal(false);
    } catch (err) {
      console.error("Save Error:", err);
      showPopup({ title: "Error", message: "Failed to save changes", type: "error" });
    } finally {
      setSaving(false);
    }
  };


  const restaurants = useMemo(() => {
    const map = new Map();
    staff.forEach((s) => { 
      const rId = s.restaurant_id || s.created_by;
      if (rId) {
        map.set(rId, restaurantsMap[rId] || s.restaurant_name || `Restaurant #${rId}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [staff, restaurantsMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter((s) => {
      const rId = s.restaurant_id || s.created_by;
      const rName = (rId ? restaurantsMap[rId] : null) || s.restaurant_name || "";
      const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
        s.designation?.toLowerCase().includes(q) || s.employee_id?.toLowerCase().includes(q) || rName.toLowerCase().includes(q);
      const matchRestaurant = filterRestaurant === "all" || String(s.restaurant_id) === String(filterRestaurant) || String(s.created_by) === String(filterRestaurant);
      const matchStatus = filterStatus === "all" || (filterStatus === "active" && s.is_active) || (filterStatus === "inactive" && !s.is_active);
      return matchSearch && matchRestaurant && matchStatus;
    });
  }, [staff, search, filterRestaurant, filterStatus, restaurantsMap]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const rId = s.restaurant_id || s.created_by;
      const key = (rId ? restaurantsMap[rId] : null) || s.restaurant_name || "Unknown Restaurant";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries());
  }, [filtered, restaurantsMap]);

  return (
    <div className="min-h-screen flex flex-col bg-[#071428] font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 pt-28 pb-20 px-6 sm:px-10">
          <div className="max-w-7xl mx-auto">

            {/* Page Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 text-[#D0B079] font-bold text-xs mb-3">
                  <Shield size={14} /><span>Super admin access</span>
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-white flex items-center gap-4">
                  All staff members
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/40 tracking-wider">{staff.length} Total</span>
                </h1>
                <p className="text-white/40 text-base font-medium mt-2">All restaurants combined — view, edit and manage status</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-white/50 border border-white/10">
                  {restaurants.length} Restaurants
                </span>
              </div>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, designation, restaurant..."
                  className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-[#D0B079]/50 transition-all" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
              <select value={filterRestaurant} onChange={(e) => setFilterRestaurant(e.target.value)}
                className="px-4 py-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#D0B079]/50 transition-all cursor-pointer [&>option]:bg-[#0b1a3d] [&>option]:text-white">
                <option value="all">All restaurants</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#D0B079]/50 transition-all cursor-pointer [&>option]:bg-[#0b1a3d] [&>option]:text-white">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </motion.div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#D0B079]/30 border-t-[#D0B079] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/40 text-sm font-medium">Loading all staff data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4"><X size={32} className="text-red-400" /></div>
                <p className="text-white/60 font-semibold mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#D0B079]/20 text-[#D0B079] border border-[#D0B079]/30 hover:bg-[#D0B079]/30 transition-all">Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <Users size={48} className="text-white/10 mb-4" />
                <p className="text-white/40 font-semibold">No staff members found</p>
                <p className="text-white/25 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-10">
                {grouped.map(([restaurantName, members], gi) => (
                  <motion.div key={restaurantName} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.06 }}>
                    {/* Restaurant Group Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10"><Building2 size={16} className="text-[#D0B079]" /></div>
                      <div>
                        <h2 className="text-white font-bold text-base">{restaurantName}</h2>
                        <p className="text-white/30 text-xs font-medium">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex-1 h-px bg-white/5 ml-2" />
                    </div>

                    {/* Staff Grid */}
                    <div className="flex flex-col gap-3">
                      {members.map((s, si) => (
                        <motion.div key={s.id}
                          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: gi * 0.06 + si * 0.04 }}
                          className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-[#D0B079]/25 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="shrink-0">
                              <Avatar src={s.profile_image} name={s.full_name} size="md" />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-white font-semibold text-base truncate">{s.full_name}</p>
                                <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold border ${
                                  s.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                  {s.is_active ? <ShieldCheck size={8} /> : <ShieldOff size={8} />}
                                  {s.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <p className="text-[#D0B079] text-[10px] font-bold tracking-wide flex items-center gap-1.5">
                                <Briefcase size={10} />{s.designation || "Staff member"}
                              </p>
                            </div>

                            <div className="hidden xl:flex flex-col gap-1 flex-1 min-w-0 px-4 border-l border-white/5">
                              <div className="flex items-center gap-2 text-white/40 text-[10px]">
                                <Mail size={10} className="shrink-0" /><span className="truncate">{s.email || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/40 text-[10px]">
                                <Phone size={10} className="shrink-0" /><span>{s.phone_number || "—"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleStatus(s.id, s.is_active)}
                                className={`relative inline-flex h-8 w-12 items-center rounded-xl transition-colors focus:outline-none ${s.is_active ? "bg-emerald-500/20" : "bg-white/5"} hover:bg-white/10`}
                                title={s.is_active ? "Deactivate" : "Activate"}
                              >
                                <span className={`inline-block h-5 w-5 transform rounded-lg transition-transform ${s.is_active ? "translate-x-6 bg-emerald-500" : "translate-x-1 bg-white/30"}`} />
                              </button>

                              <div className="h-6 w-px bg-white/5 mx-1" />

                              <button
                                onClick={() => handleViewAttendance(s.id)}
                                className="p-2 bg-white/5 hover:bg-blue-500/20 text-white/30 hover:text-blue-400 rounded-xl border border-white/5 transition-all"
                                title="View attendance"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenReport(s.id)}
                                className="p-2 bg-white/5 hover:bg-emerald-500/20 text-white/30 hover:text-emerald-400 rounded-xl border border-white/5 transition-all"
                                title="Generate report"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setNotificationTarget({ id: s.id, name: s.full_name, fcmToken: s.fcmToken, platform: s.platform });
                                  setShowNotificationModal(true);
                                }}
                                className="p-2 bg-white/5 hover:bg-amber-500/20 text-white/30 hover:text-amber-400 rounded-xl border border-white/5 transition-all"
                                title="Send notification"
                              >
                                <Bell size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenModal(s)}
                                className="p-2 bg-white/5 hover:bg-[#D0B079]/20 text-white/30 hover:text-[#D0B079] rounded-xl border border-white/5 transition-all"
                                title="Edit profile"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            <span className="text-[#D0B079] text-[10px] font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/5">{s.employee_id}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAttendanceModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }} transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-5xl bg-[#0b1a3d] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
              
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
                    <input type="date" value={attendanceFilters.from} onChange={(e) => setAttendanceFilters(p => ({ ...p, from: e.target.value }))}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-semibold text-white/30 tracking-widest ml-1">To date</label>
                    <input type="date" value={attendanceFilters.to} onChange={(e) => setAttendanceFilters(p => ({ ...p, to: e.target.value }))}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all" />
                  </div>
                  <button onClick={() => handleViewAttendance(attendanceData?.staff?.id, attendanceFilters)}
                    className="px-8 py-3 bg-[#D0B079] text-slate-900 font-semibold rounded-xl text-xs tracking-widest hover:bg-[#b8965f] transition-all">
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
                        <tr><td colSpan="4" className="px-6 py-20 text-center"><Loader2 className="animate-spin inline-block text-[#D0B079] mb-4" size={40} /><p className="text-white/20 font-bold tracking-widest text-xs">Fetching records...</p></td></tr>
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
                        <tr><td colSpan="4" className="px-6 py-20 text-center text-white/20 font-bold tracking-widest text-xs">No attendance records found for this period</td></tr>
                      )}
                    </tbody>
                    {attendanceData?.records?.length > 0 && (
                      <tfoot><tr className="bg-white/5 font-semibold"><td colSpan="3" className="px-6 py-6 text-right text-white/40 tracking-widest text-[10px]">Total hours worked</td><td className="px-6 py-6 text-right text-2xl text-[#D0B079]">{formatWorkTime(attendanceData.records.reduce((sum, r) => sum + (r.total_minutes || 0), 0))}</td></tr></tfoot>
                    )}
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }} transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-3xl bg-[#0b1a3d] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">

              {/* Modal Header */}
              <div className="bg-white/5 px-10 py-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#D0B079] font-bold tracking-widest uppercase text-[10px] mb-2">
                    <Edit2 size={12} /><span>Edit Staff Account</span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Update Profile</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-500 rounded-2xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-10 overflow-y-auto max-h-[70vh]" autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                  {/* Avatar */}
                  <div className="lg:col-span-4 flex flex-col items-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="h-44 w-44 rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 group-hover:border-[#D0B079] transition-all bg-white/[0.02] flex items-center justify-center">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="flex flex-col items-center text-white/10 group-hover:text-[#D0B079] transition-colors">
                            <Camera size={40} strokeWidth={1} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest mt-3">Change Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 bg-[#D0B079] text-slate-900 rounded-xl font-semibold text-[10px] uppercase tracking-widest shadow-xl group-hover:scale-105 transition-all">
                        Select Photo
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>

                    <div className="mt-14 w-full space-y-3">
                      <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Gender</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Male", "Female"].map(g => (
                          <button key={g} type="button" onClick={() => setFormData(p => ({ ...p, gender: g }))}
                            className={`py-3 rounded-2xl font-semibold text-xs uppercase tracking-widest transition-all border ${
                              formData.gender === g ? "bg-[#D0B079] text-slate-900 border-[#D0B079]" : "bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60"
                            }`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Full Name" icon={User} value={formData.full_name}
                        onChange={(e) => { const v = e.target.value; setFormData(p => ({ ...p, full_name: v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v })); }}
                        placeholder="e.g. Johnathan Doe" required />
                      <InputField label="Designation" icon={Briefcase} value={formData.designation}
                        onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Head Chef" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Email" icon={Mail} value={formData.email} type="email"
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="staff@watanstaff.com" required />
                      <InputField label="Phone Number" icon={Phone} value={formData.phone_number}
                        onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))} placeholder="+44 7700 900000" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Password" icon={Shield} value={formData.password} type="password"
                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Leave empty to keep current" autoComplete="new-password" />
                      <InputField label="Date of Birth" icon={Calendar} value={formData.dob} type="date"
                        onChange={(e) => setFormData(p => ({ ...p, dob: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 border-t border-white/5 pt-8">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-semibold text-xs uppercase tracking-widest rounded-2xl transition-all">
                    Discard
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-10 py-4 bg-[#D0B079] hover:bg-[#b8965f] text-slate-900 font-semibold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-[#D0B079]/20 transition-all flex items-center gap-3 disabled:opacity-50">
                    {saving ? <><Loader2 className="animate-spin" size={16} />Saving...</> : <><Save size={16} />Save changes</>}
                  </button>
                </div>
              </form>
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
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Network Scope</p>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <Store size={14} className="text-[#D0B079]" />
                      {restaurants.length} Restaurants
                    </p>
                  </div>
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
      
      {/* Send Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNotificationModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }} transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-lg bg-[#0b1a3d] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
              
              <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[#D0B079] font-bold tracking-wider mb-1">
                    <Bell size={14} />
                    <span className="text-[10px] font-semibold tracking-widest uppercase">Direct Notification</span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Notify {notificationTarget?.name}
                  </h2>
                </div>
                <button onClick={() => setShowNotificationModal(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-500 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSendNotification} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 tracking-widest uppercase ml-1">Notification Title</label>
                  <input 
                    type="text" 
                    value={notificationData.title} 
                    onChange={(e) => setNotificationData(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., New Task Assigned"
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 tracking-widest uppercase ml-1">Message Content</label>
                  <textarea 
                    value={notificationData.body} 
                    onChange={(e) => setNotificationData(p => ({ ...p, body: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={4}
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/40 transition-all resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowNotificationModal(false)}
                    className="flex-1 px-6 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={sendingNotification}
                    className="flex-[2] px-6 py-4 bg-[#D0B079] text-slate-900 font-bold rounded-2xl hover:bg-[#b8965f] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingNotification ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Bell size={18} />
                        <span>Send Notification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
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

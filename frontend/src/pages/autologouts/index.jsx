import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldOff, Search, ChevronDown, Store, Clock, LayoutDashboard, Filter, User, AlertTriangle, Loader2, Save, X, Edit2
} from "lucide-react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { usePopup } from "../../context/PopupContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AutoLogoutsPage() {
  const { showPopup } = usePopup();
  const { userData, perms } = useAuth();
  
  const isSuper = useMemo(() => {
    if (!userData) return false;
    const roleId = String(userData.role_id || "");
    const roleTitle = String(userData.role_title || userData.role || "").toLowerCase().trim();
    return roleId === "6" || roleTitle === "super admin" || perms?.includes("access");
  }, [userData, perms]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [restaurants, setRestaurants] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [autoLogouts, setAutoLogouts] = useState([]);
  
  // Filters
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Edit State
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  useEffect(() => {
    if (isSuper) {
      const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
        setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubRestaurants();
    }
  }, [isSuper]);

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      const staffData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staffData);
    });
    return () => unsubStaff();
  }, []);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    const from = new Date();
    const to = new Date();

    if (p === 'today') {
      // already set
    } else if (p === 'yesterday') {
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
    } else if (p === 'week') {
      from.setDate(from.getDate() - 7);
    } else if (p === 'month') {
      from.setMonth(from.getMonth() - 1);
    } else if (p === 'all') {
      from.setFullYear(2000);
    }

    if (p !== 'custom') {
      setDateRange({
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      });
      setShowPeriodMenu(false);
    }
  };

  const fetchAutoLogouts = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "attendance"), where("location_out", "==", "System Auto-Logout"));
      const snap = await getDocs(q);
      let records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Apply Filters
      const [fromY, fromM, fromD] = dateRange.from.split('-').map(Number);
      const fromDate = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0);

      const [toY, toM, toD] = dateRange.to.split('-').map(Number);
      const toDate = new Date(toY, toM - 1, toD, 23, 59, 59, 999);

      records = records.filter(r => {
        const d = r.clock_in?.toDate ? r.clock_in.toDate() : new Date(r.clock_in);
        return d >= fromDate && d <= toDate;
      });

      // Filter by User
      if (selectedUser) {
        records = records.filter(r => r.staff_id === selectedUser);
      }

      // Filter by Restaurant (using the staff list to figure it out, or if it's on the record)
      if (selectedRestaurant) {
        records = records.filter(r => {
          const s = staffList.find(staff => staff.id === r.staff_id);
          const rId = r.restaurant_id || s?.restaurant_id || s?.created_by;
          return rId === selectedRestaurant;
        });
      } else if (!isSuper && userData?.restaurant_id) {
        records = records.filter(r => {
          const s = staffList.find(staff => staff.id === r.staff_id);
          const rId = r.restaurant_id || s?.restaurant_id || s?.created_by;
          return rId === userData.restaurant_id;
        });
      }

      // Map with staff details
      const finalRecords = records.map(r => {
        const s = staffList.find(staff => staff.id === r.staff_id);
        const rest = isSuper && restaurants ? restaurants.find(res => String(res.id) === String(r.restaurant_id || s?.restaurant_id || s?.created_by)) : null;
        return {
          ...r,
          full_name: s?.full_name || "Unknown",
          profile_image: s?.profile_image,
          designation: s?.designation,
          restaurant_name: rest?.restaurant_name || s?.restaurant_name || "Unknown Restaurant"
        };
      }).sort((a, b) => {
        const da = a.clock_out?.toDate ? a.clock_out.toDate() : new Date(a.clock_out);
        const db = b.clock_out?.toDate ? b.clock_out.toDate() : new Date(b.clock_out);
        return db - da;
      });

      setAutoLogouts(finalRecords);
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to load auto logouts", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffList.length > 0) {
      fetchAutoLogouts();
    }
  }, [staffList, dateRange, period, selectedUser, selectedRestaurant, isSuper, userData, restaurants]);

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
    if (!editingAttendance.edit_reason || editingAttendance.edit_reason.trim() === "") {
      showPopup({ title: "Required", message: "Please provide a reason for editing the timings", type: "warning" });
      return;
    }
    setUpdatingAttendance(true);
    try {
      const cin = new Date(editingAttendance.clock_in);
      const cout = new Date(editingAttendance.clock_out);
      const totalMinutes = Math.floor((cout - cin) / 60000);
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      await updateDoc(doc(db, "attendance", editingAttendance.id), {
        clock_in: cin,
        clock_out: cout,
        total_minutes: Math.max(0, totalMinutes),
        edit_reason: editingAttendance.edit_reason.trim(),
        location_out: "Manual Edit (Was Auto-Logout)",
        audit_log: arrayUnion({
          action: "updated",
          by: user.email || user.uid,
          at: new Date(),
          reason: editingAttendance.edit_reason.trim(),
          changes: `Adjusted times from Auto Logout. Cin: ${cin.toISOString()} Cout: ${cout.toISOString()}`
        })
      });
      
      showPopup({ title: "Success", message: "Attendance updated successfully", type: "success" });
      setEditingAttendance(null);
      fetchAutoLogouts();
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to update attendance", type: "error" });
    } finally {
      setUpdatingAttendance(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] text-white font-sans selection:bg-[#D0B079]/30">
      <style dangerouslySetInnerHTML={{
        __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        `}} />
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 pt-24 lg:pt-20 pb-12 px-4 sm:px-6 lg:px-10 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col items-center text-center mt-2 mb-6 sm:mb-10 lg:mb-12 gap-6 sm:gap-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg tracking-tight whitespace-nowrap">
                  Auto Logouts
                </h1>
                <p className="text-white/60 mt-2 text-sm tracking-wider font-medium">Review and correct system-generated logouts</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl mx-auto mt-6 z-40">
                  {isSuper && (
                    <>
                      {/* Restaurant Dropdown Container */}
                      <div className="relative w-full sm:w-auto">
                        <button
                          onClick={() => { setShowRestaurantMenu(!showRestaurantMenu); setShowUserMenu(false); setShowPeriodMenu(false); }}
                          className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-6 py-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white/80 font-semibold hover:bg-white/10 transition-all text-sm tracking-wider shadow-xl group"
                        >
                          <LayoutDashboard size={18} className="text-[#D0B079] group-hover:scale-110 transition-transform" />
                          <span className="flex-1 sm:min-w-[160px] text-left">
                            {selectedRestaurant ? (restaurants.find(r => String(r.id) === String(selectedRestaurant))?.restaurant_name || "Select Restaurant") : "All Restaurants"}
                          </span>
                          <ChevronDown size={16} className={`transition-transform duration-300 ${showRestaurantMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showRestaurantMenu && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-3 w-72 bg-[#0b1a3d] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden"
                            >
                              <div className="px-4 py-2 border-b border-white/5 mb-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Switch Restaurant View</p>
                              </div>
                              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                <button
                                  onClick={() => { setSelectedRestaurant(""); setShowRestaurantMenu(false); }}
                                  className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${selectedRestaurant === "" ? 'text-[#D0B079] bg-[#D0B079]/5' : 'text-white/60'}`}
                                >
                                  All Restaurants
                                  {selectedRestaurant === "" && <div className="w-1.5 h-1.5 rounded-full bg-[#D0B079] shadow-[0_0_8px_#D0B079]" />}
                                </button>
                                {restaurants.map((r) => (
                                  <button
                                    key={r.id}
                                    onClick={() => { setSelectedRestaurant(String(r.id)); setShowRestaurantMenu(false); }}
                                    className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${String(selectedRestaurant) === String(r.id) ? 'text-[#D0B079] bg-[#D0B079]/5' : 'text-white/60'}`}
                                  >
                                    {r.restaurant_name}
                                    {String(selectedRestaurant) === String(r.id) && <div className="w-1.5 h-1.5 rounded-full bg-[#D0B079] shadow-[0_0_8px_#D0B079]" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* User Dropdown Container */}
                      <div className="relative w-full sm:w-auto">
                        <button
                          onClick={() => { setShowUserMenu(!showUserMenu); setShowRestaurantMenu(false); setShowPeriodMenu(false); }}
                          className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-6 py-3.5 backdrop-blur-md rounded-2xl border font-semibold hover:bg-white/10 transition-all text-sm tracking-wider shadow-xl group ${
                            selectedUser ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/80'
                          }`}
                        >
                          <User size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="flex-1 sm:min-w-[120px] text-left truncate">
                            {selectedUser ? (staffList.find(s => s.id === selectedUser)?.full_name || "Selected User") : "All Users"}
                          </span>
                          <ChevronDown size={16} className={`transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showUserMenu && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-3 w-80 bg-[#0b1a3d] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden"
                            >
                              <div className="px-4 py-2 border-b border-white/5 mb-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Filter by Staff Member</p>
                              </div>
                              <div className="px-3 py-2">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                  <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search staff..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/40 transition-all"
                                  />
                                </div>
                              </div>
                              <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                <button
                                  onClick={() => { setSelectedUser(""); setShowUserMenu(false); setUserSearch(""); }}
                                  className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${selectedUser === "" ? 'text-emerald-400 bg-emerald-500/5' : 'text-white/60'}`}
                                >
                                  All Users
                                  {selectedUser === "" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />}
                                </button>
                                {staffList
                                  .filter(s => !userSearch || s.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || s.email?.toLowerCase().includes(userSearch.toLowerCase()))
                                  .map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => { setSelectedUser(s.id); setShowUserMenu(false); setUserSearch(""); }}
                                    className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between gap-2 ${selectedUser === s.id ? 'text-emerald-400 bg-emerald-500/5' : 'text-white/60'}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-[#D0B079] shrink-0 overflow-hidden">
                                        {s.profile_image ? <img src={s.profile_image} className="w-full h-full object-cover" alt="" /> : s.full_name?.[0]?.toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm">{s.full_name}</p>
                                        <p className="text-[10px] text-white/30 truncate">{s.designation || 'Staff'}</p>
                                      </div>
                                    </div>
                                    {selectedUser === s.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}

                  {/* Period Filter Container */}
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() => { setShowPeriodMenu(!showPeriodMenu); setShowRestaurantMenu(false); setShowUserMenu(false); }}
                      className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-6 py-3.5 bg-[#D0B079]/10 backdrop-blur-md rounded-2xl border border-[#D0B079]/20 text-[#D0B079] font-semibold hover:bg-[#D0B079]/20 transition-all text-sm tracking-wider shadow-xl group"
                    >
                      <Filter size={18} className="group-hover:rotate-12 transition-transform" />
                      <span className="flex-1 sm:flex-none whitespace-nowrap">
                        {period === 'custom' ? `${dateRange.from} to ${dateRange.to}` : 
                         period === 'all' ? 'All Time' :
                         period.charAt(0).toUpperCase() + period.slice(1)}
                      </span>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${showPeriodMenu ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showPeriodMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full right-0 sm:right-auto sm:left-0 mt-3 w-72 bg-[#0b1a3d] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden"
                        >
                          <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Select Date Range</p>
                          </div>
                          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col">
                            {[
                              { id: 'all', label: 'All Time' },
                              { id: 'today', label: 'Today' },
                              { id: 'yesterday', label: 'Yesterday' },
                              { id: 'week', label: 'This Week' },
                              { id: 'month', label: 'This Month' },
                              { id: 'custom', label: 'Custom Range' }
                            ].map((opt) => (
                              <div key={opt.id} className="w-full">
                                <button
                                  onClick={() => {
                                    handlePeriodChange(opt.id);
                                    if (opt.id !== 'custom') setShowPeriodMenu(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${period === opt.id ? 'text-[#D0B079] bg-[#D0B079]/5' : 'text-white/60'}`}
                                >
                                  {opt.label}
                                  {period === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-[#D0B079] shadow-[0_0_8px_#D0B079]" />}
                                </button>
                                
                                {opt.id === 'custom' && period === 'custom' && (
                                  <div className="px-5 pb-4 pt-2 bg-black/20 border-t border-white/5 space-y-3">
                                    <div>
                                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1 block">From</label>
                                      <input
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-[#D0B079]/50 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1 block">To</label>
                                      <input
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-[#D0B079]/50 text-sm"
                                      />
                                    </div>
                                    <button 
                                      onClick={() => setShowPeriodMenu(false)}
                                      className="w-full py-2 bg-[#D0B079]/20 text-[#D0B079] rounded-xl text-xs font-bold hover:bg-[#D0B079]/30 transition-all mt-2"
                                    >
                                      Apply Custom Range
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto Logouts Table */}
            <div className="bg-[#0b1a3d] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/40">
                  <Loader2 size={32} className="animate-spin text-[#D0B079] mb-4" />
                  <p>Loading records...</p>
                </div>
              ) : autoLogouts.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Staff Name</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Restaurant</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Clock In</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-violet-400/70 text-right">Clock Out</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {autoLogouts.map((staff, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-violet-400 font-bold text-xs overflow-hidden shrink-0">
                                {staff.profile_image ? <img src={staff.profile_image} className="w-full h-full object-cover" /> : staff.full_name?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{staff.full_name}</p>
                                <p className="text-[10px] text-white/40 mt-0.5">{staff.designation || 'Staff'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Store size={14} className="text-white/40" />
                              <span className="text-xs font-medium text-white/80">{staff.restaurant_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white/80">
                                {staff.clock_in?.toDate ? staff.clock_in.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                              </span>
                              <span className="text-[10px] text-white/40">
                                {staff.clock_in?.toDate ? staff.clock_in.toDate().toLocaleDateString('en-GB') : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-violet-400 flex items-center gap-2">
                                <Clock size={12} className="text-violet-400/50" />
                                --
                              </span>
                              <span className="text-[10px] text-violet-400/50 mt-0.5">
                                (Auto Logouted)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setEditingAttendance({
                                id: staff.id,
                                clock_in: toLocalISO(staff.clock_in?.toDate ? staff.clock_in.toDate() : staff.clock_in),
                                clock_out: toLocalISO(staff.clock_out?.toDate ? staff.clock_out.toDate() : staff.clock_out),
                                edit_reason: ""
                              })}
                              className="p-2 bg-[#D0B079]/10 hover:bg-[#D0B079]/20 text-[#D0B079] rounded-lg transition-colors border border-[#D0B079]/20"
                              title="Edit Time"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20">
                  <ShieldOff size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 font-bold text-xl">No Auto Logouts</p>
                  <p className="text-white/30 text-sm mt-2">There are no auto-logouts for the selected filters.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Edit Attendance Modal */}
      {editingAttendance && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingAttendance(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0b1a3d] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white tracking-wide">Edit Timings</h3>
              <button onClick={() => setEditingAttendance(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAttendanceRecord} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5 block">Clock In Time</label>
                  <input
                    type="datetime-local"
                    value={editingAttendance.clock_in}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, clock_in: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#D0B079]/50 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5 block">Clock Out Time</label>
                  <input
                    type="datetime-local"
                    value={editingAttendance.clock_out}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, clock_out: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#D0B079]/50 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5 block">Reason for Editing</label>
                  <textarea
                    value={editingAttendance.edit_reason}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, edit_reason: e.target.value })}
                    placeholder="E.g., Forgot to clock out, system error..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#D0B079]/50 font-medium placeholder:text-white/20 resize-none h-24"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white/70 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingAttendance}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-[#D0B079] hover:bg-[#b8965f] transition-all shadow-[0_0_20px_rgba(208,176,121,0.3)] hover:shadow-[0_0_25px_rgba(208,176,121,0.5)] flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {updatingAttendance ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

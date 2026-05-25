import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  Users, ArrowRight, CheckCircle, Clock, X,
  TrendingUp, ChevronDown, LayoutDashboard, XCircle, Shield, Calendar, Filter, Search, User
} from "lucide-react";


import Header from "../common/header.jsx";
import Sidebar from "../common/sidebar.jsx";
import Footer from "../common/footer.jsx";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "../../context/PopupContext";
import { useAuth } from "../../context/AuthContext";


// --- Components ---

const ChartCard = ({ title, subtitle, children, delay, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    className={`rounded-2xl p-6 shadow-2xl border border-white/[0.08] bg-[#0b1a3d]/60 backdrop-blur-xl flex flex-col ${className}`}
  >
    <div className="mb-6">
      <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
      <p className="text-[11px] mt-1 text-white/40 uppercase tracking-widest font-semibold">{subtitle}</p>
    </div>
    <div className="flex-1 w-full min-h-[250px] relative">
      {children}
    </div>
  </motion.div>
);

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, delay, onEyeClick, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/[0.08] bg-[#0b1a3d]/60 backdrop-blur-xl shadow-2xl group hover:bg-[#0b1a3d]/80 transition-all duration-300 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[170px]"
  >
    <div className="relative z-10 flex justify-between items-start mb-2">
      <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl backdrop-blur-md inline-block shadow-inner ${colorClass} relative`}>
        <Icon size={18} className="sm:size-[22px] text-white" />
      </div>
      {(onEyeClick || trend) && (
        <div className="flex flex-col items-end gap-1.5">
          {onEyeClick && (
            <button
              onClick={onEyeClick}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/30 hover:text-white transition-all border border-white/5"
            >
              <ArrowRight size={16} />
            </button>
          )}
          {trend && (
            <div className="flex items-center gap-1 bg-[#D0B079]/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[#D0B079] text-[9px] sm:text-[10px] font-black border border-[#D0B079]/20 shadow-sm">
              <TrendingUp size={10} /> {trend}
            </div>
          )}
        </div>
      )}
    </div>

    <div className="relative z-10 mt-auto">
      <h3 className="text-xl sm:text-3xl font-semibold text-white drop-shadow-lg tracking-tight truncate">{value}</h3>
      <div className="mt-1 sm:mt-2 text-left">
        <p className="text-[12px] sm:text-sm font-medium text-white tracking-wider leading-tight mb-1 sm:mb-1.5">{title}</p>
        <p className="text-[10px] sm:text-xs font-normal text-white/90">{subtext}</p>
      </div>
    </div>

    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#D0B079]/5 rounded-full blur-3xl group-hover:bg-[#D0B079]/10 transition-colors" />
  </motion.div>
);

// --- Main Dashboard ---

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const roleTitle = String(userData?.role_title || userData?.role || "").toLowerCase().trim();
  const roleId = String(userData?.role_id || "");
  const isSuper = roleId === "6" || roleTitle === "super admin" || roleTitle === "superadmin";

  const [stats, setStats] = useState({
    total_staff: 0,
    present_today: 0,
    active_now: 0,
    weekly_data: [],
  });
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [timeRange, setTimeRange] = useState({
    from: "",
    to: ""
  });
  const [period, setPeriod] = useState("today");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Super Admin: User/Staff filter
  const [allStaffList, setAllStaffList] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSearch, setUserSearch] = useState("");


  useEffect(() => {
    if (isSuper) {
      const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
        setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubRestaurants();
    }
  }, [isSuper]);


  const handlePeriodChange = (p) => {
    setPeriod(p);
    const from = new Date();
    const to = new Date();

    if (p === 'today') {
      // already set
    } else if (p === 'yesterday') {
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
    } else if (p === '3days') {
      from.setDate(from.getDate() - 2);
    } else if (p === 'week') {
      from.setDate(from.getDate() - 7);
    } else if (p === 'month') {
      from.setMonth(from.getMonth() - 1);
    } else if (p === 'quarter') {
      from.setMonth(from.getMonth() - 3);
    } else if (p === 'halfyear') {
      from.setMonth(from.getMonth() - 6);
    }

    if (p !== 'custom') {
      setDateRange({
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      });
      setShowPeriodMenu(false);
    }
  };

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      const staffList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllStaffList(staffList);
      calculateStaffStats(staffList);
    });
    return () => unsubStaff();
  }, [selectedRestaurant, selectedUser, dateRange, timeRange, isSuper, userData, restaurants]);



  const calculateStaffStats = async (staffList) => {
    // 1. Determine the effective Restaurant ID
    const restaurantId = selectedRestaurant || String(userData?.restaurant_id || "");
    
    // Check super admin status directly from current userData
    const currentRoleTitle = String(userData?.role_title || userData?.role || "").toLowerCase().trim();
    const currentRoleId = String(userData?.role_id || "");
    const currentIsSuper = currentRoleId === "6" || currentRoleTitle === "super admin" || currentRoleTitle === "superadmin";
    
    let filteredStaff = [];

    if (currentIsSuper && !selectedRestaurant) {
      // Super Admin viewing all
      filteredStaff = staffList;
    } else if (currentIsSuper && selectedRestaurant) {
      // Super Admin filtered by a specific restaurant
      const selectedRest = restaurants.find(r => String(r.id) === String(selectedRestaurant));
      const restName = selectedRest?.restaurant_name;

      filteredStaff = staffList.filter(s => {
        const sRestId = String(s.restaurant_id || "");
        const sCreatedBy = String(s.created_by || "");
        const sRestName = String(s.restaurant_name || "");
        
        return sRestId === String(selectedRestaurant) || 
               sCreatedBy === String(selectedRestaurant) ||
               (restName && sRestId === String(restName)) ||
               (restName && sRestName === String(restName));
      });
    } else if (restaurantId) {
      // Regular Admin restricted to their restaurant
      const selectedRest = restaurants.find(r => String(r.id) === String(restaurantId));
      const restName = selectedRest?.restaurant_name;

      filteredStaff = staffList.filter(s => {
        const sRestId = String(s.restaurant_id || "");
        const sCreatedBy = String(s.created_by || "");
        const sRestName = String(s.restaurant_name || "");
        
        return sRestId === String(restaurantId) || 
               sCreatedBy === String(restaurantId) ||
               (restName && sRestId === String(restName)) ||
               (restName && sRestName === String(restName));
      });
    } else if (currentIsSuper) {
      // Super Admin fallback (no restaurant_id on user, no selection) - show all
      filteredStaff = staffList;
    } else {
      // Restricted user with NO restaurant_id assigned - SHOW NOTHING
      filteredStaff = [];
    }

    // Apply user/staff filter (Super Admin only)
    if (selectedUser && currentIsSuper) {
      filteredStaff = filteredStaff.filter(s => s.id === selectedUser);
    }



    const [fromY, fromM, fromD] = dateRange.from.split('-').map(Number);
    const fromDate = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0);

    const [toY, toM, toD] = dateRange.to.split('-').map(Number);
    const toDate = new Date(toY, toM - 1, toD, 23, 59, 59, 999);

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("clock_in", ">=", fromDate),
      where("clock_in", "<=", toDate),
      orderBy("clock_in", "desc")
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendanceRecords = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const presentStaffIds = new Set(attendanceRecords.map(r => r.staff_id));
    const presentCount = filteredStaff.filter(s => presentStaffIds.has(s.id)).length;
    
    // Filter attendance records to ONLY those belonging to staff in the selected restaurant
    const filteredStaffIds = new Set(filteredStaff.map(s => s.id));
    let filteredAttendance = attendanceRecords.filter(r => filteredStaffIds.has(r.staff_id));

    // Optional Time Range Filter
    if (timeRange.from || timeRange.to) {
      filteredAttendance = filteredAttendance.filter(r => {
        const rDate = r.clock_in?.toDate ? r.clock_in.toDate() : new Date(r.clock_in);
        const hours = rDate.getHours();
        const minutes = rDate.getMinutes();
        const rTime = hours * 60 + minutes;

        if (timeRange.from) {
          const [h, m] = timeRange.from.split(':').map(Number);
          if (rTime < h * 60 + m) return false;
        }
        if (timeRange.to) {
          const [h, m] = timeRange.to.split(':').map(Number);
          if (rTime > h * 60 + m) return false;
        }
        return true;
      });
    }


    // Calculate active now (clocked in but not clocked out)
    const activeNowCount = filteredAttendance.filter(r => !r.clock_out).length;

    const totalMinutesToday = filteredAttendance.reduce((sum, r) => sum + (Number(r.total_minutes) || 0), 0);
    const totalHoursToday = (totalMinutesToday / 60).toFixed(1);

    const recentActivity = filteredAttendance.slice(0, 10).map(r => {
      const s = filteredStaff.find(staff => staff.id === r.staff_id);
      return {
        ...r,
        full_name: s?.full_name || "Unknown Staff",
        profile_image: s?.profile_image,
        designation: s?.designation
      };
    });

    // Calculate weekly data (last 7 days from the END date)
    const weeklyData = [];
    const sevenDaysBeforeEnd = new Date(toDate);
    sevenDaysBeforeEnd.setDate(sevenDaysBeforeEnd.getDate() - 7);
    
    // For the chart, we might want a different range, but let's stick to the filtered set if it covers enough days
    // or just use the filteredAttendance if the range is small.
    // To be safe and show a trend, we'll fetch the last 7 days regardless of filter for the chart part? 
    // No, it should follow the filter.
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(toDate);
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayCount = filteredAttendance.filter(r => {
        const rDate = r.clock_in?.toDate ? r.clock_in.toDate() : new Date(r.clock_in);
        return rDate >= d && rDate < nextD;
      }).length;

      weeklyData.push({ day: dayName, count: dayCount });
    }

    setStats(prev => ({
      ...prev,
      total_staff: filteredStaff.length,
      present_today: presentCount,
      active_now: activeNowCount,
      total_hours_today: totalHoursToday,
      recent_activity: recentActivity,
      weekly_data: weeklyData
    }));

    setLoading(false);
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
                  Welcome, {userData?.name || "Admin"}
                </h1>
                <p className="text-white/60 mt-2 text-sm tracking-wider font-medium">Real-time overview of your team's attendance and performance</p>
                
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
                                  onClick={() => {
                                    setSelectedRestaurant("");
                                    setShowRestaurantMenu(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${selectedRestaurant === "" ? 'text-[#D0B079] bg-[#D0B079]/5' : 'text-white/60'}`}
                                >
                                  All Restaurants
                                  {selectedRestaurant === "" && <div className="w-1.5 h-1.5 rounded-full bg-[#D0B079] shadow-[0_0_8px_#D0B079]" />}
                                </button>
                                {restaurants.map((r) => (
                                  <button
                                    key={r.id}
                                    onClick={() => {
                                      setSelectedRestaurant(String(r.id));
                                      setShowRestaurantMenu(false);
                                    }}
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
                            {selectedUser ? (allStaffList.find(s => s.id === selectedUser)?.full_name || "Selected User") : "All Users"}
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
                                  onClick={() => {
                                    setSelectedUser("");
                                    setShowUserMenu(false);
                                    setUserSearch("");
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between ${selectedUser === "" ? 'text-emerald-400 bg-emerald-500/5' : 'text-white/60'}`}
                                >
                                  All Users
                                  {selectedUser === "" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />}
                                </button>
                                {allStaffList
                                  .filter(s => !userSearch || s.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || s.email?.toLowerCase().includes(userSearch.toLowerCase()))
                                  .map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedUser(s.id);
                                      setShowUserMenu(false);
                                      setUserSearch("");
                                    }}
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
                         period === '3days' ? 'Last 3 Days' :
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
                              { id: 'today', label: 'Today' },
                              { id: 'yesterday', label: 'Yesterday' },
                              { id: '3days', label: 'Last 3 Days' },
                              { id: 'week', label: 'This Week' },
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
                                
                                {/* Inline Custom Date Picker */}
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


            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Staff"
                value={stats.total_staff}
                subtext="Registered Members"
                icon={Users}
                colorClass="bg-[#D0B079]/20 border border-yellow-400/30"
                delay={0}
                onEyeClick={() => navigate('/allstaff')}
              />
              <StatCard
                title="Present Today"
                value={stats.present_today}
                subtext="Currently Working"
                icon={CheckCircle}
                colorClass="bg-emerald-500/20 border border-emerald-400/30"
                delay={0.1}
              />
              <StatCard
                title="Currently Active"
                value={stats.active_now}
                subtext="Currently Clocked In"
                icon={CheckCircle}
                colorClass="bg-emerald-500/20 border border-emerald-400/30"
                delay={0.2}
              />
              <StatCard
                title="Total Hours Today"
                value={`${stats.total_hours_today}h`}
                subtext="Combined Work Time"
                icon={Clock}
                colorClass="bg-blue-500/20 border border-blue-400/30"
                delay={0.3}
              />
            </div>

            <div className="mb-8">
              <ChartCard title="Weekly Attendance Trends" subtitle="Attendance volume over the last 7 days" delay={0.35}>
                 <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={stats.weekly_data}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D0B079" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D0B079" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0b1a3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                        itemStyle={{color: '#D0B079'}}
                      />
                      <Area type="monotone" dataKey="count" stroke="#D0B079" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </ChartCard>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <ChartCard title="Recent Activity" subtitle="Real-time attendance log" delay={0.4} className="lg:col-span-2">
                <div className="overflow-x-auto h-full">
                   <table className="w-full text-left">
                     <thead className="bg-white/5 border-b border-white/10">
                       <tr>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Staff member</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Time</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {loading ? (
                          <tr><td colSpan="4" className="px-6 py-12 text-center text-white/20 font-bold uppercase tracking-widest text-xs">Loading activity...</td></tr>
                        ) : stats.recent_activity?.length > 0 ? (
                          stats.recent_activity.map((act, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D0B079] font-bold text-xs overflow-hidden">
                                     {act.profile_image ? <img src={act.profile_image} className="w-full h-full object-cover" /> : act.full_name?.[0]}
                                  </div>
                                  <div>
                                    <p className="text-white font-bold text-sm">{act.full_name}</p>
                                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{act.designation || 'Staff'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white/80 text-xs font-semibold">
                                  {act.clock_out ? "Clocked Out" : "Clocked In"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-white font-bold text-sm">
                                  {act.clock_out ? new Date(act.clock_out?.toDate ? act.clock_out.toDate() : act.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(act.clock_in?.toDate ? act.clock_in.toDate() : act.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] text-white/30 font-medium">{new Date(act.clock_in?.toDate ? act.clock_in.toDate() : act.clock_in).toLocaleDateString()}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                  !act.clock_out ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>
                                  {!act.clock_out ? "ACTIVE" : "COMPLETED"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="4" className="px-6 py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs">No activity found today</td></tr>
                        )}
                     </tbody>
                   </table>
                </div>
              </ChartCard>

              <ChartCard title="Quick Actions" subtitle="One-click operations" delay={0.5}>
                 <div className="flex flex-col gap-3 h-full">
                    <button onClick={() => navigate('/allstaff')} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#D0B079]/10 hover:border-[#D0B079]/40 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-[#D0B079]/20 text-[#D0B079] rounded-xl group-hover:bg-[#D0B079] group-hover:text-slate-900 transition-all"><Users size={20} /></div>
                          <div className="text-left">
                             <p className="text-white font-bold text-sm">All Staff members</p>
                             <p className="text-[10px] text-white/30 uppercase tracking-widest">Full Directory</p>
                          </div>
                       </div>
                       <ArrowRight size={18} className="text-white/20 group-hover:text-[#D0B079] transition-all translate-x-0 group-hover:translate-x-1" />
                    </button>

                    <button onClick={() => navigate('/staff')} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-900 transition-all"><Clock size={20} /></div>
                          <div className="text-left">
                             <p className="text-white font-bold text-sm">Register Attendance</p>
                             <p className="text-[10px] text-white/30 uppercase tracking-widest">Manual Clock-in</p>
                          </div>
                       </div>
                       <ArrowRight size={18} className="text-white/20 group-hover:text-emerald-400 transition-all translate-x-0 group-hover:translate-x-1" />
                    </button>

                    <button onClick={() => navigate('/access/roles')} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/40 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-slate-900 transition-all"><Shield size={20} /></div>
                          <div className="text-left">
                             <p className="text-white font-bold text-sm">Manage Permissions</p>
                             <p className="text-[10px] text-white/30 uppercase tracking-widest">Access Control</p>
                          </div>
                       </div>
                       <ArrowRight size={18} className="text-white/20 group-hover:text-blue-400 transition-all translate-x-0 group-hover:translate-x-1" />
                    </button>

                 </div>
              </ChartCard>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilterModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[#0b1a3d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Filter size={20} className="text-[#D0B079]" />
                  Advanced Filters
                </h3>
                <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                {/* Select Comparison (Not used anymore as we moved to inline dropdown, keeping this modal around just in case you still need time filters) */}
                <section className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 ml-1">Select Comparison</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'today', label: 'Today vs Yesterday' },
                      { id: 'week', label: 'This week vs last week' },
                      { id: 'month', label: 'This Month vs Last Month' },
                      { id: 'quarter', label: 'This Quarter vs Last Quarter' },
                      { id: 'halfyear', label: 'This Half Year Vs Last Half Year' },
                      { id: 'custom', label: 'Custom Range' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handlePeriodChange(opt.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                          period === opt.id 
                          ? 'bg-[#D0B079]/10 border-[#D0B079] text-[#D0B079]' 
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          period === opt.id ? 'border-[#D0B079]' : 'border-white/20 group-hover:border-white/40'
                        }`}>
                          {period === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#D0B079]" />}
                        </div>
                        <span className="font-bold text-sm">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Select Period */}
                <section className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 ml-1">Select Period</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Start Date</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => {
                            setPeriod('custom');
                            setDateRange(prev => ({ ...prev, from: e.target.value }));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-[#D0B079]/50 transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">End Date</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => {
                            setPeriod('custom');
                            setDateRange(prev => ({ ...prev, to: e.target.value }));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-[#D0B079]/50 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                      <Clock size={16} className="text-[#D0B079]" />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Time Range (Optional)</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">From Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                          <input
                            type="time"
                            value={timeRange.from}
                            onChange={(e) => setTimeRange(prev => ({ ...prev, from: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-[#D0B079]/50 transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">To Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                          <input
                            type="time"
                            value={timeRange.to}
                            onChange={(e) => setTimeRange(prev => ({ ...prev, to: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-[#D0B079]/50 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>


              <div className="p-6 border-t border-white/10 bg-white/5 flex gap-4">
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-4 bg-[#D0B079] text-slate-900 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#D0B079]/10"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

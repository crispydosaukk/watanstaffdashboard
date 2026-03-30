import React, { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Users, CircleCheck, Clock, Search, Filter, Eye,
  MoreHorizontal, Trash2, RefreshCw, Loader2, X, Phone, Mail, MessageSquare,
  AlertCircle, CheckCircle2, UserCheck, Utensils
} from "lucide-react";

const STATUS_META = {
  pending:   { label: "Pending",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   dot: "bg-amber-400" },
  confirmed: { label: "Confirmed", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  seated:    { label: "Seated",    color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  dot: "bg-yellow-400" },
  completed: { label: "Completed", color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     dot: "bg-sky-400" },
  cancelled: { label: "Cancelled", color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    dot: "bg-rose-400" },
  no_show:   { label: "No Show",   color: "text-white/30",    bg: "bg-white/5",        border: "border-white/10",       dot: "bg-white/30" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border uppercase ${m.bg} ${m.color} ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`}></span>
      {m.label}
    </span>
  );
}

export default function TableReservations() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRes, setSelectedRes] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/table-reservations");
      setReservations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setUpdating(true);
      await api.put(`/table-reservations/${id}/status`, { status, notes: selectedRes?.notes });
      setSelectedRes(null);
      fetchReservations();
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await api.delete(`/table-reservations/${id}`);
      fetchReservations();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        r.customer_name.toLowerCase().includes(q) ||
        (r.customer_phone || "").includes(q) ||
        (r.table_number || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reservations, search, statusFilter]);

  const stats = useMemo(() => ({
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    today: reservations.filter(r => {
      const todayStr = new Date().toISOString().split('T')[0];
      return r.reservation_date === todayStr;
    }).length
  }), [reservations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428]">
      <Header onToggleSidebar={() => setSidebarOpen(v => !v)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col min-h-screen pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl">
                  <Utensils className="text-yellow-400" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Table Reservations</h1>
                  <p className="text-white/40 text-sm font-medium mt-1.5 uppercase tracking-widest">Real-time Booking Manager</p>
                </div>
              </div>
              <button 
                onClick={fetchReservations}
                disabled={loading}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/[0.08] transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Total Bookings", value: stats.total, icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/10" },
                { label: "Awaiting Confirmation", value: stats.pending, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
                { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "Completed", value: stats.completed, icon: UserCheck, color: "text-sky-400", bg: "bg-sky-400/10" },
                { label: "Today's Guests", value: stats.today, icon: Clock, color: "text-indigo-400", bg: "bg-indigo-400/10" },
              ].map((s, i) => (
                <div key={i} className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl shadow-black/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <s.icon size={18} className={s.color} />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">{s.value}</span>
                  </div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em] leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name, phone or table..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#0b1a3d]/40 border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/40 transition-all"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#0b1a3d]/40 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value="all" className="bg-[#0b1a3d]">All Statuses</option>
                {Object.keys(STATUS_META).map(k => (
                  <option key={k} value={k} className="bg-[#0b1a3d]">{STATUS_META[k].label}</option>
                ))}
              </select>
            </div>

            {/* Content Table */}
            <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-semibold text-white/40">Guest Info</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-white/40">Table</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-white/40">Schedule</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-white/40">Status</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-white/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Loader2 className="animate-spin text-yellow-400 mx-auto mb-3" size={32} />
                          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Loading bookings...</p>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs">No records found</td>
                      </tr>
                    ) : filtered.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/20 flex items-center justify-center text-yellow-500 font-semibold text-xs">
                              {r.customer_name?.[0]?.toUpperCase() || "G"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                              <p className="text-[11px] text-white/40 mt-0.5 font-medium">{r.customer_phone || "No phone"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                             <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl text-[11px] font-semibold flex items-center gap-2">
                                  Table {r.table_number || "—"}
                                  <span className="opacity-30">•</span>
                                  <span className="text-white/60">{r.party_size} Persons</span>
                                </span>
                             </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-white">{new Date(r.reservation_date).toLocaleDateString()}</p>
                          <p className="text-[11px] text-white/40 mt-0.5 font-medium">{r.reservation_time}</p>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedRes(r)}
                              className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl border border-yellow-500/20 transition-all shadow-lg shadow-yellow-500/5 group"
                              title="View details"
                            >
                              <Eye size={16} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => handleDelete(r.id)}
                              className="p-2 bg-white/5 hover:bg-rose-500/20 text-white hover:text-rose-400 rounded-lg border border-white/5 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Details & Action Modal */}
      <AnimatePresence>
        {selectedRes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRes(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1c23] border border-white/[0.1] rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#071428] to-[#0d1f45] shrink-0">
                <div>
                  <h3 className="text-2xl font-semibold text-white tracking-tight">Reservation Details</h3>
                  <p className="text-xs text-white/40 mt-2 font-medium tracking-wider leading-none">Booking ID: #{selectedRes.id}</p>
                </div>
                <button onClick={() => setSelectedRes(null)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Guest Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Guest Name</p>
                    <p className="text-base font-semibold text-white">{selectedRes.customer_name}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Status</p>
                    <StatusBadge status={selectedRes.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Table & Party</p>
                    <p className="text-base font-semibold text-white">Table: {selectedRes.table_number || "—"} ({selectedRes.party_size} Guests)</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/[0.05]">
                    <p className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wide">Duration</p>
                    <p className="text-base font-semibold text-white">{selectedRes.duration_minutes || 60} minutes</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-white/60 text-sm">
                      <Phone size={16} className="text-yellow-400" />
                      {selectedRes.customer_phone || "No phone"}
                   </div>
                   <div className="flex items-center gap-3 text-white/60 text-sm">
                      <Mail size={16} className="text-yellow-400" />
                      {selectedRes.customer_email || "No email"}
                   </div>
                   <div className="flex items-center gap-3 text-white/80 text-base">
                      <Calendar size={18} className="text-yellow-400" />
                      {new Date(selectedRes.reservation_date).toLocaleDateString()} at {selectedRes.reservation_time}
                   </div>
                   <div className="flex items-center gap-3 text-white/80 text-base">
                      <MessageSquare size={18} className="text-yellow-400" />
                      {selectedRes.special_requests || "No special requests"}
                   </div>

                    <div className="pt-4">
                      <p className="text-xs font-bold text-white/30 mb-3 uppercase tracking-widest">Staff Notes</p>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-yellow-500/40"
                        rows={2}
                        value={selectedRes.notes || ""}
                        placeholder="Internal staff notes..."
                        onChange={e => setSelectedRes(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-white/[0.08]">
                  <p className="text-xs font-bold text-white/30 mb-5 uppercase tracking-widest">Set Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['confirmed', 'seated', 'completed', 'cancelled', 'no_show'].map(s => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedRes.id, s)}
                        className={`px-3 py-3.5 rounded-2xl text-[13px] font-bold uppercase tracking-wider transition-all border ${
                          selectedRes.status === s 
                          ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedRes(null)}
                  className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-yellow-500/20 active:scale-95 transition-all"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

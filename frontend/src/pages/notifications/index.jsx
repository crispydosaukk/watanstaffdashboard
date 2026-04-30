import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Send, Calendar, Clock, Users, Building2, Briefcase, 
  AlertTriangle, Info, CheckCircle2, MessageSquare, Trash2,
  ChevronRight, Search, Plus, Filter, Layout, Inbox, History,
  Loader2, RefreshCw, RotateCcw
} from "lucide-react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import { db } from "../../lib/firebase";
import { 
  collection, query, onSnapshot, addDoc, serverTimestamp, 
  where, getDocs, getDoc, deleteDoc, doc, orderBy, writeBatch
} from "firebase/firestore";
import { usePopup } from "../../context/PopupContext";

const NOTIFICATION_TYPES = [
  { id: "announcement", label: "Announcement", icon: MessageSquare, color: "blue", emoji: "📢" },
  { id: "alert", label: "Low Stock Alert", icon: AlertTriangle, color: "amber", emoji: "⚠️" },
  { id: "expiry", label: "Expiry Warning", icon: Clock, color: "orange", emoji: "⏰" },
  { id: "order", label: "Order Update", icon: Layout, color: "indigo", emoji: "📦" },
  { id: "system", label: "System Update", icon: Info, color: "slate", emoji: "⚙️" },
];

const PRIORITIES = [
  { id: "normal", label: "Normal", color: "slate" },
  { id: "high", label: "High", color: "rose" },
  { id: "urgent", label: "Urgent", color: "red" },
];

export default function NotificationsPage() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("create"); // create, history
  
  const [restaurants, setRestaurants] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetRestaurant: "all",
    targetDesignation: "all",
    type: "announcement",
    priority: "normal",
    recurring: "none",
    scheduledFor: "",
  });

  useEffect(() => {
    // Fetch Restaurants
    const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(list);
    });

    // Fetch Unique Designations from Staff
    const unsubStaff = onSnapshot(collection(db, "staff"), (snapshot) => {
      const desigs = new Set();
      snapshot.forEach(doc => {
        if (doc.data().designation) desigs.add(doc.data().designation);
      });
      setDesignations(Array.from(desigs).sort());
    });

    // Fetch Notification History
    const qHistory = query(collection(db, "notifications"), orderBy("sent_at", "desc"));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const grouped = [];
      const seenMap = new Map();

      allNotifs.forEach(item => {
        // Use broadcast_id as key, or a composite key for older individual notifications
        const key = item.broadcast_id || `${item.title}-${item.body}-${item.sent_at?.toMillis ? Math.floor(item.sent_at.toMillis() / 60000) : item.id}`;
        
        if (!seenMap.has(key)) {
          seenMap.set(key, { ...item, recipient_count: 1 });
          grouped.push(seenMap.get(key));
        } else {
          seenMap.get(key).recipient_count += 1;
        }
      });
      
      setHistory(grouped);
      setLoading(false);
    });

    return () => {
      unsubRestaurants();
      unsubStaff();
      unsubHistory();
    };
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      showPopup({ title: "Error", message: "Title and message are required", type: "error" });
      return;
    }

    setSending(true);
    try {
      // 1. Identify Target Staff
      let staffQuery;
      if (formData.targetRestaurant === "all") {
        staffQuery = query(collection(db, "staff"));
      } else {
        staffQuery = query(collection(db, "staff"), where("restaurant_id", "==", formData.targetRestaurant));
      }

      const staffSnapshot = await getDocs(staffQuery);
      let targetStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


      // 2. Filter by Designation
      if (formData.targetDesignation !== "all") {
        targetStaff = targetStaff.filter(s => s.designation === formData.targetDesignation);
      }

      // Add the current sender (Admin) AFTER filters so they are ALWAYS included
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser.uid) {
        let adminInList = targetStaff.find(s => s.id === currentUser.uid);
        if (!adminInList) {
          // Fetch admin doc specifically to get their fcmToken
          const adminDoc = await getDoc(doc(db, "staff", currentUser.uid));
          const adminData = adminDoc.exists() ? adminDoc.data() : {};
          
          targetStaff.push({
            id: currentUser.uid,
            full_name: adminData.full_name || currentUser.full_name || "Admin (Me)",
            restaurant_id: adminData.restaurant_id || currentUser.restaurant_id || "",
            fcmToken: adminData.fcmToken || null,
            platform: adminData.platform || "unknown"
          });
        }
      }

      console.log("Final target list:", targetStaff.map(s => s.id));

      if (targetStaff.length === 0) {
        throw new Error("No staff members found matching the selected criteria");
      }

      // 4. Create Notification Records
      console.log("Sending broadcast to:", targetStaff.map(s => s.full_name));
      
      const broadcastId = `bcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const targetRestName = formData.targetRestaurant === 'all' ? 'All Restaurants' : restaurants.find(r => r.id === formData.targetRestaurant)?.restaurant_name || 'Selected Restaurant';
      const targetRoleName = formData.targetDesignation === 'all' ? 'All Roles' : formData.targetDesignation;
      const targetGroup = `${targetRestName} • ${targetRoleName}`;

      const promises = targetStaff.map(s => {
        return addDoc(collection(db, "notifications"), {
          title: formData.title,
          body: formData.message,
          staff_id: s.id,
          staff_name: s.full_name,
          restaurant_id: s.restaurant_id || "",
          type: formData.type || "announcement",
          priority: formData.priority || "normal",
          status: formData.scheduledFor ? "scheduled" : "pending",
          scheduled_for: formData.scheduledFor ? new Date(formData.scheduledFor) : null,
          sent_at: serverTimestamp(),
          broadcast_id: broadcastId,
          target_group: targetGroup,
          fcm_token: s.fcmToken || s.fcm_token || null,
          platform: s.platform || "unknown"
        });
      });

      await Promise.all(promises);

      const staffNames = targetStaff.map(s => s.full_name).join(', ');
      console.log(`[Notification] Sent to: ${staffNames}`);

      showPopup({ 
        title: "Success", 
        message: `Notification sent to ${targetStaff.length} staff members.`, 
        type: "success" 
      });
      
      setFormData({
        title: "",
        message: "",
        targetRestaurant: "all",
        targetDesignation: "all",
        type: "announcement",
        priority: "normal",
        recurring: "none",
        scheduledFor: "",
      });
      setActiveTab("history");

    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: err.message || "Failed to send notification", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (item) => {
    try {
      if (item.broadcast_id) {
        // Delete the entire broadcast group
        const q = query(collection(db, "notifications"), where("broadcast_id", "==", item.broadcast_id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showPopup({ title: "Notification Deleted", message: "All records for this notification have been removed.", type: "success" });
      } else {
        // Delete single notification
        await deleteDoc(doc(db, "notifications", item.id));
        showPopup({ title: "Deleted", message: "Notification record removed", type: "success" });
      }
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Failed to delete notification", type: "error" });
    }
  };

  const handleResend = (item) => {
    setFormData({
      title: item.title || "",
      message: item.body || "",
      targetRestaurant: item.restaurant_id || "all",
      targetDesignation: item.target_designation || "all",
      type: item.type || "announcement",
      priority: item.priority || "normal",
      recurring: item.recurring || "none",
      scheduledFor: "",
    });
    setActiveTab("create");
    showPopup({ 
      title: "Ready to Resend", 
      message: "We've loaded the details. Review them and click 'Send' to broadcast again.", 
      type: "info" 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#071428] text-white font-sans selection:bg-[#D0B079]/30 overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 pt-28 pb-20 px-6 sm:px-10">
          <div className="max-w-7xl mx-auto">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-4xl font-semibold tracking-tight text-white flex items-center gap-4">
                  Communication Center
                </h1>
                <p className="text-white/40 text-base font-medium mt-2">Send messages and alerts to your restaurant teams.</p>
              </motion.div>

              <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                <button 
                  onClick={() => setActiveTab("create")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'create' ? 'bg-[#D0B079] text-slate-900 shadow-lg shadow-[#D0B079]/20' : 'text-white/40 hover:text-white'}`}
                >
                  <Plus size={14} /> Create
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-[#D0B079] text-slate-900 shadow-lg shadow-[#D0B079]/20' : 'text-white/40 hover:text-white'}`}
                >
                  <History size={14} /> History
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "create" ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full max-w-4xl bg-white/[0.03] border border-white/[0.08] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                >
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#D0B079]/5 rounded-full blur-[80px] pointer-events-none" />

                  <div className="flex items-center gap-3 mb-10 border-b border-white/5 pb-6">
                    <div className="p-3 bg-[#D0B079]/10 rounded-2xl">
                      <Bell size={24} className="text-[#D0B079]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Create & Send Notification</h2>
                      <p className="text-white/30 text-xs">Define your recipients and send your notification.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSendNotification} className="space-y-8">
                    {/* Primary Content Section */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Title</label>
                        <input 
                          type="text"
                          placeholder="Notification title..."
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium placeholder-white/10 focus:outline-none focus:border-[#D0B079]/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Message</label>
                        <textarea 
                          placeholder="Type your message here..."
                          rows="4"
                          value={formData.message}
                          onChange={(e) => setFormData({...formData, message: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium placeholder-white/10 focus:outline-none focus:border-[#D0B079]/50 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Configuration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Target Restaurant</label>
                        <div className="relative">
                          <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                          <select 
                            value={formData.targetRestaurant}
                            onChange={(e) => setFormData({...formData, targetRestaurant: e.target.value})}
                            className="w-full pl-11 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#071428]"
                          >
                            <option value="all">All Restaurants ({restaurants.length})</option>
                            {restaurants.map(r => (
                              <option key={r.id} value={r.id}>{r.restaurant_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Target Designation</label>
                        <div className="relative">
                          <Briefcase size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                          <select 
                            value={formData.targetDesignation}
                            onChange={(e) => setFormData({...formData, targetDesignation: e.target.value})}
                            className="w-full pl-11 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#071428]"
                          >
                            <option value="all">All Roles ({designations.length})</option>
                            {designations.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Notification Type</label>
                        <select 
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#071428]"
                        >
                          {NOTIFICATION_TYPES.map(t => (
                            <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Schedule Time</label>
                        <div className="relative">
                          <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                          <input 
                            type="datetime-local"
                            value={formData.scheduledFor}
                            min={new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)}
                            onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
                            className="w-full pl-11 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Priority</label>
                        <select 
                          value={formData.priority}
                          onChange={(e) => setFormData({...formData, priority: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#071428]"
                        >
                          {PRIORITIES.map(p => (
                            <option key={p.id} value={p.id}>{p.label} Priority</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Recurrence</label>
                        <select 
                          value={formData.recurring}
                          onChange={(e) => setFormData({...formData, recurring: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-[#D0B079]/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#071428]"
                        >
                          <option value="none">One-time notification</option>
                          <option value="daily">Daily notification</option>
                          <option value="weekly">Weekly notification</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        disabled={sending}
                        className="w-full py-5 bg-[#D0B079] hover:bg-[#b8965f] text-slate-900 font-black rounded-2xl shadow-xl shadow-[#D0B079]/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 tracking-widest text-sm"
                      >
                        {sending ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Send size={20} />
                        )}
                        SEND NOTIFICATION
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 max-w-5xl"
                >
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
                    ))
                  ) : history.length > 0 ? (
                    history.slice(0, 50).map((item) => (
                      <div 
                        key={item.id}
                        className="group bg-white/[0.02] border border-white/[0.08] hover:border-[#D0B079]/30 hover:bg-white/[0.04] p-4 rounded-2xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2.5 rounded-xl ${item.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-white/40 group-hover:bg-[#D0B079]/10 group-hover:text-[#D0B079] transition-all'}`}>
                            <MessageSquare size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-sm group-hover:text-[#D0B079] transition-colors truncate">{item.title}</h3>
                            <p className="text-white/30 text-[11px] mt-0.5 line-clamp-1">{item.body}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {item.target_group || `Sent to: ${item.recipient_count || 0} staff`}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                item.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                item.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                                'bg-white/5 text-white/40 border-white/5'
                              }`}>
                                {item.priority}
                              </span>
                              {item.status === 'scheduled' ? (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 flex items-center gap-1">
                                  <Clock size={8} />
                                  Scheduled
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle2 size={8} />
                                  Sent
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:pl-4 md:border-l md:border-white/5">
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-white/40">
                              {item.status === 'scheduled' && item.scheduled_for?.toDate 
                                ? item.scheduled_for.toDate().toLocaleDateString() 
                                : item.sent_at?.toDate ? item.sent_at.toDate().toLocaleDateString() : 'Just now'}
                            </div>
                            <div className="text-[9px] text-white/20 mt-0.5">
                              {item.status === 'scheduled' && item.scheduled_for?.toDate 
                                ? item.scheduled_for.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : item.sent_at?.toDate ? item.sent_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleResend(item)}
                              className="px-3 py-2 bg-[#D0B079]/10 text-[#D0B079] hover:bg-[#D0B079] hover:text-slate-900 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold"
                              title="Resend this notification"
                            >
                              <RotateCcw size={12} />
                              Resend
                            </button>
                            <button 
                              onClick={() => handleDeleteNotification(item)}
                              className="p-2 bg-white/5 hover:bg-rose-500/20 text-white/20 hover:text-rose-400 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-32 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
                      <div className="p-8 bg-white/5 rounded-full mb-8 text-white/10">
                        <Inbox size={64} strokeWidth={1} />
                      </div>
                      <h3 className="text-2xl font-semibold text-white/30 tracking-tight">No notification history</h3>
                      <p className="text-white/10 font-medium mt-2">Your sent notifications will appear here.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>
    </div>
  );
}

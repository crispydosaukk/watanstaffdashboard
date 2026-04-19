// src/pages/orders/index.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import ReadyInModal from "../../components/common/ReadyInModal.jsx";
import {
  Search, RefreshCw, Filter, Calendar, PoundSterling, User, Truck,
  MapPin, Phone, Car, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag, CreditCard, Eye, X, Loader2, ChevronRight, ChefHat, PackageCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "../../context/PopupContext";

function safeNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

const statusConfig = (status) => {
  switch (status) {
    case 0: return { text: "Placed", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertCircle };
    case 1: return { text: "Accepted", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: Clock };
    case 2: return { text: "Rejected", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle };
    case 3: return { text: "Ready", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: ShoppingBag };
    case 4: return { text: "Collected", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle };
    case 5: return { text: "Cancelled", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle };
    case 6: return { text: "Refunded", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: AlertCircle };
    default: return { text: "Unknown", color: "text-white/40", bg: "bg-white/5", border: "border-white/10", icon: AlertCircle };
  }
};

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  const items = order.items || [];
  const statusInfo = statusConfig(order.order_status);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 sm:p-8 border-b border-white/[0.08] bg-white/5 flex justify-between items-center">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <ShoppingBag className="text-yellow-500 shrink-0" size={24} /> Order #{order.order_number}
            </h2>
            <p className="text-xs font-medium text-white/50 mt-1">Transmission: {new Date(order.created_at).toLocaleString('en-GB')}</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/[0.08]"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/[0.08]">
              <h3 className="text-sm font-bold text-yellow-500 mb-6 flex items-center gap-2"><User size={14} /> Identity Profile</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/[0.05] pb-3"><span className="text-xs font-bold text-white/50">Node</span><span className="text-sm font-bold text-white">{order.customer_name || "Guest"}</span></div>
                <div className="flex justify-between border-b border-white/[0.05] pb-3"><span className="text-xs font-bold text-white/50">Comm</span><span className="text-sm font-bold text-white">{order.mobile_number || "-"}</span></div>
              </div>
            </div>
            <div className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/[0.08]">
              <h3 className="text-sm font-bold text-yellow-500 mb-6 flex items-center gap-2"><Truck size={14} /> Logistics Matrix</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/[0.05] pb-3"><span className="text-xs font-bold text-white/50">Type</span><span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${order.instore === 1 ? "bg-yellow-500/10 text-yellow-500" : "bg-purple-500/10 text-purple-400"}`}>{order.instore === 1 ? "INSTORE" : "KERBSIDE"}</span></div>
                {order.takeaway_time && <div className="flex justify-between border-b border-white/[0.05] pb-3"><span className="text-xs font-bold text-white/50">Scheduled</span><span className="text-sm font-bold text-amber-400">{order.takeaway_time}</span></div>}
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/50">Status</span><span className={`text-[10px] font-bold uppercase tracking-widest ${statusInfo.color}`}>{statusInfo.text}</span></div>
              </div>
            </div>
          </div>
          {order.allergy_note && (
            <div className="bg-rose-500/10 p-5 sm:p-6 rounded-2xl border border-rose-500/20">
              <h3 className="text-sm font-bold text-rose-500 mb-2 flex items-center gap-2"><AlertCircle size={14} /> Food Allergies</h3>
              <p className="text-sm font-bold text-rose-200">{order.allergy_note}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-6">Payload Manifest</h3>
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/5">
              <div className="overflow-x-auto"><table className="w-full text-left min-w-[400px]">
                <thead className="bg-[#0b1a3d]/60 text-white text-sm font-bold"><tr><th className="px-6 py-4">Qty</th><th className="px-6 py-4">Item</th><th className="px-6 py-4 text-right">Aggregate</th></tr></thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4"><span className="text-xl font-bold text-yellow-500">{safeNumber(item.quantity)}<span className="text-[9px] ml-0.5">X</span></span></td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-white leading-tight">{item.product_name}</p>
                        {item.special_instruction && <div className="mt-1 text-[8px] font-bold text-yellow-500 uppercase tracking-widest">Note: {item.special_instruction}</div>}
                      </td>
                      <td className="px-6 py-4 text-right text-white font-bold text-sm">£{(safeNumber(item.price) * safeNumber(item.quantity)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8 bg-white/5 border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-xs font-bold text-white/50">Nodes Active: {items.length}</div>
          <div className="text-3xl font-bold text-yellow-500 tracking-tight shadow-yellow-500/20">£{safeNumber(order.grand_total).toFixed(2)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Orders() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [orderForReady, setOrderForReady] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const [searchOrder, setSearchOrder] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const location = useLocation();
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("orderAutoRefresh") === "true");

  useEffect(() => {
    if (location.state?.highlightOrder) setSearchOrder(location.state.highlightOrder);
  }, [location.state]);

  useEffect(() => { localStorage.setItem("orderAutoRefresh", autoRefresh); }, [autoRefresh]);

  const loadOrders = async () => {
    try {
      const res = await api.get("/mobile/orders");
      if (res.data.status === 1 && Array.isArray(res.data.orders)) {
        const mapped = res.data.orders.map((o) => ({ ...o, restaurant_name: o.restaurant_name || "-" }));
        setOrders(prev => JSON.stringify(prev) === JSON.stringify(mapped) ? prev : mapped);
      }
    } catch (err) { }
  };

  useEffect(() => {
    const handleAutoRefresh = () => {
      loadOrders();
    };
    window.addEventListener('dashboard-refresh', handleAutoRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleAutoRefresh);
  }, []);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    let data = [...orders];
    if (searchOrder.trim() !== "") data = data.filter((o) => (o.order_number || "").toLowerCase().includes(searchOrder.toLowerCase()));
    if (filterPayment !== "all") data = data.filter((o) => filterPayment === "cod" ? o.payment_mode === 0 : o.payment_mode === 1);
    if (filterStatus !== "all") data = data.filter((o) => o.order_status?.toString() === filterStatus);
    if (fromDate) data = data.filter((o) => new Date(o.created_at).setHours(0, 0, 0, 0) >= new Date(fromDate).setHours(0, 0, 0, 0));
    if (toDate) data = data.filter((o) => new Date(o.created_at).setHours(0, 0, 0, 0) <= new Date(toDate).setHours(0, 0, 0, 0));
    setFilteredOrders(prev => { if (JSON.stringify(prev) === JSON.stringify(data)) return prev; setCurrentPage(1); return data; });
  }, [searchOrder, filterPayment, filterStatus, fromDate, toDate, orders]);

  const groupedOrders = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o, idx) => {
      const key = o.order_number || `ORDER_${idx}`;
      if (!map[key]) map[key] = { ...o, items: [], grand_total: 0 };
      map[key].items.push(o);
      map[key].grand_total += safeNumber(o.grand_total);
    });
    return Object.values(map);
  }, [filteredOrders]);

  const totalPages = Math.ceil(groupedOrders.length / rowsPerPage) || 1;
  const currentOrders = groupedOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const updateOrderStatus = async (orderNumber, status, readyInMinutes = null) => {
    try {
      await api.post("/mobile/orders/update-status", { order_number: orderNumber, status, ready_in_minutes: readyInMinutes });
      loadOrders();
    } catch (error) { showPopup({ title: "Update Failed", message: "Error", type: "error" }); }
  };

  const confirmCollection = (order) => {
    showPopup({
      title: "Confirm Collection",
      message: (
        <div className="text-sm font-medium text-white/80 mt-2 space-y-3 text-left">
          <p className="text-white/60 mb-4">Are you sure you want to mark order <strong className="text-yellow-400 font-black">#{order.order_number}</strong> as collected?</p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                <span className="text-white/40 font-black">{item.quantity}x</span>
                <span className="text-white font-medium flex-1 truncate">{item.product_name}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      type: "confirm",
      onConfirm: () => updateOrderStatus(order.order_number, 4)
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-24 min-h-0 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 px-3 sm:px-6 lg:px-10 py-8 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto">

              {/* Page Header Area */}
              <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <ShoppingBag className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-lg leading-none">Order Management</h1>
                    <p className="text-white mt-1.5 text-sm font-medium tracking-wide">Execute Real-Time Order Fulfillments and Tracking</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 bg-[#0b1a3d]/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl w-full sm:w-auto">
                  <label className="flex items-center gap-3 cursor-pointer px-3">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                      <div className={`w-10 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-yellow-500' : 'bg-white/10'}`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${autoRefresh ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-xs font-bold text-white/60 tracking-wide">Live Sync</span>
                  </label>
                  <div className="w-px h-6 bg-white/10"></div>
                  <button onClick={loadOrders} className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-2xl transition-all border border-yellow-500/30 active:scale-90"><RefreshCw size={16} /></button>
                </div>
              </div>

              {/* Filters Area */}               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-10 h-min">
                <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400" size={14} />
                  <input placeholder="Transmission ID..." value={searchOrder} onChange={e => setSearchOrder(e.target.value)} className="w-full bg-white/5 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/40 transition-all" /></div>

                <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-bold text-white appearance-none focus:outline-none">
                  <option value="all" className="bg-[#0b1a3d]">Payments: All</option>
                  <option value="online" className="bg-[#0b1a3d]">Online Transfers</option>
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-bold text-white appearance-none focus:outline-none">
                  <option value="all" className="bg-[#0b1a3d]">Status: All</option>
                  <option value="0" className="bg-[#0b1a3d]">Placed</option>
                  <option value="1" className="bg-[#0b1a3d]">Accepted</option>
                  <option value="3" className="bg-[#0b1a3d]">Ready</option>
                  <option value="4" className="bg-[#0b1a3d]">Finalized</option>
                  <option value="6" className="bg-[#0b1a3d]">Refunded</option>
                </select>

                <div className="relative group/date">
                   <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-500/50 group-focus-within/date:text-yellow-400 transition-all pointer-events-none" size={14} />
                   <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3.5 pr-10 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/40 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                </div>
                
                <div className="relative group/date">
                   <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-500/50 group-focus-within/date:text-yellow-400 transition-all pointer-events-none" size={14} />
                   <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3.5 pr-10 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/40 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                </div>
              </div>

              {/* Orders Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {currentOrders.length > 0 ? (
                  currentOrders.map((order, i) => {
                    const status = statusConfig(order.order_status);
                    return (
                      <div key={i} className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] overflow-hidden hover:bg-[#0b1a3d]/80 transition-all shadow-2xl flex flex-col relative group">
                        {order.order_status === 0 && <div className="absolute top-0 inset-x-0 h-1 bg-amber-500 animate-pulse z-10"></div>}
                        <div className="p-6 border-b border-white/[0.05] flex justify-between items-start bg-white/[0.02]">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xl font-bold text-white tracking-tight truncate leading-none">{order.order_number}</h4>
                            <div className="text-xs font-medium text-white/30 tracking-wide mt-2">{new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • {order.items.length} Items</div>
                            {order.allergy_note && (
                              <div className="mt-3 inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                                <AlertCircle size={12} /> Food Allergy Alert
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${status.bg} ${status.color} ${status.border}`}>{status.text}</span>
                            <button onClick={() => setSelectedOrder(order)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-yellow-400 hover:scale-105 transition-all"><Eye size={16} /></button>
                          </div>
                        </div>
                        <div className="p-6 flex-1 space-y-4 max-h-48 overflow-y-auto custom-scrollbar border-b border-white/[0.05]">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-4">
                              <div className="flex gap-3 items-start min-w-0">
                                <span className="text-base font-bold text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-xl border border-yellow-500/20 shrink-0">{safeNumber(item.quantity)}<span className="text-[8px] ml-0.5 font-bold">X</span></span>
                                <span className="text-sm font-bold text-white mt-1 leading-snug truncate">{item.product_name}</span>
                              </div>
                              <span className="text-xs font-bold text-white/20 mt-1">£{safeNumber(item.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="p-6 bg-white/[0.01]">
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide ${order.instore === 1 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-purple-500/10 text-purple-400'}`}>{order.instore === 1 ? 'Instore' : 'Kerbside'}</span>
                              {order.takeaway_time && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide flex items-center gap-1">
                                  <Clock size={10} /> {order.takeaway_time}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-white/20 tracking-wide leading-none mb-1">Total</p>
                              <p className="text-2xl font-bold text-white tracking-tight leading-none">£{safeNumber(order.grand_total).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {order.order_status === 0 && (
                              <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setOrderForReady(order.order_number); setIsReadyModalOpen(true); }} className="py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold text-xs rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10">Accept</button>
                                <button onClick={() => updateOrderStatus(order.order_number, 2)} className="py-3.5 bg-white/5 border border-white/10 text-white font-bold text-xs rounded-xl hover:text-rose-500 transition-all">Reject</button>
                              </div>
                            )}
                            {order.order_status === 1 && <button onClick={() => updateOrderStatus(order.order_number, 3)} className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold text-sm rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"><ChefHat size={18} /> Mark Ready</button>}
                            {order.order_status === 3 && <button onClick={() => confirmCollection(order)} className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold text-sm rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"><PackageCheck size={18} /> Collected</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center bg-[#0b1a3d]/40 backdrop-blur-xl rounded-[2.5rem] border border-white/[0.08] shadow-2xl">
                    <ShoppingBag className="text-white/10 mb-6" size={80} strokeWidth={1} />
                    <h3 className="text-2xl font-bold text-white tracking-tight">No Active Orders</h3>
                    <p className="text-white font-medium mt-2">The transmission queue is currently empty.</p>
                  </div>
                )}
              </div>

              {/* Pagination Component */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mb-10 overflow-x-auto no-scrollbar py-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30">PREV</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button key={num} onClick={() => setCurrentPage(num)} className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all ${currentPage === num ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-[#071428] scale-110 shadow-xl' : 'bg-white/5 text-white/40 border border-white/10'}`}>{num}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30">NEXT</button>
                </div>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </div>

      <ReadyInModal isOpen={isReadyModalOpen} onClose={() => setIsReadyModalOpen(false)} onConfirm={(mins) => { if (orderForReady) { updateOrderStatus(orderForReady, 1, mins); setIsReadyModalOpen(false); setOrderForReady(null); } }} orderNumber={orderForReady} />
      <AnimatePresence>{selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}</AnimatePresence>
    </div>
  );
}

// src/pages/financemanagement/index.jsx
import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  PoundSterling, TrendingUp, TrendingDown, Wallet,
  Activity, ArrowUpRight, ArrowDownRight, Search,
  Calendar, FileText, History, CreditCard, RefreshCw, Loader2, Undo2, X, AlertCircle
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

// ─── Status helpers ──────────────────────────────────────────────────────────

const getOrderType = (status) => {
  const s = Number(status);
  if ([2, 5, 6, 7].includes(s)) return "Refund";
  return "Sales";
};

const getStatusLabel = (status) => {
  switch (Number(status)) {
    case 0: return { label: "Placed",    dot: "bg-amber-500",   text: "text-amber-400" };
    case 1: return { label: "Accepted",  dot: "bg-[#D0B079]",  text: "text-yellow-400" };
    case 2: return { label: "Rejected",  dot: "bg-rose-500",    text: "text-rose-400" };
    case 3: return { label: "Ready",     dot: "bg-purple-500",  text: "text-purple-400" };
    case 4: return { label: "Collected", dot: "bg-emerald-500", text: "text-emerald-400" };
    case 5: return { label: "Cancelled", dot: "bg-rose-600",    text: "text-rose-500" };
    case 6: return { label: "Refunded",  dot: "bg-blue-500",    text: "text-blue-400" };
    case 7: return { label: "Partial Refund", dot: "bg-indigo-500", text: "text-indigo-400" };
    default: return { label: "Unknown",  dot: "bg-white/20",    text: "text-white/40" };
  }
};

const getPaymentLabel = (mode) => {
  switch (Number(mode)) {
    case 0: return "Cash";
    case 1: return "Online";
    case 2: return "Wallet";
    default: return "—";
  }
};

const formatAmount = (val) =>
  Number(val || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── StatCard ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, color, icon: Icon, percentage, loading }) => (
  <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] p-6 shadow-2xl transition-all hover:bg-[#0b1a3d]/80 group">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-20 border border-white/5 shadow-inner`}>
        <Icon className="text-white" size={24} />
      </div>
      {typeof percentage === "number" && (
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${percentage > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
          {percentage > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(percentage)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-white text-sm font-semibold mb-2">Total {title}</p>
      <h3 className="text-3xl font-semibold text-white tracking-tight leading-none flex items-baseline gap-1">
        <span className="text-[#D0B079] text-lg">£</span>
        {loading ? <span className="text-white/30 text-xl animate-pulse">Loading...</span> : value}
      </h3>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceManagement = () => {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Data
  const [summary, setSummary] = useState({ gross_intake: 0, refund_outflow: 0, net_liquidity: 0 });
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (page === 1) setStatsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page,
        limit: LIMIT,
      });
      if (search) params.append("search", search);

      const res = await api.get(`/finance-summary?${params.toString()}`);
      if (res.data.status === 1) {
        const d = res.data.data;
        setSummary({
          gross_intake: d.gross_intake,
          refund_outflow: d.refund_outflow,
          net_liquidity: d.net_liquidity,
        });
        setTransactions(d.transactions || []);
        setPagination(d.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Finance fetch failed:", err);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [startDate, endDate, search, page]);

  const handleOpenRefundModal = (tx) => {
    const gross = Number(tx.gross_amount || 0);
    const refunded = Number(tx.refunded_amount || 0);
    const remaining = Number((gross - refunded).toFixed(2));
    
    setSelectedTx({ ...tx, remaining });
    setRefundAmountInput(remaining.toString());
    setRefundModalOpen(true);
  };

  const processRefund = async () => {
    if (!selectedTx) return;
    const amount = parseFloat(refundAmountInput);
    
    if (isNaN(amount) || amount <= 0) {
      showPopup({ title: "Invalid Amount", message: "Please enter an amount greater than zero.", type: "error" });
      return;
    }
    
    if (amount > selectedTx.remaining + 0.01) {
      showPopup({ title: "Amount Exceeded", message: `Cannot refund more than the remaining balance (£${selectedTx.remaining}).`, type: "error" });
      return;
    }

    try {
      setRefunding(true);
      const res = await api.post("/order/refund", { 
        order_number: selectedTx.order_number,
        amount: amount
      });
      
      if (res.data.status === 1) {
        showPopup({
          title: "Refund Successful",
          message: `Issued £${amount.toFixed(2)} refund for order #${selectedTx.order_number}.`,
          type: "success"
        });
        setRefundModalOpen(false);
        fetchData();
      } else {
        showPopup({ title: "Refund Failed", message: res.data.message || "Failed to process refund.", type: "error" });
      }
    } catch (err) {
      console.error("Refund error:", err);
      showPopup({ title: "System Error", message: err.response?.data?.message || "Something went wrong.", type: "error" });
    } finally {
      setRefunding(false);
    }
  };

  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchData();
    };
    window.addEventListener('dashboard-refresh', handleAutoRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleAutoRefresh);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-[#D0B079]/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-24 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 lg:py-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-10">

              {/* Page Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <Wallet className="text-yellow-400" size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-none drop-shadow-sm">Finance Management</h1>
                    <p className="text-white/70 mt-2 text-sm font-semibold italic">Monitoring the pulse of your business liquidity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="bg-transparent pl-8 pr-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                    <span className="text-white/20 text-xs">→</span>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="bg-transparent pl-8 pr-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => fetchData()}
                    className="p-2.5 bg-[#D0B079]/10 hover:bg-[#D0B079]/20 text-[#D0B079] rounded-xl transition-all border border-[#D0B079]/30 active:scale-90"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Gross Intake" value={formatAmount(summary.gross_intake)} color="bg-emerald-500" icon={TrendingUp} loading={statsLoading} />
                <StatCard title="Refund Outflow" value={formatAmount(summary.refund_outflow)} color="bg-rose-500" icon={TrendingDown} loading={statsLoading} />
                <StatCard title="Net Liquidity" value={formatAmount(summary.net_liquidity)} color="bg-[#D0B079]" icon={Activity} loading={statsLoading} />
              </div>

              {/* Transaction Stream */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                <div className="p-8 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/[0.02]">
                  <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                       <CreditCard className="text-[#D0B079]" size={20} /> Transactions
                    </h2>
                    <p className="text-white/70 text-xs font-semibold mt-1">
                      {loading ? "Fetching data..." : `${pagination.total} transaction${pagination.total !== 1 ? "s" : ""} found`}
                    </p>
                  </div>
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                    <div className="relative group/search">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-[#D0B079] transition-all" size={14} />
                      <input
                        type="search"
                        placeholder="Search order / customer..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D0B079]/40 w-full sm:w-64 transition-all"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-[#D0B079]/10 hover:bg-[#D0B079]/20 text-[#D0B079] text-xs font-semibold rounded-xl border border-[#D0B079]/30 transition-all">
                      Search
                    </button>
                  </form>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#0b1a3d]/80 text-white text-xs font-semibold">
                        <th className="px-8 py-5">Order ID</th>
                        <th className="px-8 py-5">Customer</th>
                        <th className="px-8 py-5">Date & Time</th>
                        <th className="px-8 py-5">Type</th>
                        <th className="px-8 py-5 text-right">Gross Total</th>
                        <th className="px-8 py-5 text-right">Net Intake</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {loading ? (
                        <tr><td colSpan={8} className="px-8 py-16 text-center text-white/30 uppercase tracking-widest text-[10px] font-bold">Loading transactions...</td></tr>
                      ) : transactions.length === 0 ? (
                        <tr><td colSpan={8} className="px-8 py-16 text-center text-white/30 uppercase tracking-widest text-[10px] font-bold">No records found</td></tr>
                      ) : (
                        transactions.map((tx) => {
                          const txType = getOrderType(tx.order_status);
                          const statusInfo = getStatusLabel(tx.order_status);
                          return (
                            <tr key={tx.order_number} className="hover:bg-white/[0.03] transition-colors group/row">
                              <td className="px-8 py-6">
                                <span className="text-sm font-semibold text-white tracking-tight">#{tx.order_number}</span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-semibold text-white/90">{tx.customer_name || "Guest"}</span>
                              </td>
                              <td className="px-8 py-6 text-xs text-white/60">
                                {new Date(tx.created_at).toLocaleDateString("en-GB")} {new Date(tx.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${txType === "Sales" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                  {txType}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-right font-medium text-white/40">£{formatAmount(tx.gross_amount)}</td>
                              <td className="px-8 py-6 text-right font-semibold text-white">£{formatAmount(tx.amount - (tx.refunded_amount || 0))}</td>
                              <td className="px-8 py-6">
                                <div className="flex items-center justify-center gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                  <span className={`text-xs font-semibold ${statusInfo.text}`}>{statusInfo.label}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                {Number(tx.order_status) !== 6 && Number(tx.order_status) !== 2 && Number(tx.order_status) !== 5 ? (
                                  <button
                                    onClick={() => handleOpenRefundModal(tx)}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/30 text-rose-500 rounded-lg border border-rose-500/20 transition-all active:scale-90"
                                  >
                                    <Undo2 size={14} />
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Settled</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 border-t border-white/[0.05] bg-black/20 flex items-center justify-between">
                  <div className="text-xs font-semibold text-white/40">Showing {transactions.length} entries</div>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs">Prev</button>
                    <button onClick={() => setPage(p => p+1)} disabled={page >= pagination.totalPages} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs">Next</button>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>

      <AnimatePresence>
        {refundModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefundModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-[#1a1c23] border border-white/[0.1] rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#071428] to-[#0d1f45]">
                <div>
                  <h3 className="text-2xl font-semibold text-white tracking-tight italic">Issue Refund</h3>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Order #{selectedTx?.order_number}</p>
                </div>
                <button onClick={() => setRefundModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-1">Gross Total</p>
                    <p className="text-xl font-semibold text-white italic">£{formatAmount(selectedTx?.gross_amount)}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-400/60 tracking-widest mb-1">Credits Applied</p>
                    <p className="text-xl font-semibold text-emerald-400/80 italic">£{formatAmount(selectedTx?.credit_amount)}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center font-bold">
                    <p className="text-[10px] uppercase text-rose-400 tracking-widest mb-1">Already Refunded</p>
                    <p className="text-xl font-semibold text-rose-500">£{formatAmount(selectedTx?.refunded_amount)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Refund Amount (£)</label>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Max: £{selectedTx?.remaining}</span>
                  </div>
                  <div className="relative">
                    <PoundSterling className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input
                      type="number"
                      autoFocus
                      step="0.01"
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-14 pr-8 text-3xl font-bold text-white tabular-nums focus:outline-none focus:border-[#D0B079]/40"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#D0B079]/5 rounded-2xl border border-[#D0B079]/10">
                    <AlertCircle className="text-[#D0B079] shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] font-medium text-[#D0B079] uppercase tracking-wider leading-relaxed">
                      Refunds are processed to the original payment method first (Stripe), then to the customer wallet.
                    </p>
                  </div>
                </div>

                <button
                  onClick={processRefund}
                  disabled={refunding}
                  className="w-full py-6 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {refunding ? <Loader2 className="animate-spin" size={18} /> : <span>Confirm Refund Transmission</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceManagement;

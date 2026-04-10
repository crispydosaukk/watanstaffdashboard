// src/pages/financemanagement/index.jsx
import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import {
  PoundSterling, TrendingUp, TrendingDown, Wallet,
  Activity, ArrowUpRight, ArrowDownRight, Search,
  Calendar, FileText, History, CreditCard, RefreshCw, Loader2, Undo2
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

// ─── Status helpers ──────────────────────────────────────────────────────────

const getOrderType = (status) => {
  const s = Number(status);
  if ([2, 5, 6].includes(s)) return "Refund";
  return "Sales";
};

const getStatusLabel = (status) => {
  switch (Number(status)) {
    case 0: return { label: "Placed",    dot: "bg-amber-500",   text: "text-amber-400" };
    case 1: return { label: "Accepted",  dot: "bg-yellow-500",  text: "text-yellow-400" };
    case 2: return { label: "Rejected",  dot: "bg-rose-500",    text: "text-rose-400" };
    case 3: return { label: "Ready",     dot: "bg-purple-500",  text: "text-purple-400" };
    case 4: return { label: "Collected", dot: "bg-emerald-500", text: "text-emerald-400" };
    case 5: return { label: "Cancelled", dot: "bg-rose-600",    text: "text-rose-500" };
    case 6: return { label: "Refunded",  dot: "bg-blue-500",    text: "text-blue-400" };
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
        <span className="text-yellow-500 text-lg">£</span>
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

  const handleRefund = async (order_number) => {
    if (!window.confirm(`Are you sure you want to refund order #${order_number}? This will initiate a Stripe refund if applicable and restore customer credits.`)) return;

    try {
      setLoading(true);
      const res = await api.post("/order/refund", { order_number });
      if (res.data.status === 1) {
        showPopup({
          title: "Refund Processed",
          message: `Order #${order_number} has been refunded successfully.`,
          type: "success"
        });
        fetchData(); // Refresh summary and list
      } else {
        showPopup({
          title: "Refund Failed",
          message: res.data.message || "Could not process refund.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("Refund error:", err);
      showPopup({
        title: "System Error",
        message: err.response?.data?.message || "Something went wrong while processing the refund.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDateApply = () => {
    setPage(1);
    fetchData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
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
                  {/* Date Range Filters */}
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
                    className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl transition-all border border-yellow-500/30 active:scale-90"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-semibold text-white transition-all flex items-center gap-2">
                    <FileText size={14} /> Export Report
                  </button>
                  <button className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-105 rounded-2xl text-xs font-semibold text-[#071428] shadow-xl shadow-yellow-500/20 transition-all flex items-center gap-2 active:scale-95">
                    <History size={14} /> Transaction History
                  </button>
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Gross Intake"
                  value={formatAmount(summary.gross_intake)}
                  color="bg-emerald-500"
                  icon={TrendingUp}
                  loading={statsLoading}
                />
                <StatCard
                  title="Refund Outflow"
                  value={formatAmount(summary.refund_outflow)}
                  color="bg-rose-500"
                  icon={TrendingDown}
                  loading={statsLoading}
                />
                <StatCard
                  title="Net Liquidity"
                  value={formatAmount(summary.net_liquidity)}
                  color="bg-yellow-500"
                  icon={Activity}
                  loading={statsLoading}
                />
              </div>

              {/* Transaction Stream */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                <div className="p-8 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/[0.02]">
                  <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                      <CreditCard className="text-yellow-500" size={20} /> Transactions
                    </h2>
                    <p className="text-white/70 text-xs font-semibold mt-1">
                      {loading ? "Fetching data..." : `${pagination.total} transaction${pagination.total !== 1 ? "s" : ""} found`}
                    </p>
                  </div>
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                    <div className="relative group/search">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-yellow-500 transition-all" size={14} />
                      <input
                        type="search"
                        placeholder="Search order / customer..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40 w-full sm:w-64 transition-all"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded-xl border border-yellow-500/30 transition-all">
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
                        <th className="px-8 py-5">Payment Mode</th>
                        <th className="px-8 py-5 text-right">Amount</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 opacity-40">
                              <Loader2 size={32} className="animate-spin text-yellow-400" />
                              <span className="text-xs font-semibold uppercase tracking-widest">Loading transactions...</span>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 opacity-30">
                              <CreditCard size={36} strokeWidth={1} />
                              <span className="text-xs font-semibold uppercase tracking-widest">No transactions found</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => {
                          const txType = getOrderType(tx.order_status);
                          const statusInfo = getStatusLabel(tx.order_status);
                          const createdAt = new Date(tx.created_at);
                          return (
                            <tr key={tx.order_number} className="hover:bg-white/[0.03] transition-colors group/row">
                              <td className="px-8 py-6">
                                <span className="text-sm font-semibold text-white group-hover/row:text-yellow-500 transition-colors tracking-tight">#{tx.order_number}</span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-semibold text-white/90">{tx.customer_name || "Guest"}</span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-white/80">{createdAt.toLocaleDateString("en-GB")}</span>
                                  <span className="text-[10px] text-white/40 font-semibold">{createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${txType === "Sales" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                  {txType}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-xs font-semibold text-white/60">{getPaymentLabel(tx.payment_mode)}</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <span className="text-lg font-semibold text-white tracking-tight">
                                  <span className="text-white/40 text-xs mr-1 font-semibold">£</span>
                                  {formatAmount(tx.amount)}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${statusInfo.dot}`} />
                                  <span className={`text-xs font-semibold ${statusInfo.text}`}>{statusInfo.label}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                {![2, 5, 6].includes(Number(tx.order_status)) ? (
                                  <button
                                    onClick={() => handleRefund(tx.order_number)}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/30 text-rose-500 rounded-lg border border-rose-500/20 transition-all flex items-center gap-2 mx-auto"
                                    title="Issue Full Refund"
                                  >
                                    <Undo2 size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Refund</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 italic">Settled</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer with pagination */}
                <div className="p-8 border-t border-white/[0.05] bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-xs font-semibold text-white/50">
                    Showing {transactions.length} of {pagination.total} transactions
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2.5 text-xs font-semibold text-white/40">
                      {page} / {pagination.totalPages || 1}
                    </span>
                    <button
                      disabled={page >= (pagination.totalPages || 1) || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Terminal Branding Footer */}
              <div className="py-12 flex flex-col items-center justify-center opacity-60">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/40"></div>
                  <div className="text-xs font-semibold text-white tracking-wide">ZingBite Finance</div>
                  <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/40"></div>
                </div>
                <p className="text-xs font-semibold text-yellow-500/80 tracking-wide max-w-sm text-center leading-relaxed">
                  "Architecture of growth is verified through every transmission"
                </p>
              </div>

            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default FinanceManagement;

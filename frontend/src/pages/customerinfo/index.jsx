// src/pages/customerinfo/index.jsx
import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api.js";
import {
  Users, Search, Phone, Mail, Gift, Wallet, Award, TrendingUp, Download, X, Eye, Calendar, User, ChevronRight
} from "lucide-react";

export default function CustomerInfo() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/customers");
        setCustomers(res.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.full_name?.toLowerCase() || "").includes(q) ||
      (c.mobile_number || "").includes(search) ||
      (c.email?.toLowerCase() || "").includes(q)
    );
  });

  const formatWallet = (value) => {
    const num = Number(value || 0);
    return `£${num.toFixed(2)}`;
  };

  const formatPhoneNumber = (countryCode, number) => {
    if (!number) return "—";
    const code = countryCode || "+44";
    return `${code} ${number}`;
  };

  const calculateRedeemable = (c) => {
    const pts = Number(c.loyalty_points || 0);
    const redeemPts = Number(c.loyalty_redeem_points || 10);
    const redeemVal = Number(c.loyalty_redeem_value || 1);
    const units = Math.floor(pts / redeemPts);
    const val = (units * redeemVal).toFixed(2);
    return `£${val}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const stats = {
    total: customers.length,
    totalWallet: customers.reduce((sum, c) => sum + Number(c.wallet_balance || 0), 0),
    totalLoyalty: customers.reduce((sum, c) => sum + Number(c.loyalty_points || 0), 0),
  };

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const CustomerCard = ({ c }) => (
    <div key={c.id} className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 shadow-2xl transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
          {getInitials(c.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-black text-white tracking-tight leading-tight truncate uppercase">{c.full_name}</h4>
          <p className="text-[9px] font-black text-white/30 truncate uppercase tracking-widest mt-0.5">{c.email || "NO EMAIL"}</p>
        </div>
        <button
          onClick={() => openCustomerDetails(c)}
          className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] rounded-xl shadow-xl active:scale-95 transition-all"
        >
          <Eye size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.05]">
        <div className="space-y-1">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Phone</p>
          <p className="text-[10px] font-bold text-white leading-none whitespace-nowrap">{formatPhoneNumber(c.country_code, c.mobile_number)}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Credits</p>
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[10px] font-black text-yellow-400 tracking-tight">{formatWallet(c.wallet_balance)}</span>
            <span className="text-[10px] font-black text-yellow-500 tracking-tight">({Number(c.loyalty_points || 0)} Pts)</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-16 min-h-0 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`flex-1 flex flex-col pt-16 lg:pt-20 min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-4 lg:pt-8 pb-12 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-8">

              {/* Page Header Area */}
              <div className="mb-8 space-y-8 -mt-10 sm:-mt-16">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <Users className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg leading-none">Customer Registry</h1>
                    <p className="text-white/40 mt-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] leading-none">View and manage restaurant customer profiles</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-3 bg-[#0b1a3d]/40 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-inner">
                  <div className="relative group flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={16} />
                    <input
                      placeholder="SEARCH CUSTOMERS..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-white placeholder-white/10 focus:outline-none focus:border-yellow-500/40 transition-all"
                    />
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0b1a3d]/40 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Total Nodes</p>
                        <p className="text-2xl font-black text-white tracking-tight">{stats.total}</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20"><Users size={20} className="text-yellow-400" /></div>
                    </div>
                  </div>
                  <div className="bg-[#0b1a3d]/40 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Global Credit</p>
                        <p className="text-2xl font-black text-yellow-400 tracking-tight">{formatWallet(stats.totalWallet)}</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20"><Wallet size={20} className="text-yellow-400" /></div>
                    </div>
                  </div>
                  <div className="bg-[#0b1a3d]/40 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Loyalty Index</p>
                        <p className="text-2xl font-black text-yellow-500 tracking-tight">{stats.totalLoyalty.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20"><Award size={20} className="text-yellow-500" /></div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="SCAN FOR NAME, MOBILE, OR EMAIL..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[1.5rem] pl-14 pr-6 py-4 text-[11px] font-black uppercase tracking-widest text-white placeholder-white/10 focus:outline-none focus:border-yellow-500/40 transition-all shadow-xl"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden mb-12">
                <div className="px-8 py-6 border-b border-white/[0.08] bg-white/5 flex justify-between items-center sm:px-10">
                  <h3 className="text-[11px] font-black text-white tracking-[0.3em] uppercase flex items-center gap-3">
                    <Users size={16} className="text-yellow-400" /> Customer List
                  </h3>
                  <button className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl transition-all flex items-center gap-2 active:scale-95">
                    <Download size={14} /> EXPORT CSV
                  </button>
                </div>

                {/* Desktop Registry */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0b1a3d]/60 text-white/40 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-5">#</th>
                        <th className="px-8 py-5">Customer Name</th>
                        <th className="px-8 py-5">Phone</th>
                        <th className="px-8 py-5">Wallet</th>
                        <th className="px-8 py-5">Points</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredCustomers.map((c, i) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-5 text-[10px] font-black text-white/20">#{i + 1}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-xl">
                                {getInitials(c.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-white tracking-tight uppercase leading-none">{c.full_name}</p>
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-1.5 leading-none truncate max-w-[150px]">{c.email || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-black text-white/80 tracking-tighter">
                            {formatPhoneNumber(c.country_code, c.mobile_number)}
                          </td>
                          <td className="px-8 py-5 text-sm font-black text-yellow-400">
                            {formatWallet(c.wallet_balance)}
                          </td>
                          <td className="px-8 py-5 text-sm font-black text-yellow-500">
                            {Number(c.loyalty_points || 0)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => openCustomerDetails(c)} className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl transition-all active:scale-95">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 sm:p-6 space-y-4">
                  {filteredCustomers.map((c) => (
                    <CustomerCard key={c.id} c={c} />
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="py-20 text-center uppercase tracking-widest text-white/20 text-[10px] font-black">
                      No Customers Found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>

      <AnimatePresence>
        {showModal && selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
              <div className="sticky top-0 z-10 p-8 border-b border-white/[0.08] bg-white/5 backdrop-blur-xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Identity Analysis</h3>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Classification Code: {selectedCustomer.id}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-10">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-white/[0.08]">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-black text-4xl shadow-2xl border-4 border-white/10">
                    {getInitials(selectedCustomer.full_name)}
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="text-2xl font-black text-white tracking-tight uppercase">{selectedCustomer.full_name}</h4>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                      <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-widest rounded-full">ACTIVE NODE</span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest rounded-full">EST. {new Date(selectedCustomer.created_at).getFullYear()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 flex items-center gap-2"><Phone size={10} className="text-yellow-400" /> Communication Hub</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Mobile String</p>
                        <p className="text-base font-black text-white mt-1">{formatPhoneNumber(selectedCustomer.country_code, selectedCustomer.mobile_number)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Virtual Endpoint</p>
                        <p className="text-base font-black text-white mt-1 truncate">{selectedCustomer.email || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 flex items-center gap-2"><Calendar size={10} className="text-yellow-400" /> Chronology</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Birth Sequence</p>
                        <p className="text-base font-black text-white mt-1">{selectedCustomer.date_of_birth ? new Date(selectedCustomer.date_of_birth).toLocaleDateString('en-GB') : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Gender Profile</p>
                        <p className="text-base font-black text-white mt-1 uppercase">{selectedCustomer.gender || "UNASSIGNED"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-2"><Wallet size={10} className="text-yellow-400" /> Global Assets</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <p className="text-[9px] font-black text-yellow-400/40 uppercase tracking-widest mb-1">Liquid Balance</p>
                      <p className="text-2xl font-black text-yellow-400 leading-none">{formatWallet(selectedCustomer.wallet_balance)}</p>
                    </div>
                    <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <p className="text-[9px] font-black text-yellow-500/40 uppercase tracking-widest mb-1">Loyalty Power</p>
                      <p className="text-2xl font-black text-yellow-500 leading-none">{Number(selectedCustomer.loyalty_points || 0)}</p>
                    </div>
                    <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <p className="text-[9px] font-black text-yellow-400/40 uppercase tracking-widest mb-1">Redeem Value</p>
                      <p className="text-2xl font-black text-yellow-400 leading-none">{calculateRedeemable(selectedCustomer)}</p>
                    </div>
                  </div>
                </div>

                {selectedCustomer.referral_code && (
                  <div className="p-5 bg-gradient-to-r from-[#0b1a3d] to-white/5 border border-white/[0.08] rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Viral Referral Link</p>
                      <p className="text-lg font-black text-yellow-400 tracking-[0.2em]">{selectedCustomer.referral_code}</p>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-xl"><Gift size={20} className="text-yellow-400" /></div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

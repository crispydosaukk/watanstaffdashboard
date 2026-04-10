// src/pages/financemanagement/index.jsx
import React, { useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { 
  PoundSterling, TrendingUp, TrendingDown, Wallet, 
  Activity, ArrowUpRight, ArrowDownRight, Search, 
  Calendar, FileText, History, PieChart, CreditCard 
} from "lucide-react";

const StatCard = ({ title, value, color, icon: Icon, trend, percentage }) => (
  <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] p-6 shadow-2xl transition-all hover:bg-[#0b1a3d]/80 group">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-20 border border-white/5 shadow-inner`}>
        <Icon className={`${color.replace('bg-', 'text-')}`} size={24} />
      </div>
      {percentage && (
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${percentage > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {percentage > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(percentage)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-white text-sm font-semibold mb-2">Total {title}</p>
      <h3 className="text-3xl font-semibold text-white tracking-tight leading-none flex items-baseline gap-1">
        <span className="text-yellow-500 text-lg">£</span>
        {value}
      </h3>
    </div>
  </div>
);

const FinanceManagement = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dummyTransactions] = useState([
    { id: "TX-9901", customer: "John Doe", amount: 1540.50, type: "Sales", status: "Settled", date: "2024-03-15", time: "14:20" },
    { id: "TX-9842", customer: "Sarah Smith", amount: 250.00, type: "Sales", status: "Settled", date: "2024-03-15", time: "12:05" },
    { id: "TX-9721", customer: "Michael Chen", amount: 120.00, type: "Refund", status: "Processed", date: "2024-03-14", time: "18:40" },
    { id: "TX-9654", customer: "Emily Davis", amount: 890.25, type: "Sales", status: "Pending", date: "2024-03-14", time: "09:12" },
    { id: "TX-9510", customer: "Robert Brown", amount: 45.00, type: "Refund", status: "Processed", date: "2024-03-13", time: "11:30" },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-24 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 lg:py-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-10">
              
              {/* Page Header Area */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <Wallet className="text-yellow-400" size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-none drop-shadow-sm">Financial Management</h1>
                    <p className="text-white/70 mt-2 text-sm font-semibold italic">Monitoring the pulse of your business liquidity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-semibold text-white transition-all flex items-center gap-2">
                    <FileText size={14} /> Export manifest
                  </button>
                  <button className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:scale-105 rounded-2xl text-xs font-semibold text-[#071428] shadow-xl shadow-yellow-500/20 transition-all flex items-center gap-2 active:scale-95">
                    <History size={14} /> Audit trail
                  </button>
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Gross Intake" 
                  value="4,25,890.00" 
                  color="bg-emerald-500" 
                  percentage={12.4}
                  icon={TrendingUp}
                />
                <StatCard 
                  title="Refund Outflow" 
                  value="12,450.00" 
                  color="bg-rose-500" 
                  percentage={-4.2}
                  icon={TrendingDown}
                />
                <StatCard 
                  title="Net Liquidity" 
                  value="3,28,240.00" 
                  color="bg-yellow-500" 
                  percentage={18.9}
                  icon={Activity}
                />
              </div>

              {/* Transaction Stream */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                <div className="p-8 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/[0.02]">
                  <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                      <CreditCard className="text-yellow-500" size={20} /> Transaction manifest
                    </h2>
                    <p className="text-white/70 text-xs font-semibold mt-1">Real-time data transmission protocol</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative group/search">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-yellow-500 transition-all" size={14} />
                      <input 
                        type="search" 
                        placeholder="Search TXN ID..." 
                        className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40 w-full sm:w-64 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#0b1a3d]/80 text-white text-xs font-semibold">
                        <th className="px-8 py-5">Node ID</th>
                        <th className="px-8 py-5">Client</th>
                        <th className="px-8 py-5">Timestamp</th>
                        <th className="px-8 py-5">Classification</th>
                        <th className="px-8 py-5 text-right">Value</th>
                        <th className="px-8 py-5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {dummyTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors group/row">
                          <td className="px-8 py-6">
                            <span className="text-sm font-semibold text-white group-hover/row:text-yellow-500 transition-colors tracking-tight">#{tx.id}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-semibold text-white/90">{tx.customer}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-white/80">{tx.date}</span>
                              <span className="text-[10px] text-white/40 font-semibold">{tx.time} UTC</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              tx.type === 'Sales' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-lg font-semibold text-white tracking-tight">
                              <span className="text-white/40 text-xs mr-1 font-semibold">£</span>
                              {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${
                                tx.status === 'Settled' ? 'bg-emerald-500' : tx.status === 'Processed' ? 'bg-blue-500' : 'bg-amber-500 shadow-amber-500/50'
                              }`} />
                              <span className="text-xs font-semibold text-white/80">{tx.status}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 border-t border-white/[0.05] bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="text-xs font-semibold text-white/50">Stream density: 05 nodes manifested</div>
                   <div className="flex gap-2">
                      <button className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all">Previous block</button>
                      <button className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all">Next block</button>
                   </div>
                </div>
              </div>

              {/* Terminal Branding Footer */}
              <div className="py-12 flex flex-col items-center justify-center opacity-60">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/40"></div>
                  <div className="text-xs font-semibold text-white tracking-wide">Hi welcome to it</div>
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

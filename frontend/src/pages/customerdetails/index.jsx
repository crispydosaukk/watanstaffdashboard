import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, RefreshCw, Phone, Mail, ShoppingBag, CheckCircle,
    TrendingUp, Calendar, Loader2, UserCheck, Eye, X
} from "lucide-react";

const CustomerDetails = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const customersPerPage = 10;
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/customers/by-user");
            setCustomers(res.data || []);
            setError(null);
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError("Failed to load customer details");
        } finally {
            setLoading(false);
        }
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
        active: customers.filter(c => Number(c.live_orders) > 0).length,
        totalOrders: customers.reduce((sum, c) => sum + Number(c.total_orders || 0), 0),
    };

    // Pagination logic
    const indexOfLastCustomer = currentPage * customersPerPage;
    const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
    const currentCustomers = customers.slice(indexOfFirstCustomer, indexOfLastCustomer);
    const totalPages = Math.ceil(customers.length / customersPerPage);

    const openCustomerDetails = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30">
            <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-h-screen pt-20 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
                <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
                    <div className="max-w-7xl mx-auto">

                        {/* Page Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mb-8"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                    <div className="p-2.5 sm:p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] flex-shrink-0">
                                        <UserCheck className="text-yellow-400" size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-2xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-lg truncate whitespace-nowrap">Customer Details</h1>
                                        <p className="text-white/60 mt-2 text-sm font-medium tracking-wide whitespace-nowrap">View customers who have ordered from you</p>
                                    </div>
                                </div>
                                <button
                                    onClick={fetchCustomers}
                                    disabled={loading}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white font-black tracking-widest text-[16px] rounded-xl border border-white/[0.08] shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                    Refresh
                                </button>
                            </div>

                            {/* Stats Cards - Glassmorphism */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                                <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-2xl transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium tracking-wide text-white mb-1">Total Customers</p>
                                            <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg tracking-tight">{stats.total}</p>
                                        </div>
                                        <div className="p-3 bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-500/20">
                                            <Users className="text-yellow-400" size={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-2xl transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium tracking-wide text-white mb-1">Active Orders</p>
                                            <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg tracking-tight">{stats.active}</p>
                                        </div>
                                        <div className="p-3 bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-500/20">
                                            <TrendingUp className="text-yellow-400" size={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-2xl transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium tracking-wide text-white mb-1">Total Orders</p>
                                            <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg tracking-tight">{stats.totalOrders}</p>
                                        </div>
                                        <div className="p-3 bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-500/20">
                                            <ShoppingBag className="text-yellow-400" size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-500/10 backdrop-blur-md text-red-200 p-4 rounded-xl border border-red-500/20 flex items-center gap-2 text-sm shadow-lg font-black uppercase tracking-widest">
                                <span className="font-black">{error}</span>
                            </div>
                        )}

                        {/* Table Container - Glassmorphism */}
                        <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden">

                            {/* Table Header */}
                            <div className="px-8 py-6 flex items-center justify-between border-b border-white/[0.08] bg-white/5">
                                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-3">
                                    <Users size={18} className="text-yellow-400" />
                                    Customer List ({customers.length})
                                </h2>
                            </div>

                            {/* Desktop Table View */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/10">
                                    <thead className="bg-[#0b1a3d]/40 text-white text-sm font-black tracking-wide">
                                        <tr>
                                            <th className="px-8 py-5 text-left border-b border-white/[0.08]">#</th>
                                            <th className="px-8 py-5 text-left border-b border-white/[0.08]">Customer</th>
                                            <th className="px-8 py-5 text-left border-b border-white/[0.08]">Contact</th>
                                            <th className="px-8 py-5 text-center border-b border-white/[0.08]">Live Orders</th>
                                            <th className="px-8 py-5 text-center border-b border-white/[0.08]">Total Orders</th>
                                            <th className="px-8 py-5 text-center border-b border-white/[0.08]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center text-white">
                                                        <Loader2 className="animate-spin text-yellow-400 mb-4" size={40} />
                                                        <span className="text-white font-bold tracking-wide text-sm">Loading Customers...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : customers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-20 text-center">
                                                    <Users size={64} className="mx-auto text-white/10 mb-4" />
                                                    <p className="text-white font-bold tracking-wide text-sm">No Customers Found</p>
                                                    <p className="text-xs text-white/60 mt-2 font-medium tracking-wide">Customers will appear here once they place orders</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentCustomers.map((customer, idx) => (
                                                <motion.tr
                                                    key={customer.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className="hover:bg-white/5 transition-colors duration-200"
                                                >
                                                    <td className="px-8 py-6 text-xs font-medium text-white/30">
                                                        #{customer.id}
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-xl">
                                                                {getInitials(customer.full_name)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white tracking-tight leading-none">{customer.full_name || "-"}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1.5">
                                                            {customer.email && (
                                                                <div className="flex items-center gap-2 text-sm text-white/80 font-medium tracking-tight">
                                                                    <Mail size={14} className="text-yellow-400" />
                                                                    <span>{customer.email}</span>
                                                                </div>
                                                            )}
                                                            {customer.mobile_number && (
                                                                <div className="flex items-center gap-2 text-sm text-white/80 font-medium tracking-tight">
                                                                    <Phone size={14} className="text-yellow-400" />
                                                                    <span>{customer.mobile_number}</span>
                                                                </div>
                                                            )}
                                                            {!customer.email && !customer.mobile_number && (
                                                                <span className="text-white/20 text-sm font-medium tracking-wide">-</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6 text-center">
                                                        {Number(customer.live_orders) > 0 ? (
                                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse backdrop-blur-md">
                                                                <TrendingUp size={12} />
                                                                {customer.live_orders} Active
                                                            </span>
                                                        ) : (
                                                            <span className="text-white/20 text-sm font-medium">-</span>
                                                        )}
                                                    </td>

                                                    <td className="px-8 py-6 text-center">
                                                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md">
                                                            <ShoppingBag size={14} />
                                                            {customer.total_orders || 0}
                                                        </span>
                                                    </td>

                                                    <td className="px-8 py-6 text-center">
                                                        <button
                                                            onClick={() => openCustomerDetails(customer)}
                                                            className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold text-xs rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                                        >
                                                            <Eye size={14} />
                                                            View Details
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!loading && customers.length > customersPerPage && (
                                <div className="px-6 py-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between bg-white/5 backdrop-blur-md gap-4">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-white/40 text-center sm:text-left">
                                        Showing <span className="text-white">{indexOfFirstCustomer + 1}</span> to <span className="text-white">{Math.min(indexOfLastCustomer, customers.length)}</span> of <span className="text-white">{customers.length}</span> customers
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white bg-white/5 border border-white/[0.08] rounded-xl hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all backdrop-blur-md"
                                        >
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-9 h-9 flex items-center justify-center text-[11px] font-black rounded-xl transition-all backdrop-blur-md ${currentPage === page
                                                        ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                                                        : 'text-white/40 bg-white/5 border border-white/[0.08] hover:bg-white/10 hover:text-white'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white bg-white/5 border border-white/[0.08] rounded-xl hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all backdrop-blur-md"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            {/* Customer Details Modal - Glassmorphism */}
            <AnimatePresence>
                {showModal && selectedCustomer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0b1a3d] border border-white/[0.08] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="bg-white/5 backdrop-blur-md px-6 py-5 flex items-center justify-between sticky top-0 z-10 border-b border-white/[0.08]">
                                <h3 className="text-xl font-bold text-white tracking-tight">Customer Details</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/[0.08]"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8">
                                {/* Customer Header */}
                                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-white/[0.08]">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-black text-3xl shadow-xl">
                                        {getInitials(selectedCustomer.full_name)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-white tracking-tight">{selectedCustomer.full_name}</h4>
                                        <p className="text-xs font-medium text-white tracking-wide mt-1">Classification Code: #{selectedCustomer.id}</p>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-10">
                                    <h5 className="text-xs font-bold tracking-wide text-white mb-6 uppercase flex items-center gap-2"><Phone size={12} className="text-yellow-500" /> Communication Details</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {selectedCustomer.mobile_number && (
                                            <div className="p-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                                                <p className="text-xs font-medium text-white tracking-wide">Mobile Number</p>
                                                <p className="text-base font-bold text-white mt-1">{selectedCustomer.mobile_number}</p>
                                            </div>
                                        )}
                                        {selectedCustomer.email && (
                                            <div className="p-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                                                <p className="text-xs font-medium text-white tracking-wide">Customer Email</p>
                                                <p className="text-base font-bold text-white mt-1 truncate">{selectedCustomer.email}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Order Statistics */}
                                <div className="mb-10">
                                    <h5 className="text-xs font-bold tracking-wide text-white mb-6 uppercase flex items-center gap-2"><ShoppingBag size={12} className="text-yellow-500" /> Assets & Activity</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                                            <p className="text-xs font-medium text-white tracking-wide mb-1">Live Ops</p>
                                            <p className="text-2xl font-bold text-yellow-500 leading-none">{Number(selectedCustomer.live_orders || 0)}</p>
                                        </div>
                                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                            <p className="text-xs font-medium text-white tracking-wide mb-1">Completed</p>
                                            <p className="text-2xl font-bold text-blue-400 leading-none">{Number(selectedCustomer.completed_orders || 0)}</p>
                                        </div>
                                        <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                                            <p className="text-xs font-medium text-white tracking-wide mb-1">Total Payload</p>
                                            <p className="text-2xl font-bold text-yellow-600 leading-none">{Number(selectedCustomer.total_orders || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Info */}
                                <div className="pt-6 border-t border-white/[0.08]">
                                    <div className="flex items-center justify-between text-xs font-medium tracking-wide text-white">
                                        <span>Last Seen</span>
                                        <span className="text-white/60">
                                            {selectedCustomer.last_seen ? new Date(selectedCustomer.last_seen).toLocaleDateString('en-GB') : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomerDetails;

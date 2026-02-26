import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, X, Search, Check } from "lucide-react";
import api from "../../api.js";

/**
 * DateTimeRangeModal
 * Allows user to:
 * 1. Select a date range
 * 2. Select specific customers from a dropdown
 * 3. Specify a time range (HH:MM format)
 * 4. Apply filters to dashboard
 */
const DateTimeRangeModal = ({ isOpen, onClose, onApplyFilters }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Initialize with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, [isOpen]);

  // Fetch customers on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/by-user');
      if (Array.isArray(res.data)) {
        setCustomers(res.data);
      } else if (res.data.status === 1) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const handleApplyFilters = () => {
    onApplyFilters({
      startDate,
      endDate,
      customerIds: selectedCustomers.map(c => c.id).join(','),
      startTime,
      endTime
    });
    onClose();
  };

  const toggleCustomer = (customer) => {
    setSelectedCustomers(prev => {
      const exists = prev.find(c => c.id === customer.id);
      if (exists) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const filteredCustomers = customers.filter(c => {
    const name = (c.full_name || c.customer_name || '').toLowerCase();
    const email = (c.email || c.customer_email || '').toLowerCase();
    const phone = (c.mobile_number || c.customer_phone || '').toLowerCase();
    const search = customerSearch.toLowerCase();
    
    return name.includes(search) || email.includes(search) || phone.includes(search);
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-8 py-6 flex justify-between items-center border-b border-white/10">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
              <Calendar size={28} className="text-emerald-400" /> Filter Dashboard
            </h3>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-widest">Select date, customers, and time range</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all border border-white/5"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="space-y-6">

            {/* Date Range Section */}
            <div>
              <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Time Range Section */}
            <div>
              <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest flex items-center gap-2">
                <Clock size={18} /> Time Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">From Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">To Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Customers Section */}
            <div>
              <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest">
                Customers (Optional)
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus-within:border-emerald-500 focus-within:bg-white/20 transition-all">
                  <Search size={18} className="text-white/40" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none text-sm"
                  />
                </div>

                {/* Customer Dropdown */}
                <AnimatePresence>
                  {showCustomerDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#252a33] border border-white/10 rounded-xl shadow-xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar"
                    >
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => toggleCustomer(customer)}
                            className="w-full px-4 py-3 hover:bg-white/10 transition-all text-left border-b border-white/5 last:border-b-0 flex items-center justify-between group"
                          >
                            <div className="flex-1">
                              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                                {customer.full_name || customer.customer_name}
                              </p>
                              <p className="text-white/50 text-xs mt-0.5">
                                {customer.email || customer.customer_email || 'No email'}
                              </p>
                            </div>
                            {selectedCustomers.find(c => c.id === customer.id) && (
                              <div className="ml-2 p-1 bg-emerald-500/20 rounded-lg">
                                <Check size={16} className="text-emerald-400" />
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <p className="text-white/40 text-sm">No customers found</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Customers Tags */}
                {selectedCustomers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg"
                      >
                        <span className="text-white text-xs font-semibold">
                          {customer.full_name || customer.customer_name}
                        </span>
                        <button
                          onClick={() => toggleCustomer(customer)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 p-8 border-t border-white/10 flex justify-between items-center gap-4">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all font-bold text-sm uppercase tracking-widest border border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-900/40 active:scale-95"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DateTimeRangeModal;

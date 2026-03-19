import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, Save, CreditCard, Gift, ShoppingCart,
  Percent, Clock, AlertCircle, Users, Wallet, Award, Calendar, Coins, ShieldCheck, Loader2
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

export default function Settings() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [form, setForm] = useState({
    signup_bonus_amount: "",
    referral_bonus_amount: "",
    minimum_order: "",
    minimum_cart_total: "",
    earn_per_order_amount: "",

    // ✅ Loyalty dynamic settings
    loyalty_points_per_gbp: "",
    loyalty_redeem_points: "",
    loyalty_redeem_value: "",
    loyalty_available_after_hours: "",
    loyalty_expiry_days: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- LOAD EXISTING SETTINGS ----------
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");

      if (res.data?.status === 1 && res.data.data) {
        const s = res.data.data;

        setForm({
          signup_bonus_amount: s.signup_bonus_amount ?? "",
          referral_bonus_amount: s.referral_bonus_amount ?? "",
          minimum_order: s.minimum_order ?? "",
          minimum_cart_total: s.minimum_cart_total ?? "",
          earn_per_order_amount: s.earn_per_order_amount ?? "",

          loyalty_points_per_gbp: s.loyalty_points_per_gbp ?? "",
          loyalty_redeem_points: s.loyalty_redeem_points ?? "",
          loyalty_redeem_value: s.loyalty_redeem_value ?? "",
          loyalty_available_after_hours: s.loyalty_available_after_hours ?? "",
          loyalty_expiry_days: s.loyalty_expiry_days ?? "",
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- SAVE (INSERT or UPDATE) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const res = await api.post("/settings", form);

      if (res.data?.status === 1) {
        const s = res.data.data;

        setForm({
          signup_bonus_amount: s.signup_bonus_amount ?? "",
          referral_bonus_amount: s.referral_bonus_amount ?? "",
          minimum_order: s.minimum_order ?? "",
          minimum_cart_total: s.minimum_cart_total ?? "",
          earn_per_order_amount: s.earn_per_order_amount ?? "",

          loyalty_points_per_gbp: s.loyalty_points_per_gbp ?? "",
          loyalty_redeem_points: s.loyalty_redeem_points ?? "",
          loyalty_redeem_value: s.loyalty_redeem_value ?? "",
          loyalty_available_after_hours: s.loyalty_available_after_hours ?? "",
          loyalty_expiry_days: s.loyalty_expiry_days ?? "",
        });

        showPopup({
          title: "Settings Updated",
          message: "Global configuration has been saved successfully.",
          type: "success"
        });
      } else {
        showPopup({
          title: "Save Failed",
          message: res.data?.message || "Could not save settings. Please try again.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("Save settings error:", err);
      showPopup({
        title: "System Error",
        message: "Something went wrong while saving settings.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-20 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-6 overflow-hidden">
                <div className="p-2.5 sm:p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] flex-shrink-0">
                  <SettingsIcon className="text-yellow-400" size={24} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg truncate whitespace-nowrap">Global Settings</h1>
                  <p className="text-white/60 mt-1 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden text-ellipsis">Configure bonuses, order rules, and loyalty rewards</p>
                </div>
              </div>

              {/* MAIN FORM */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-6 sm:p-10 shadow-2xl border border-white/[0.08]">
                {loading ? (
                   <div className="text-center py-20 text-white flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-yellow-400" size={40} />
                    <span className="text-xs font-black uppercase tracking-widest animate-pulse">Loading Configuration...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-12">

                    {/* SECTION 1: CUSTOMER REWARDS & BONUSES */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                        <Gift className="text-yellow-500" size={24} />
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Customer Rewards & Bonuses</h3>
                          <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-1">Credits and earnings for customer acquisition and retention</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Signup Bonus Amount */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Signup Bonus (£)</label>
                          <div className="relative group">
                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="signup_bonus_amount"
                              value={form.signup_bonus_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Referral Bonus Amount */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Referral Bonus (£)</label>
                          <div className="relative group">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="referral_bonus_amount"
                              value={form.referral_bonus_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Earn Per Order Amount */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Earn Per Order (£)</label>
                          <div className="relative group">
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="earn_per_order_amount"
                              value={form.earn_per_order_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: ORDER CONSTRAINTS */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                        <ShieldCheck className="text-yellow-400" size={24} />
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Order Constraints</h3>
                          <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-1">Rules for order eligibility and checkout validation</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Minimum Order */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Minimum Order for Rewards (£)</label>
                          <div className="relative group">
                            <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="minimum_order"
                              value={form.minimum_order}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Minimum Cart Total */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Minimum Final Checkout Total (£)</label>
                          <div className="relative group">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="minimum_cart_total"
                              value={form.minimum_cart_total}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: LOYALTY PROGRAM */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                        <Award className="text-yellow-500" size={24} />
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Loyalty Program Dynamics</h3>
                          <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-1">Points calculation and redemption rules for repeat customers</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Loyalty Points Per GBP */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Points Earned Per £1</label>
                          <div className="relative group">
                            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="loyalty_points_per_gbp"
                              value={form.loyalty_points_per_gbp}
                              onChange={handleChange}
                              placeholder="1"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Loyalty Redeem Points */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Points Needed to Redeem</label>
                          <div className="relative group">
                            <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="1"
                              name="loyalty_redeem_points"
                              value={form.loyalty_redeem_points}
                              onChange={handleChange}
                              placeholder="10"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Loyalty Redeem Value */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1">Value Per Redemption (£)</label>
                          <div className="relative group">
                            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="loyalty_redeem_value"
                              value={form.loyalty_redeem_value}
                              onChange={handleChange}
                              placeholder="1.00"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Loyalty Available After (Hours) */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1 flex items-center gap-2">
                             Available After (Hours)
                          </label>
                          <div className="relative group">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="1"
                              name="loyalty_available_after_hours"
                              value={form.loyalty_available_after_hours}
                              onChange={handleChange}
                              placeholder="24"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Loyalty Expiry Days */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-white ml-1 flex items-center gap-2">
                             Points Expiry (Days)
                          </label>
                          <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="1"
                              name="loyalty_expiry_days"
                              value={form.loyalty_expiry_days}
                              onChange={handleChange}
                              placeholder="30"
                              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-10 border-t border-white/[0.08]">
                      <div className="flex items-start gap-4 max-w-xl text-[11px] font-black uppercase tracking-[0.2em] text-white/30 italic">
                        <AlertCircle className="shrink-0 text-yellow-500" size={18} />
                        <p>Changes apply immediately to all transactions. Please verify values before saving.</p>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:shadow-yellow-500/20 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.08]"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Save size={20} className="font-bold" />
                            Commit Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

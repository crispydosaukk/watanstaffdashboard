import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, CheckCircle } from "lucide-react";

const ReadyInModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
    const [minutes, setMinutes] = useState("");
    const [error, setError] = useState("");

    const handleConfirm = () => {
        const mins = parseInt(minutes);
        if (!mins || mins <= 0) {
            setError("Please enter a valid time");
            return;
        }
        onConfirm(mins);
        setMinutes("");
        setError("");
    };

    const quickTimes = [5, 10, 15, 20, 30, 45];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/[0.08] bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#D0B079]/10 rounded-xl border border-[#D0B079]/20 text-[#D0B079] shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    <Clock size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-black text-lg uppercase tracking-tight">Preparation Time</h3>
                                    <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-black">Transmission ID: #{orderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all shadow-inner"
                                id="close_ready_modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <div className="mb-8">
                                <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-4 text-center">Ready in how many minutes?</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={minutes}
                                        onChange={(e) => {
                                            setMinutes(e.target.value);
                                            if (error) setError("");
                                        }}
                                        placeholder="00"
                                        className={`w-full bg-white/[0.03] border-2 ${error ? 'border-rose-500/50' : 'border-white/[0.08]'} rounded-2xl px-5 py-6 text-white text-4xl font-black placeholder-white/10 focus:outline-none focus:border-[#D0B079]/40 transition-all text-center tracking-tighter shadow-inner`}
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                                        id="ready_minutes_input"
                                    />
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-white/10 font-black uppercase tracking-[0.3em] text-[10px] pointer-events-none">
                                        Mins
                                    </div>
                                </div>
                                {error && <p className="text-rose-400 text-[10px] mt-3 font-black uppercase tracking-widest text-center">{error}</p>}
                            </div>

                            {/* Quick Select */}
                            <div className="grid grid-cols-3 gap-3">
                                {quickTimes.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setMinutes(t.toString());
                                            setError("");
                                        }}
                                        className={`py-4 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${minutes === t.toString()
                                                ? 'bg-gradient-to-r from-[#D0B079] to-[#b8965f] border-transparent text-[#071428] scale-105'
                                                : 'bg-white/5 border-white/[0.05] text-white/40 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {t} Min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-white/5 border-t border-white/[0.08] flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 px-6 text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-[2] py-4 px-6 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/10"
                                id="confirm_ready_time"
                            >
                                <CheckCircle size={18} />
                                Accept Order
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReadyInModal;

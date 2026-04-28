import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js";
import {
  Store, MapPin, Phone, Mail, X, Clock, Plus, Trash2, Save,
  Calendar, Loader2, Shield
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", className = "", required = false, id }) => (
  <div className={`space-y-2 group ${className}`}>
    <label className="text-sm font-medium tracking-wide text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
      {Icon && <Icon size={12} className="text-[#D0B079]" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#D0B079]/20 focus:border-[#D0B079]/40 transition-all text-base"
      />
    </div>
  </div>
);

export default function Restuarent() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [info, setInfo] = useState({
    restaurant_name: "",
    company_name: "",
    address: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
  });

  const [timings, setTimings] = useState([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRestaurant(); }, []);

  // Initialize Google Places Autocomplete for the address field
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) return;

    const loadAutocomplete = () => {
      const input = document.getElementById("restaurant_address_autocomplete");
      if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setInfo(prev => ({
            ...prev,
            address: place.formatted_address,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng()
          }));
        }
      });
    };

    // Helper to load script if not already present
    if (!document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.id = "google-maps-script";
      script.async = true;
      script.onload = loadAutocomplete;
      document.head.appendChild(script);
    } else {
      // Script already exists, but might not be fully loaded or places lib might be missing
      if (window.google && window.google.maps && window.google.maps.places) {
        loadAutocomplete();
      } else {
        const script = document.getElementById("google-maps-script");
        const oldOnload = script.onload;
        script.onload = () => {
          if (oldOnload) oldOnload();
          loadAutocomplete();
        };
      }
    }
  }, []);

  const onInfoChange = (k) => (e) => setInfo((p) => ({ ...p, [k]: e.target.value }));

  function normalizeDay(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const day = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return WEEKDAYS.includes(day) ? day : null;
  }

  const isWeekdayPresent = (d) => timings.some((t) => normalizeDay(t.day) === normalizeDay(d));

  const handleAddManual = () => {
    const present = new Set(timings.map((t) => normalizeDay(t.day)));
    const missing = WEEKDAYS.find((d) => !present.has(d));
    if (!missing) return;
    setTimings((prev) =>
      [...prev, { id: uuidv4(), day: missing, start: "", end: "", is_active: true }]
        .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
    );
  };

  const changeDay = (id, newDayRaw) => {
    const newDay = normalizeDay(newDayRaw);
    if (!newDay || isWeekdayPresent(newDay)) return;
    updateTiming(id, { day: newDay });
    setTimings((prev) => prev.slice().sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)));
  };

  const updateTiming = (id, changes) => setTimings((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  const removeTiming = (id) => setTimings((prev) => prev.filter((t) => t.id !== id));

  function frontendToApiPayload() {
    const toSqlTime = (s) => (!s ? null : /^\d{1,2}:\d{2}$/.test(s) ? s + ":00" : s);

    return {
      restaurant_name: info.restaurant_name || null,
      company_name: info.company_name || null,
      restaurant_address: info.address || null,
      restaurant_phonenumber: info.phone || null,
      restaurant_email: info.email || null,
      latitude: info.latitude || null,
      longitude: info.longitude || null,
      timings: timings.map((t) => ({
        day: t.day,
        opening_time: toSqlTime(t.start),
        closing_time: toSqlTime(t.end),
        is_active: !!t.is_active
      }))
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) return;

    setInfo({
      restaurant_name: restaurant.restaurant_name ?? "",
      company_name: restaurant.company_name ?? "",
      address: restaurant.restaurant_address ?? "",
      phone: restaurant.restaurant_phonenumber ?? "",
      email: restaurant.restaurant_email ?? "",
      latitude: restaurant.latitude ?? "",
      longitude: restaurant.longitude ?? "",
    });

    if (restaurant.timings?.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: uuidv4(),
          day: t.day,
          start: t.opening_time?.substring(0, 5) || "",
          end: t.closing_time?.substring(0, 5) || "",
          is_active: !!t.is_active
        }))
      );
    }
  }

  async function loadRestaurant() {
    setLoading(true);
    try {
      const res = await api.get("/restaurant");
      apiToFrontend(res?.data?.data);
    } finally { setLoading(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();
      const res = await api.post("/restaurant", payload);

      if (res?.data?.data) {
        apiToFrontend(res.data.data);
      }

      showPopup({
        title: "Success",
        message: "Restaurant profile saved successfully!",
        type: "success"
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "Save Failed",
        message: "Something went wrong while saving your profile.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-[#D0B079]/30">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="-mt-10 sm:-mt-0 flex-1 pt-36 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-10">
          <div className="max-w-5xl mx-auto">

            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                  <Store className="text-[#D0B079]" size={28} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">Restaurant Profile</h1>
                  <p className="text-white mt-1 text-sm font-medium tracking-wide">Manage your restaurant information and operating hours</p>
                </div>
              </div>
            </motion.div>

            <div className="space-y-6">
              {/* Basic Information Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Store size={22} className="text-[#D0B079]" />
                      Basic Information
                    </h2>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                      icon={Store}
                      label="Restaurant Name"
                      value={info.restaurant_name}
                      onChange={onInfoChange("restaurant_name")}
                      placeholder="Enter restaurant name"
                      required
                    />
                    <InputField
                      icon={Shield}
                      label="Company Name"
                      value={info.company_name}
                      onChange={onInfoChange("company_name")}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                      icon={Phone}
                      label="Restaurant Phone Number"
                      value={info.phone}
                      onChange={onInfoChange("phone")}
                      placeholder="+44 123 456 7890"
                      type="tel"
                      required
                    />
                    <InputField
                      icon={Mail}
                      label="Business Email"
                      value={info.email}
                      onChange={onInfoChange("email")}
                      placeholder="contact@restaurant.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-semibold tracking-wide text-[#D0B079] shrink-0">Geolocation</h3>
                      <div className="h-px w-full bg-gradient-to-r from-[#D0B079]/20 to-transparent"></div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2 group">
                        <label className="text-sm font-medium tracking-wide text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
                          <MapPin size={12} className="text-[#D0B079]" /> Physical Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="restaurant_address_autocomplete"
                            value={info.address}
                            onChange={onInfoChange("address")}
                            placeholder="Search Google Maps for address..."
                            className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#D0B079]/20 focus:border-[#D0B079]/40 transition-all text-base"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/50 ml-1">Latitude</label>
                          <input
                            type="text"
                            value={info.latitude}
                            readOnly
                            placeholder="0.000000"
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[#D0B079]/70 text-xs font-mono focus:outline-none cursor-default"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/50 ml-1">Longitude</label>
                          <input
                            type="text"
                            value={info.longitude}
                            readOnly
                            placeholder="0.000000"
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[#D0B079]/70 text-xs font-mono focus:outline-none cursor-default"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Operating Hours Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
              >
                <div className="bg-white/5 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Calendar size={22} className="text-yellow-400" />
                      Restuarent Operating Hours
                    </h2>
                  </div>
                  <button
                    onClick={handleAddManual}
                    disabled={timings.length >= 7}
                    className="px-6 py-3 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] text-[#071428] font-bold text-base rounded-2xl shadow-xl transition-all flex items-center gap-3 justify-center disabled:opacity-30 disabled:cursor-not-allowed group active:scale-95"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Add Day
                  </button>
                </div>

                <div className="p-8">
                  <div className="space-y-4">
                    {timings.map((t) => (
                      <div
                        key={t.id}
                        className={`group relative border rounded-[1.5rem] p-6 transition-all duration-300 ${t.is_active
                          ? 'bg-white/[0.03] border-[#D0B079]/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]'
                          : 'bg-white/[0.01] border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                          }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                          {/* Day Selector */}
                          <div className="md:col-span-3 space-y-2">
                            <label className="text-sm font-medium text-white ml-1"> Day</label>
                            <select
                              value={t.day}
                              onChange={(e) => changeDay(t.id, e.target.value)}
                              className="w-full px-4 py-3 bg-[#0b1a3d] border border-white/10 rounded-xl text-white font-medium text-sm tracking-wide focus:outline-none focus:border-[#D0B079] transition-all cursor-pointer appearance-none"
                            >
                              {WEEKDAYS.map((d) => (
                                <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d} className="bg-[#0b1a3d]">
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Start Time */}
                          <div className="md:col-span-3 space-y-2">
                            <label className="text-sm font-medium text-white ml-1">Opening Time</label>
                            <div className="relative">
                              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400/50" />
                              <input
                                type="time"
                                value={t.start}
                                onChange={(e) => updateTiming(t.id, { start: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-[#D0B079] transition-all [color-scheme:dark]"
                              />
                            </div>
                          </div>

                          {/* End Time */}
                          <div className="md:col-span-3 space-y-2">
                            <label className="text-sm font-medium text-white ml-1">Closing Time</label>
                            <div className="relative">
                              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400/50" />
                              <input
                                type="time"
                                value={t.end}
                                onChange={(e) => updateTiming(t.id, { end: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-[#D0B079] transition-all [color-scheme:dark]"
                              />
                            </div>
                          </div>

                          {/* Active Toggle & Remove */}
                          <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-6">
                            <label className="flex items-center gap-3 cursor-pointer group/toggle">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!!t.is_active}
                                  onChange={(e) => updateTiming(t.id, { is_active: e.target.checked })}
                                />
                                <div className={`w-10 h-5 rounded-full transition-colors ${t.is_active ? 'bg-[#D0B079]' : 'bg-white/10'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${t.is_active ? 'translate-x-5' : ''}`}></div>
                              </div>
                              <span className={`text-sm font-medium transition-colors ${t.is_active ? 'text-yellow-400' : 'text-white/60'}`}>
                                {t.is_active ? 'Online' : 'Offline'}
                              </span>
                            </label>

                            <button
                              onClick={() => removeTiming(t.id)}
                              className="p-3 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all hover:scale-110 shadow-lg border border-rose-500/10"
                              title="Purge sequence"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Active Indicator */}
                        {t.is_active && (
                          <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                        )}
                      </div>
                    ))}
                  </div>

                  {timings.length === 0 && (
                    <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
                      <Clock size={48} strokeWidth={1} className="mx-auto mb-4 text-white/20" />
                      <p className="text-sm font-medium text-white/50 tracking-wide">Temporal schedule unidentified</p>
                      <p className="text-sm font-medium text-[#D0B079]/60 mt-2">Initialize a daily sequence to configure availability</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Save Button at the bottom */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="w-full sm:w-64 py-5 px-8 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] disabled:opacity-50 text-slate-900 font-bold text-lg rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={26} />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

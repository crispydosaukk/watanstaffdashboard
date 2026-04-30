import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, Phone, Mail, MapPin, Calendar, Clock, 
  Save, Loader2, Plus, Trash2, Shield, Building2, Map as MapIcon
} from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import Header from "../../components/common/header";
import Sidebar from "../../components/common/sidebar";
import Footer from "../../components/common/footer";
import { usePopup } from "../../context/PopupContext";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const InputField = ({ label, icon: Icon, value, onChange, placeholder, type = "text", required = false, id }) => (
  <div className="space-y-2 group">
    <label className="text-sm font-medium tracking-wide text-white group-focus-within:text-[#D0B079] transition-colors flex items-center gap-2">
      <Icon size={12} className="text-[#D0B079]" /> {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-medium placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#D0B079]/20 focus:border-[#D0B079]/40 transition-all text-base"
      />
    </div>
  </div>
);

export default function RestaurantProfile() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showPopup } = usePopup();

  const [info, setInfo] = useState({
    restaurant_name: "",
    company_name: "",
    address: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
  });

  const [timings, setTimings] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  // Google Maps Autocomplete Initialization
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY || loading) return;

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
            latitude: place.geometry.location.lat().toString(),
            longitude: place.geometry.location.lng().toString()
          }));
        }
      });
    };

    if (!document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.id = "google-maps-script";
      script.async = true;
      script.onload = loadAutocomplete;
      document.head.appendChild(script);
    } else {
      loadAutocomplete();
    }
  }, [loading]);

  async function loadProfile() {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const restaurantId = user.uid || "";
      if (!restaurantId) return;

      const restDoc = await getDoc(doc(db, "restaurants", restaurantId));
      if (restDoc.exists()) {
        const data = restDoc.data();
        setInfo({
          restaurant_name: data.restaurant_name ?? "",
          company_name: data.company_name ?? "",
          address: data.restaurant_address ?? "",
          phone: data.restaurant_phonenumber ?? "",
          email: data.restaurant_email ?? "",
          latitude: data.latitude ?? "",
          longitude: data.longitude ?? "",
        });

        if (data.timings?.length) {
          setTimings(data.timings.map(t => ({
            id: uuidv4(),
            day: t.day,
            start: t.opening_time || "",
            end: t.closing_time || "",
            is_active: !!t.is_active
          })));
        }
      }
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const onInfoChange = (field) => (e) => setInfo(prev => ({ ...prev, [field]: e.target.value }));

  async function fetchCurrentLocation() {
    if (!navigator.geolocation) {
      showPopup({ title: "Error", message: "Geolocation not supported.", type: "error" });
      return;
    }

    setSaving(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setInfo(prev => ({ ...prev, latitude: latitude.toString(), longitude: longitude.toString() }));

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setInfo(prev => ({ ...prev, address: data.results[0].formatted_address }));
            showPopup({ title: "Success", message: "Location updated!", type: "success" });
          }
        } catch (err) {
          console.error("Geocode error:", err);
        } finally {
          setSaving(false);
        }
      },
      () => {
        setSaving(false);
        showPopup({ title: "Error", message: "Allow location access.", type: "error" });
      },
      { enableHighAccuracy: true }
    );
  }

  async function saveAll() {
    if (!info.latitude || !info.longitude || !info.address) {
      showPopup({
        title: "Location Required",
        message: "Latitude, Longitude and Address are mandatory.",
        type: "warning"
      });
      return;
    }

    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const restaurantId = user.uid || "";
      
      const updates = {
        restaurant_name: info.restaurant_name,
        company_name: info.company_name,
        restaurant_address: info.address,
        restaurant_phonenumber: info.phone,
        restaurant_email: info.email,
        latitude: info.latitude,
        longitude: info.longitude,
        timings: timings.map(t => ({
          day: t.day,
          opening_time: t.start,
          closing_time: t.end,
          is_active: t.is_active
        })),
        updated_at: new Date()
      };

      await setDoc(doc(db, "restaurants", restaurantId), updates, { merge: true });
      showPopup({ title: "Success", message: "Profile saved!", type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: "Save failed.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const handleAddManual = () => {
    const usedDays = timings.map(t => t.day);
    const nextDay = WEEKDAYS.find(d => !usedDays.includes(d));
    if (nextDay) {
      setTimings(prev => [...prev, { id: uuidv4(), day: nextDay, start: "09:00", end: "17:00", is_active: true }]);
    }
  };

  const removeTiming = (id) => setTimings(prev => prev.filter(t => t.id !== id));
  const updateTiming = (id, updates) => setTimings(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

  if (loading) return <div className="h-screen bg-[#071428] flex items-center justify-center"><Loader2 className="animate-spin text-[#D0B079]" size={48} /></div>;

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
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-sm font-semibold tracking-wide text-[#D0B079] shrink-0">Geolocation</h3>
                        <div className="h-px w-64 bg-gradient-to-r from-[#D0B079]/20 to-transparent"></div>
                      </div>
                      <button
                        type="button"
                        onClick={fetchCurrentLocation}
                        className="px-4 py-2 bg-white/5 hover:bg-[#D0B079]/10 border border-white/10 hover:border-[#D0B079]/30 rounded-xl text-white/70 hover:text-[#D0B079] text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <MapIcon size={14} />
                        Fetch My Location
                      </button>
                    </div>
                    <div className="space-y-4">
                      <InputField
                        id="restaurant_address_autocomplete"
                        icon={MapPin}
                        label="Physical Address"
                        value={info.address}
                        onChange={onInfoChange("address")}
                        placeholder="Search Google Maps for address..."
                        required
                      />
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
                              onChange={(e) => updateTiming(t.id, { day: e.target.value })}
                              className="w-full px-4 py-3 bg-[#0b1a3d] border border-white/10 rounded-xl text-white font-medium text-sm tracking-wide focus:outline-none focus:border-[#D0B079] transition-all cursor-pointer appearance-none [&>option]:bg-[#0b1a3d]"
                            >
                              {WEEKDAYS.map((d) => (
                                <option key={d} value={d} className="bg-[#0b1a3d]">
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
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="w-full sm:w-64 py-5 px-8 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] disabled:opacity-50 text-slate-900 font-bold text-lg rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 shadow-[#D0B079]/20"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={26} />}
                  Save Profile
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

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// CustomDropdown component for glassy select
function CustomDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const handleSelect = (v) => {
    setOpen(false);
    onChange({ target: { value: v } });
  };
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold text-left focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-sm backdrop-blur-md"
        onClick={() => setOpen(o => !o)}
      >
        {selected ? selected.label : "Select..."}
        <span className="float-right opacity-40">▼</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0b1a3d] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {options.map(opt => (
            <div
              key={opt.value}
              className="px-5 py-3 cursor-pointer text-white font-bold hover:bg-yellow-500/10 transition-all text-sm"
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js";
import {
  Store, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin,
  ParkingCircle, Upload, X, Clock, Plus, Trash2, Save, Image as ImageIcon,
  CheckCircle2, AlertCircle, Calendar, Utensils, ChefHat, Pizza, Soup, Flame,
  Truck, Bike, ShoppingCart, Globe, Drumstick, Loader2, Shield
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", className = "", required = false, id }) => (
  <div className={`space-y-2 group ${className}`}>
    <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
      {Icon && <Icon size={12} className="text-yellow-500" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-sm"
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
    address: "",
    phone: "",
    email: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    parking_info: "",
    instore: false,
    kerbside: false,
    latitude: "",
    longitude: "",
    photo: "",
    stripe_secret_key: "",
    stripe_publishable_key: "",
    food_type: [],
    is_halal: 0,
    cuisine_type: [],
    google_review_link: "",
    website_url: "",
    delivery_partner_1_url: "",
    delivery_partner_2_url: "",
    delivery_partner_3_url: "",
    delivery_partner_4_url: ""
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [timings, setTimings] = useState([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

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
      restaurant_address: info.address || null,
      restaurant_phonenumber: info.phone || null,
      restaurant_email: info.email || null,
      restaurant_facebook: info.facebook || null,
      restaurant_twitter: info.twitter || null,
      restaurant_instagram: info.instagram || null,
      restaurant_linkedin: info.linkedin || null,
      parking_info: info.parking_info || null,
      instore: info.instore ? 1 : 0,
      kerbside: info.kerbside ? 1 : 0,
      latitude: info.latitude || null,
      longitude: info.longitude || null,
      stripe_secret_key: info.stripe_secret_key || null,
      stripe_publishable_key: info.stripe_publishable_key || null,
      food_type: Array.isArray(info.food_type) ? info.food_type.join(",") : "",
      cuisine_type: Array.isArray(info.cuisine_type) ? info.cuisine_type.join(",") : "",
      google_review_link: info.google_review_link || null,
      website_url: info.website_url || null,
      delivery_partner_1_url: info.delivery_partner_1_url || null,
      delivery_partner_2_url: info.delivery_partner_2_url || null,
      delivery_partner_3_url: info.delivery_partner_3_url || null,
      delivery_partner_4_url: info.delivery_partner_4_url || null,
      is_halal: info.is_halal,
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

    let foodTypeArr = [];
    if (Array.isArray(restaurant.food_type)) {
      foodTypeArr = restaurant.food_type;
    } else if (typeof restaurant.food_type === "string" && restaurant.food_type.length > 0) {
      foodTypeArr = restaurant.food_type.split(",").map(v => Number(v)).filter(v => !isNaN(v));
    } else if (typeof restaurant.food_type === "number") {
      foodTypeArr = [restaurant.food_type];
    }
    setInfo({
      restaurant_name: restaurant.restaurant_name ?? "",
      address: restaurant.restaurant_address ?? "",
      phone: restaurant.restaurant_phonenumber ?? "",
      email: restaurant.restaurant_email ?? "",
      facebook: restaurant.restaurant_facebook ?? "",
      twitter: restaurant.twitter ?? "",
      instagram: restaurant.instagram ?? "",
      linkedin: restaurant.linkedin ?? "",
      parking_info: restaurant.parking_info ?? "",
      instore: !!restaurant.instore,
      kerbside: !!restaurant.kerbside,
      latitude: restaurant.latitude ?? "",
      longitude: restaurant.longitude ?? "",
      photo: restaurant.restaurant_photo ?? "",
      stripe_secret_key: restaurant.stripe_secret_key ?? "",
      stripe_publishable_key: restaurant.stripe_publishable_key ?? "",
      food_type: foodTypeArr,
      cuisine_type: Array.isArray(restaurant.cuisine_type) ? restaurant.cuisine_type : (typeof restaurant.cuisine_type === "string" ? restaurant.cuisine_type.split(",").map(v => Number(v)).filter(v => !isNaN(v)) : []),
      google_review_link: restaurant.google_review_link ?? "",
      website_url: restaurant.website_url ?? "",
      delivery_partner_1_url: restaurant.delivery_partner_1_url ?? "",
      delivery_partner_2_url: restaurant.delivery_partner_2_url ?? "",
      delivery_partner_3_url: restaurant.delivery_partner_3_url ?? "",
      delivery_partner_4_url: restaurant.delivery_partner_4_url ?? "",
      is_halal: restaurant.is_halal === true || restaurant.is_halal === 1 ? 1 : 0
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

      let res;

      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        fd.append("payload", JSON.stringify(payload));

        res = await api.post("/restaurant", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/restaurant", payload);
      }

      if (res?.data?.data) {

        apiToFrontend(res.data.data);
        showPopup?.("success", "Saved", "Restaurant details updated successfully");
      }

      setPhotoFile(null);
      setPhotoPreview(null);

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
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="-mt-10 sm:-mt-0 flex-1 pt-36 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">

            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                  <Store className="text-yellow-500" size={28} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">Restaurant Profile</h1>
                  <p className="text-white/60 mt-1 text-[10px] font-black uppercase tracking-[0.2em]">Manage your restaurant information and operating hours</p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Main Form - Left Side (2 columns) */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Information Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                        <Store size={22} className="text-yellow-500" />
                        Basic Information
                      </h2>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Core details of your establishment</p>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <InputField
                      icon={Store}
                      label="Restaurant Name"
                      value={info.restaurant_name}
                      onChange={onInfoChange("restaurant_name")}
                      placeholder="Enter restaurant name"
                      required
                    />
                    {/* Food Type Section */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
                        <Utensils size={12} className="text-yellow-500" />
                        Food Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.08]">
                        <div className="flex flex-wrap gap-8 items-center justify-around">
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              id="veg-checkbox"
                              checked={Array.isArray(info.food_type) ? info.food_type.includes(0) : info.food_type === 0}
                              onChange={e => {
                                setInfo(p => {
                                  let arr = Array.isArray(p.food_type) ? [...p.food_type] : [p.food_type];
                                  if (e.target.checked) {
                                    if (!arr.includes(0)) arr.push(0);
                                  } else {
                                    arr = arr.filter(v => v !== 0);
                                  }
                                  return { ...p, food_type: arr };
                                });
                              }}
                              className="w-5 h-5 accent-yellow-500 border-white/[0.08] rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                            />
                            <label htmlFor="veg-checkbox" className="text-sm font-black uppercase tracking-widest text-white/70 cursor-pointer">Veg</label>
                          </div>
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              id="nonveg-checkbox"
                              checked={Array.isArray(info.food_type) ? info.food_type.includes(1) : info.food_type === 1}
                              onChange={e => {
                                setInfo(p => {
                                  let arr = Array.isArray(p.food_type) ? [...p.food_type] : [p.food_type];
                                  if (e.target.checked) {
                                    if (!arr.includes(1)) arr.push(1);
                                  } else {
                                    arr = arr.filter(v => v !== 1);
                                  }
                                  return { ...p, food_type: arr, is_halal: e.target.checked ? 1 : 0 };
                                });
                              }}
                              className="w-5 h-5 accent-yellow-500 border-white/[0.08] rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                            />
                            <label htmlFor="nonveg-checkbox" className="text-sm font-black uppercase tracking-widest text-white/70 cursor-pointer">Non-Veg</label>
                          </div>
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              id="jain-food-checkbox"
                              checked={Array.isArray(info.food_type) ? info.food_type.includes(2) : info.food_type === 2}
                              onChange={e => {
                                setInfo(p => {
                                  let arr = Array.isArray(p.food_type) ? [...p.food_type] : [p.food_type];
                                  if (e.target.checked) {
                                    if (!arr.includes(2)) arr.push(2);
                                  } else {
                                    arr = arr.filter(v => v !== 2);
                                  }
                                  return { ...p, food_type: arr };
                                });
                              }}
                              className="w-5 h-5 accent-yellow-500 border-white/[0.08] rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                            />
                            <label htmlFor="jain-food-checkbox" className="text-sm font-black uppercase tracking-widest text-white/70 cursor-pointer">Jain</label>
                          </div>
                          {Array.isArray(info.food_type) && info.food_type.includes(1) && (
                            <div className="flex items-center gap-4 pl-8 border-l border-white/10">
                              <div className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  id="halal-checkbox"
                                  checked={info.is_halal === 1}
                                  onChange={e => setInfo(p => ({ ...p, is_halal: e.target.checked ? 1 : 0 }))}
                                  className="w-5 h-5 accent-yellow-500 border-white/[0.08] rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                                />
                                <label htmlFor="halal-checkbox" className="text-sm font-black uppercase tracking-widest text-yellow-400 cursor-pointer">Halal Certified</label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cuisine Type Section */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
                        <ChefHat size={12} className="text-yellow-400" />
                        Cuisine Topology <span className="text-rose-500">*</span>
                      </label>
                      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.08]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                          {[
                            { id: 0, label: "Indian", icon: Flame },
                            { id: 1, label: "Afghan", icon: ChefHat },
                            { id: 2, label: "Pakistani", icon: ChefHat },
                            { id: 3, label: "Chinese", icon: Soup },
                            { id: 4, label: "Italian", icon: Pizza },
                            { id: 5, label: "Thai", icon: Soup },
                            { id: 6, label: "Mexican", icon: Flame },
                            { id: 7, label: "Fried Chicken", icon: Drumstick }
                          ].map((cuisine) => {
                            const Icon = cuisine.icon;
                            const isSelected = Array.isArray(info.cuisine_type) && info.cuisine_type.includes(cuisine.id);
                            return (
                              <div
                                key={cuisine.id}
                                onClick={() => {
                                  setInfo(p => {
                                    let arr = Array.isArray(p.cuisine_type) ? [...p.cuisine_type] : [];
                                    if (arr.includes(cuisine.id)) {
                                      arr = arr.filter(v => v !== cuisine.id);
                                    } else {
                                      arr.push(cuisine.id);
                                    }
                                    return { ...p, cuisine_type: arr };
                                  });
                                }}
                                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 transform hover:scale-[1.05] cursor-pointer ${isSelected
                                  ? 'bg-yellow-500/10 border-yellow-500/30'
                                  : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                  }`}
                              >
                                <div className={`p-2 rounded-xl mb-2 transition-colors duration-300 ${isSelected ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-white/5 text-white/40'}`}>
                                  <Icon size={18} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${isSelected ? 'text-white' : 'text-white/40'}`}>
                                  {cuisine.label}
                                </span>
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <div className="bg-yellow-500 rounded-full p-0.5">
                                      <CheckCircle2 size={10} className="text-slate-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField
                        icon={Phone}
                        label="Operator Phone"
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
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 shrink-0">Geolocation</h3>
                        <div className="h-px w-full bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2 group">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
                            <MapPin size={12} className="text-yellow-500" /> Physical Address <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id="restaurant_address_autocomplete"
                              value={info.address}
                              onChange={onInfoChange("address")}
                              placeholder="Search Google Maps for address..."
                              className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Latitude</label>
                            <input
                              type="text"
                              value={info.latitude}
                              readOnly
                              placeholder="0.000000"
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-yellow-500/70 text-xs font-mono focus:outline-none cursor-default"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Longitude</label>
                            <input
                              type="text"
                              value={info.longitude}
                              readOnly
                              placeholder="0.000000"
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-yellow-500/70 text-xs font-mono focus:outline-none cursor-default"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1 italic text-center">
                          * Coordinates are synchronized during address selection
                        </p>
                      </div>
                    </div>

                    <InputField
                      icon={ParkingCircle}
                      label="Logistics & Parking"
                      value={info.parking_info}
                      onChange={onInfoChange("parking_info")}
                      placeholder="Describe parking availability for patrons"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10">
                    <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                      <Twitter size={22} className="text-yellow-400" />
                      Social Presence
                    </h2>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Digital connectivity channels</p>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                      icon={Facebook}
                      label="Facebook"
                      value={info.facebook}
                      onChange={onInfoChange("facebook")}
                      placeholder="Profile URL"
                    />
                    <InputField
                      icon={Instagram}
                      label="Instagram"
                      value={info.instagram}
                      onChange={onInfoChange("instagram")}
                      placeholder="Profile URL"
                    />
                    <InputField
                      icon={Twitter}
                      label="Twitter (X)"
                      value={info.twitter}
                      onChange={onInfoChange("twitter")}
                      placeholder="Profile URL"
                    />
                    <InputField
                      icon={Linkedin}
                      label="LinkedIn"
                      value={info.linkedin}
                      onChange={onInfoChange("linkedin")}
                      placeholder="Profile URL"
                    />
                    <InputField
                      icon={ImageIcon}
                      label="Google Reviews"
                      value={info.google_review_link}
                      onChange={onInfoChange("google_review_link")}
                      placeholder="Review Page URL"
                    />
                    <InputField
                      icon={Globe}
                      label="Official Website"
                      value={info.website_url}
                      onChange={onInfoChange("website_url")}
                      placeholder="https://your-domain.com"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center gap-3">
                    <Truck size={22} className="text-yellow-400" />
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase">Logistics Partners</h2>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Delivery infrastructure integration</p>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-center gap-4">
                      <div className="p-2 bg-yellow-500/10 rounded-xl">
                        <Store size={18} className="text-yellow-400" />
                      </div>
                      <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest">
                        Primary Infrastructure (Restaurant Exclusive)
                      </p>
                    </div>

                    <InputField
                      icon={Truck}
                      label="Internal Fulfillment Link"
                      value={info.delivery_partner_1_url}
                      onChange={onInfoChange("delivery_partner_1_url")}
                      placeholder="Direct ordering URL"
                    />

                    <div className="pt-8 border-t border-white/[0.08]">
                      <div className="flex items-center gap-4 mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 shrink-0">3rd Party Aggregators</h3>
                        <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputField
                          icon={Bike}
                          label="UberEats Integration"
                          value={info.delivery_partner_2_url}
                          onChange={onInfoChange("delivery_partner_2_url")}
                          placeholder="Partner URL"
                        />
                        <InputField
                          icon={Bike}
                          label="Deliveroo Integration"
                          value={info.delivery_partner_3_url}
                          onChange={onInfoChange("delivery_partner_3_url")}
                          placeholder="Partner URL"
                        />
                        <InputField
                          icon={ShoppingCart}
                          label="JustEat Integration"
                          value={info.delivery_partner_4_url}
                          onChange={onInfoChange("delivery_partner_4_url")}
                          placeholder="Partner URL"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center gap-3">
                    <Shield size={22} className="text-yellow-400" />
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase">Stripe Infrastructure</h2>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Direct settlement protocol</p>
                    </div>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                      label="Publishable Topology Key"
                      value={info.stripe_publishable_key}
                      onChange={onInfoChange("stripe_publishable_key")}
                      placeholder="pk_test_..."
                      required
                    />
                    <InputField
                      label="Secret Authentication Key"
                      value={info.stripe_secret_key}
                      onChange={onInfoChange("stripe_secret_key")}
                      placeholder="sk_test_..."
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center gap-3">
                    <ShoppingCart size={22} className="text-yellow-400" />
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase">Fulfillment Modes</h2>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Service availability protocols</p>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <label className={`relative flex items-center p-6 rounded-2xl border-2 cursor-pointer hover:shadow-2xl transition-all duration-300 group ${info.instore
                        ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                        }`}>
                        <input
                          type="checkbox"
                          checked={info.instore}
                          onChange={(e) => setInfo((p) => ({ ...p, instore: e.target.checked }))}
                          className="w-6 h-6 text-yellow-500 border-white/10 rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                        />
                        <div className="ml-5 flex-1">
                          <span className="block text-sm font-black uppercase tracking-widest text-white">In-Store Fulfillment</span>
                          <span className="text-[10px] font-bold text-white/40 mt-1 block">Patron internal collection protocol</span>
                        </div>
                        {info.instore && <CheckCircle2 className="text-yellow-400" size={24} />}
                      </label>

                      <label className={`relative flex items-center p-6 rounded-2xl border-2 cursor-pointer hover:shadow-2xl transition-all duration-300 group ${info.kerbside
                        ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                        }`}>
                        <input
                          type="checkbox"
                          checked={info.kerbside}
                          onChange={(e) => setInfo((p) => ({ ...p, kerbside: e.target.checked }))}
                          className="w-6 h-6 text-yellow-500 border-white/10 rounded-lg focus:ring-yellow-500/20 focus:ring-4 bg-white/[0.03]"
                        />
                        <div className="ml-5 flex-1">
                          <span className="block text-sm font-black uppercase tracking-widest text-white">Kerbside Distribution</span>
                          <span className="text-[10px] font-bold text-white/40 mt-1 block">External vehicle-side handoff</span>
                        </div>
                        {info.kerbside && <CheckCircle2 className="text-yellow-400" size={24} />}
                      </label>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">

                {/* Photo Upload Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden sticky top-24"
                >
                  <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center gap-3">
                    <ImageIcon size={22} className="text-yellow-400" />
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase">Visual Identity</h2>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Primary establishment imagery</p>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="relative group/photo">
                      <div className="aspect-[4/3] bg-white/[0.03] rounded-3xl overflow-hidden border-2 border-dashed border-white/10 group-hover/photo:border-yellow-500/30 transition-all duration-300">
                        {photoPreview ? (
                          <div className="relative w-full h-full">
                            <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                className="p-4 bg-rose-500 text-white rounded-2xl shadow-2xl transform hover:scale-110 transition-all"
                              >
                                <X size={24} />
                              </button>
                            </div>
                          </div>
                        ) : info.photo ? (
                          <div className="relative w-full h-full">
                            <img
                              src={info.photo.startsWith('http') ? info.photo : `${API_BASE}/uploads/${info.photo}`}
                              className="w-full h-full object-cover"
                              alt="Restaurant"
                              onError={(e) => {
                                console.error("Image load failed:", e.target.src);
                                e.target.src = "";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => fileInputRef.current.click()}
                                className="p-4 bg-yellow-500 text-slate-900 rounded-2xl shadow-2xl transform hover:scale-110 transition-all"
                              >
                                <Upload size={24} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                            <ImageIcon size={56} strokeWidth={1} className="mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">No Visual Assets</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0])}
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="mt-6 w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/[0.08] transition-all flex items-center justify-center gap-3 group/btn"
                    >
                      <Upload size={18} className="text-yellow-400 group-hover/btn:scale-110 transition-transform" />
                      {photoFile || info.photo ? "Modify Imagery" : "Upload Identity"}
                    </button>

                    {photoFile && (
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="mt-3 w-full py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black uppercase tracking-widest text-[9px] rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <X size={14} />
                        Discard Modification
                      </button>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="p-8 pt-0">
                    <button
                      onClick={saveAll}
                      disabled={saving}
                      className="w-full py-5 px-8 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Synchronizing...
                        </>
                      ) : (
                        <>
                          <Save size={20} className="font-black" />
                          Synchronize Profile
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden"
            >
              <div className="bg-white/5 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                    <Calendar size={22} className="text-yellow-400" />
                    Chronological Availability
                  </h2>
                  <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Weekly operational schedule configuration</p>
                </div>
                <button
                  onClick={handleAddManual}
                  disabled={timings.length >= 7}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl transition-all flex items-center gap-3 justify-center disabled:opacity-30 disabled:cursor-not-allowed group active:scale-95"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                  Initialize Day
                </button>
              </div>

              <div className="p-8">
                <div className="space-y-4">
                  {timings.map((t) => (
                    <div
                      key={t.id}
                      className={`group relative border rounded-[1.5rem] p-6 transition-all duration-300 ${t.is_active
                        ? 'bg-white/[0.03] border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]'
                        : 'bg-white/[0.01] border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                        }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

                        {/* Day Selector */}
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Operational Day</label>
                          <select
                            value={t.day}
                            onChange={(e) => changeDay(t.id, e.target.value)}
                            className="w-full px-4 py-3 bg-[#0b1a3d] border border-white/10 rounded-xl text-white font-black uppercase text-[10px] tracking-widest focus:outline-none focus:border-yellow-500 transition-all cursor-pointer appearance-none"
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
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Shift Start</label>
                          <div className="relative">
                            <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400/50" />
                            <input
                              type="time"
                              value={t.start}
                              onChange={(e) => updateTiming(t.id, { start: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white font-black text-sm focus:outline-none focus:border-yellow-500 transition-all [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        {/* End Time */}
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Shift Termination</label>
                          <div className="relative">
                            <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400/50" />
                            <input
                              type="time"
                              value={t.end}
                              onChange={(e) => updateTiming(t.id, { end: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white font-black text-sm focus:outline-none focus:border-yellow-500 transition-all [color-scheme:dark]"
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
                               <div className={`w-10 h-5 rounded-full transition-colors ${t.is_active ? 'bg-yellow-500' : 'bg-white/10'}`}></div>
                               <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${t.is_active ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${t.is_active ? 'text-yellow-400' : 'text-white/30'}`}>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Temporal schedule unidentified</p>
                    <p className="text-[11px] font-bold text-yellow-400/40 mt-2">Initialize a daily sequence to configure availability</p>
                  </div>
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

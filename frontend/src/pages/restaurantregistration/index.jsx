import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, CheckCircle, Info, Users, Search,
  MapPin, Phone, Mail, Calendar, Eye,
  Plus, X, Download, TrendingUp, Briefcase, ChevronRight, Save,
  Clock, AlertCircle, Check, MessageSquare, Globe, Hash, Building2,
  Edit3, ArrowLeft, Send, Shield, Loader2
} from "lucide-react";
import api from "../../api.js";

const InputGroup = ({ label, icon: Icon, value, onChange, placeholder, type = "text", required = false, name }) => (
  <div className="space-y-2 group">
    <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
      {Icon && <Icon size={12} className="text-yellow-400" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-sm"
      />
    </div>
  </div>
);

const SelectGroup = ({ label, icon: Icon, value, onChange, options, required = false, name }) => (
  <div className="space-y-2 group">
    <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
      {Icon && <Icon size={12} className="text-yellow-400" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all appearance-none cursor-pointer text-sm"
      >
        <option value="" className="bg-[#0b1a3d]">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#0b1a3d]">{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <ChevronRight className="rotate-90 text-white" size={16} />
      </div>
    </div>
  </div>
);

const CUISINE_MAP = {
  "0": "Indian",
  "1": "Afghan",
  "2": "Pakistani",
  "3": "Chinese",
  "4": "Italian",
  "5": "Thai",
  "6": "Mexican",
  "7": "Fried Chicken"
};

const DetailRow = ({ label, value, icon: Icon, isFile = false, isCuisine = false }) => {
  const API = import.meta.env.VITE_API_URL || "";
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const fileUrl = (value && isFile && typeof value === 'string') ? `${API_BASE}/uploads/${value}` : null;

  let displayValue = value;
  if (isCuisine && value) {
    displayValue = String(value).split(',').map(id => CUISINE_MAP[id.trim()] || id.trim()).join(', ');
  }

  return (
    <div className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/[0.08] group hover:border-yellow-500/30 transition-all">
      <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:scale-110 transition-transform">
        {Icon && <Icon className="text-yellow-400" size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-yellow-400 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5"
          >
            View Document <Eye size={12} />
          </a>
        ) : (
          <p className="text-sm text-white font-black tracking-tight truncate">{displayValue || "—"}</p>
        )}
      </div>
    </div>
  );
};

const FileUpload = ({ label, name, value, onChange, icon: Icon, required = false }) => {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ target: { name, value: file } });
    }
  };

  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
        {Icon && <Icon size={12} className="text-yellow-400" />}
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex items-center gap-4 p-4 bg-white/[0.03] border-2 border-dashed ${value ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10'} rounded-2xl hover:border-yellow-500/50 transition-all cursor-pointer overflow-hidden group/upload`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
        />
        <div className="flex-1 min-w-0">
          {value ? (
            <div className="flex items-center gap-3 truncate">
              <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                <Check size={14} className="font-black" />
              </div>
              <span className="text-sm text-white font-black tracking-tight truncate">
                {typeof value === 'string' ? value : value.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-white/20 font-black uppercase tracking-widest">Click to upload document</span>
          )}
        </div>
        <div className="p-2 bg-white/5 group-hover/upload:bg-yellow-500/10 rounded-lg transition-colors">
          <Plus className="text-white/20 group-hover/upload:text-yellow-400" size={16} />
        </div>
      </div>
    </div>
  );
};

export default function RestaurantRegistration() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [merchantProfiles, setMerchantProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals state
  const [viewingProfile, setViewingProfile] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    email: "",
    country_code: "IN",
    mobile_number: "",
    landline_number: "",
    store_address: "",
    floor_suite: "",
    store_name: "",
    brand_name: "",
    business_type: "Restaurant",
    cuisine_type: "",
    number_of_locations: "",
    social_media_website_link: "",
    // Verification fields
    food_business_license: "",
    food_hygiene_certificate: "",
    business_registration_certificate: "",
    vat_registration_number: "",
    owner_id_proof_type: "",
    owner_id_proof_file: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_sort_code: "",
    bank_statement_file: "",
    address_proof_type: "",
    address_proof_file: "",
    food_hygiene_rating: "",
    allergen_info_file: "",
    is_halal: "0"
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const isSA = Number(user.role_id) === 6;
        setIsSuperAdmin(isSA);

        if (isSA) {
          await fetchMerchantProfiles();
        } else {
          await fetchMyProfile();
        }
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantProfiles = async () => {
    try {
      const res = await api.get("/merchant-profiles");
      if (res.data.success) {
        setMerchantProfiles(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching merchant profiles:", err);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await api.get("/merchant-profile/me");
      if (res.data.success && res.data.data) {
        setMyProfile(res.data.data);
        // Sync formData just in case user wants to edit
        setFormData({
          first_name: res.data.data.first_name || "",
          surname: res.data.data.surname || "",
          email: res.data.data.email || "",
          country_code: res.data.data.country_code || "IN",
          mobile_number: res.data.data.mobile_number || "",
          landline_number: res.data.data.landline_number || "",
          store_address: res.data.data.store_address || "",
          floor_suite: res.data.data.floor_suite || "",
          store_name: res.data.data.store_name || "",
          brand_name: res.data.data.brand_name || "",
          business_type: res.data.data.business_type || "Restaurant",
          cuisine_type: res.data.data.cuisine_type || "",
          number_of_locations: res.data.data.number_of_locations || "",
          social_media_website_link: res.data.data.social_media_website_link || "",
          food_business_license: res.data.data.food_business_license || "",
          food_hygiene_certificate: res.data.data.food_hygiene_certificate || "",
          business_registration_certificate: res.data.data.business_registration_certificate || "",
          vat_registration_number: res.data.data.vat_registration_number || "",
          owner_id_proof_type: res.data.data.owner_id_proof_type || "",
          owner_id_proof_file: res.data.data.owner_id_proof_file || "",
          bank_account_name: res.data.data.bank_account_name || "",
          bank_account_number: res.data.data.bank_account_number || "",
          bank_sort_code: res.data.data.bank_sort_code || "",
          bank_statement_file: res.data.data.bank_statement_file || "",
          address_proof_type: res.data.data.address_proof_type || "",
          address_proof_file: res.data.data.address_proof_file || "",
          food_hygiene_rating: res.data.data.food_hygiene_rating || "",
          allergen_info_file: res.data.data.allergen_info_file || "",
          is_halal: String(res.data.data.is_halal || "0")
        });
      } else {
        setMyProfile(null);
      }
    } catch (err) {
      console.error("Error fetching my profile:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] instanceof File) {
        fd.append(key, formData[key]);
      } else if (formData[key] !== "" && formData[key] !== null) {
        fd.append(key, formData[key]);
      }
    });

    try {
      let res;
      if (myProfile) {
        // Update
        res = await api.put("/merchant-profile/my-update", fd);
      } else {
        // Create
        res = await api.post("/merchant-profiles", fd);
      }

      if (res.data.success) {
        await fetchMyProfile();
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error submitting registration:", err);
      if (err.response?.status === 409) {
        alert("A registration request has already been submitted for this account.");
        await fetchMyProfile();
      } else {
        alert("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status, reason = null) => {
    try {
      const res = await api.put(`/merchant-profile/update-status/${id}`, { status, rejection_reason: reason });
      if (res.data.success) {
        await fetchMerchantProfiles();
        setRejectingId(null);
        setRejectionReason("");
        setViewingProfile(null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Update failed.");
    }
  };

  const filteredProfiles = merchantProfiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.store_name?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.surname?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });



  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-20 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 text-white">
          <div className="max-w-7xl mx-auto flex flex-col">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-yellow-400" size={48} />
                <span className="text-white font-bold text-sm tracking-wide">Loading Enterprise Data...</span>
              </div>
            ) : (
              <>
                {/* Page Header */}
                {!isEditing && !(myProfile && !isSuperAdmin) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 overflow-hidden">
                      <div className="p-2.5 sm:p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] flex-shrink-0">
                        <Store className="text-yellow-400" size={24} />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-2xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-lg truncate whitespace-nowrap">Restaurant Registration</h1>
                        <p className="text-white mt-1 text-sm font-medium tracking-wide">{isSuperAdmin ? "Approval queue for merchant store profiles" : "Register your business and track application"}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isSuperAdmin ? (
                  /* SUPER ADMIN VIEW: LIST OF SUBMISSIONS */
                  <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">                   <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-bold tracking-wide">Total</p>
                        <h3 className="text-2xl font-bold mt-1 text-white tracking-tight">{merchantProfiles.length}</h3>
                      </div>
                      <Users className="text-yellow-400/20" size={28} />
                    </div>
                      <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl flex items-center justify-between">
                        <div>
                          <p className="text-amber-400 text-sm font-bold tracking-wide">Pending</p>
                          <h3 className="text-2xl font-bold mt-1 text-white tracking-tight">{merchantProfiles.filter(p => p.status === 0).length}</h3>
                        </div>
                        <Clock className="text-amber-400/20" size={28} />
                      </div>
                      <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl flex items-center justify-between">
                        <div>
                          <p className="text-emerald-400 text-sm font-bold tracking-wide">Approved</p>
                          <h3 className="text-2xl font-bold mt-1 text-white tracking-tight">{merchantProfiles.filter(p => p.status === 1).length}</h3>
                        </div>
                        <CheckCircle className="text-emerald-400/20" size={28} />
                      </div>
                      <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-2xl flex items-center justify-between">
                        <div>
                          <p className="text-rose-400 text-sm font-bold tracking-wide">Declined</p>
                          <h3 className="text-2xl font-bold mt-1 text-white tracking-tight">{merchantProfiles.filter(p => p.status === 2).length}</h3>
                        </div>
                        <AlertCircle className="text-rose-400/20" size={28} />
                      </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                      <input
                        type="text"
                        placeholder="Search by store, name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-[#0b1a3d]/40 backdrop-blur-xl border-2 border-white/[0.08] rounded-2xl text-white placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 shadow-2xl transition-all font-bold"
                      />
                    </div>

                    <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-white/5 text-left border-b border-white/[0.08]">
                              <th className="px-8 py-4 text-xs font-bold text-white tracking-wide">Business</th>
                              <th className="px-8 py-4 text-xs font-bold text-white tracking-wide">Applicant</th>
                              <th className="px-8 py-4 text-xs font-bold text-white tracking-wide">Status</th>
                              <th className="px-8 py-4 text-xs font-bold text-white tracking-wide text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {filteredProfiles.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-10 py-20 text-center opacity-30 text-xs font-bold tracking-wide">No Records Found</td>
                              </tr>
                            ) : (
                              filteredProfiles.map((p) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg text-white ${p.status === 1 ? 'bg-emerald-500' : p.status === 2 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                                        {p.store_name?.charAt(0).toUpperCase()}
                                      </div>
                                      <p className="font-black text-lg tracking-tight text-white uppercase">{p.store_name}</p>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6">
                                    <p className="font-black text-white tracking-tight">{p.first_name} {p.surname}</p>
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-0.5">{p.email}</p>
                                  </td>
                                  <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                      <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 ${p.status === 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : p.status === 1 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                        {p.status === 0 && <Clock size={10} />}
                                        {p.status === 1 && <CheckCircle size={10} />}
                                        {p.status === 2 && <X size={10} />}
                                        {p.status === 0 ? "Pending" : p.status === 1 ? "Approved" : "Declined"}
                                      </span>
                                      <button onClick={() => setViewingProfile(p)} className="p-2 bg-white/5 hover:bg-yellow-500/20 text-white/30 hover:text-yellow-400 rounded-xl transition-all border border-white/[0.08]"><Eye size={14} /></button>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6">
                                    <div className="flex items-center justify-center gap-3">
                                      {p.status === 0 && (
                                        <>
                                          <button onClick={() => handleUpdateStatus(p.id, 1)} className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all shadow-lg"><Check size={20} className="font-black" /></button>
                                          <button onClick={() => setRejectingId(p.id)} className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all shadow-lg"><X size={20} className="font-black" /></button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : myProfile && !isEditing ? (
                  /* COMPACT USER VIEW: STATUS SCREEN */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex items-center justify-center py-10"
                  >
                    <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-14 border border-white/[0.08] shadow-2xl relative overflow-hidden w-full max-w-4xl text-center">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>

                      <div className="relative flex flex-col items-center space-y-10">
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border shadow-2xl ${myProfile.status === 0 ? 'bg-amber-500/10 border-amber-500/30' : myProfile.status === 1 ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                          {myProfile.status === 0 && <Clock size={48} className="text-amber-500" />}
                          {myProfile.status === 1 && <CheckCircle size={48} className="text-emerald-500" />}
                          {myProfile.status === 2 && <AlertCircle size={48} className="text-rose-500" />}
                        </div>

                        <div className="space-y-4">
                          <h2 className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight ${myProfile.status === 1 ? 'text-emerald-400' : myProfile.status === 2 ? 'text-rose-400' : 'text-white'}`}>
                            {myProfile.status === 0 ? "Application Under Review" : myProfile.status === 1 ? "Partner Verified" : "Application Declined"}
                          </h2>
                          <p className="text-white text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
                            {myProfile.status === 0 && <>Your request is being processed. Our compliance team is auditing your details. Acceptance expected within <span className="text-yellow-400 font-bold">24 Hours</span>.</>}
                            {myProfile.status === 1 && <>Congratulations! <span className="font-bold text-white">{myProfile.store_name}</span> is now a verified partner. Launch your dashboard to begin operations.</>}
                            {myProfile.status === 2 && <>Unfortunately, your application for <span className="font-bold text-white">{myProfile.store_name}</span> was not successful. Review our feedback below.</>}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4">
                          <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/[0.08] flex flex-col items-start min-w-[160px]">
                            <span className="text-xs font-bold text-white tracking-wide">Reference</span>
                            <span className="font-bold text-sm text-yellow-400 tracking-tight">#ZBR-{myProfile.id.toString().padStart(4, '0')}</span>
                          </div>
                          <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/[0.08] flex flex-col items-start min-w-[160px]">
                            <span className="text-xs font-bold text-white tracking-wide">Business</span>
                            <span className="font-bold text-sm tracking-tight text-white">{myProfile.store_name}</span>
                          </div>
                        </div>

                        {myProfile.status === 2 && myProfile.rejection_reason && (
                          <div className="w-full max-w-lg px-6 py-5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-2">Audit Feedback</span>
                            <p className="text-sm font-bold text-rose-100 italic leading-relaxed">"{myProfile.rejection_reason}"</p>
                          </div>
                        )}

                        <div className="pt-6 flex flex-wrap gap-4 items-center justify-center">
                          {myProfile.status === 1 ? (
                            <button className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1">
                              Launch My Dashboard
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setViewingProfile(myProfile)}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/[0.08] transition-all flex items-center gap-3"
                              >
                                <Eye size={18} className="text-yellow-400" /> View Details
                              </button>
                              <button
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-4 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-yellow-500/20 transition-all flex items-center gap-3"
                              >
                                <Edit3 size={18} /> Edit Application
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* REGISTRATION FORM (Create or Edit) */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/[0.08] shadow-2xl overflow-hidden mb-20"
                  >
                    <div className="px-8 sm:px-12 py-10 border-b border-white/[0.08] bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="flex items-center gap-5 overflow-hidden">
                        {isEditing ? (
                          <button onClick={() => setIsEditing(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white transition-all border border-white/[0.08]"><ArrowLeft size={20} /></button>
                        ) : (
                          <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 shrink-0"><Plus className="text-yellow-400" size={28} /></div>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{isEditing ? "Modify Application" : "Merchant Onboarding"}</h2>
                          <p className="text-white mt-1 text-sm font-medium tracking-wide">{isEditing ? "Refine profile and trigger re-audit" : "Initiate enterprise partnership"}</p>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="px-5 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                          <Clock size={12} /> Editing Mode
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 sm:p-14 space-y-14">
                      {/* Personal Info */}
                      <div className="space-y-10 group">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 shrink-0">Section 01. Contact Protocol</h3>
                          <div className="h-px w-full bg-gradient-to-r from-yellow-400/20 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <InputGroup label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} placeholder="Legal name" icon={Users} required />
                          <InputGroup label="Last Name" name="surname" value={formData.surname} onChange={handleInputChange} placeholder="Last name" icon={Users} required />
                          <InputGroup label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Business email" icon={Mail} required />
                          <InputGroup label="Land Line" name="landline_number" value={formData.landline_number} onChange={handleInputChange} placeholder="Landline connection" icon={Phone} />

                          <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white group-focus-within:text-yellow-400 transition-colors flex items-center gap-2">
                              <Phone size={12} className="text-yellow-400" /> Mobile Number <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-1">
                                <select
                                  name="country_code"
                                  value={formData.country_code}
                                  onChange={handleInputChange}
                                  className="w-full px-2 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-black text-[11px] focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-center appearance-none cursor-pointer"
                                >
                                  <option value="IN" className="bg-[#0b1a3d]">+91 IN</option>
                                  <option value="UK" className="bg-[#0b1a3d]">+44 UK</option>
                                </select>
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  name="mobile_number"
                                  value={formData.mobile_number}
                                  onChange={handleInputChange}
                                  placeholder="Main operator line"
                                  required
                                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          <InputGroup label="Digital Presence" name="social_media_website_link" value={formData.social_media_website_link} onChange={handleInputChange} placeholder="Website or Social link" icon={Globe} />
                        </div>
                      </div>

                      {/* Store Details */}
                      <div className="space-y-10 pt-10 border-t border-white/[0.08]">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 shrink-0">Section 02. Establishment Profile</h3>
                          <div className="h-px w-full bg-gradient-to-r from-yellow-400/20 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <InputGroup label="Trading Name" name="store_name" value={formData.store_name} onChange={handleInputChange} placeholder="Licensed name" icon={Store} required />
                          <InputGroup label="Brand identity" name="brand_name" value={formData.brand_name} onChange={handleInputChange} placeholder="Public brand name" icon={Briefcase} required />

                          <SelectGroup label="Business Category" name="business_type" value={formData.business_type} onChange={handleInputChange} options={[{ value: "Restaurant", label: "Restaurant" }, { value: "Bakery", label: "Bakery" }, { value: "Cafe", label: "Cafe" }]} icon={Briefcase} required />
                          <SelectGroup
                            label="Cuisine Type"
                            name="cuisine_type"
                            value={formData.cuisine_type}
                            onChange={handleInputChange}
                            options={[
                              { value: "0", label: "Indian" },
                              { value: "1", label: "Afghan" },
                              { value: "2", label: "Pakistani" },
                              { value: "3", label: "Chinese" },
                              { value: "4", label: "Italian" },
                              { value: "5", label: "Thai" },
                              { value: "6", label: "Mexican" },
                              { value: "7", label: "Fried Chicken" }
                            ]}
                            icon={Store}
                            required
                          />

                          <SelectGroup label="Network Scope" name="number_of_locations" value={formData.number_of_locations} onChange={handleInputChange} options={[{ value: "1", label: "Single Unit" }, { value: "2-5", label: "2-5 Units" }, { value: "5+", label: "5+ Units" }]} icon={Building2} required />
                          <InputGroup label="Floor / Unit" name="floor_suite" value={formData.floor_suite} onChange={handleInputChange} placeholder="e.g. Ground Floor, Suite 402" icon={Building2} />

                          <div className="md:col-span-2">
                            <InputGroup label="Operational Headquarters" name="store_address" value={formData.store_address} onChange={handleInputChange} placeholder="Full physical location address" icon={MapPin} required />
                          </div>
                        </div>
                      </div>

                      {/* Compliance */}
                      <div className="space-y-10 pt-10 border-t border-white/[0.08]">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 shrink-0">Section 03. Regulatory Compliance</h3>
                          <div className="h-px w-full bg-gradient-to-r from-yellow-400/20 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <FileUpload label="Food Business License" name="food_business_license" value={formData.food_business_license} onChange={handleInputChange} icon={Shield} required />
                          <FileUpload label="Hygiene Certificate" name="food_hygiene_certificate" value={formData.food_hygiene_certificate} onChange={handleInputChange} icon={CheckCircle} required />
                          <FileUpload label="Business Registration" name="business_registration_certificate" value={formData.business_registration_certificate} onChange={handleInputChange} icon={Briefcase} required />
                          <InputGroup label="VAT Identifer" name="vat_registration_number" value={formData.vat_registration_number} onChange={handleInputChange} placeholder="Tax Identifier" icon={Hash} />
                        </div>
                      </div>

                      {/* Financial */}
                      <div className="space-y-10 pt-10 border-t border-white/[0.08]">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 shrink-0">Section 04. Financial Settlement</h3>
                          <div className="h-px w-full bg-gradient-to-r from-yellow-400/20 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <InputGroup label="Account Holder" name="bank_account_name" value={formData.bank_account_name} onChange={handleInputChange} placeholder="Beneficiary name" icon={Users} required />
                          <InputGroup label="Account Number" name="bank_account_number" value={formData.bank_account_number} onChange={handleInputChange} placeholder="Primary digits" icon={Hash} required />
                          <InputGroup label="Sort Code" name="bank_sort_code" value={formData.bank_sort_code} onChange={handleInputChange} placeholder="Branch identifier" icon={Building2} required />
                          <FileUpload label="Bank Verification" name="bank_statement_file" value={formData.bank_statement_file} onChange={handleInputChange} icon={Download} required />
                        </div>
                      </div>
                      <div className="pt-10 flex flex-col sm:flex-row justify-between items-center gap-8 border-t border-white/[0.08]">
                        <div className="flex items-start gap-4 max-w-xl text-xs font-medium text-white/50 italic">
                          <AlertCircle className="shrink-0 text-yellow-500" size={18} />
                          <p>By submitting, you certify that all enterprise data provided is legally accurate for audit.</p>
                        </div>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full sm:w-auto px-16 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold text-sm rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 disabled:opacity-50"
                        >
                          {submitting ? (
                            <div className="flex items-center gap-3">
                              <Loader2 className="animate-spin" size={20} />
                              Transmitting...
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Send size={18} className="font-bold" />
                              {isEditing ? "Re-submit Portal" : "Submit Global Application"}
                            </div>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0b1a3d] border border-white/[0.08] p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Audit Feedback</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6">Specify reasons for declining this application</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document mismatch, invalid tax ID..."
                className="w-full h-32 p-5 bg-white/5 border border-white/[0.08] rounded-2xl text-white font-bold placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500/40 transition-all text-sm mb-6"
              />
              <div className="flex gap-4">
                <button onClick={() => setRejectingId(null)} className="flex-1 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border border-white/[0.08]">Cancel</button>
                <button onClick={() => handleUpdateStatus(rejectingId, 2, rejectionReason)} className="flex-1 py-4 bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg">Confirm Rejection</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewing Modal */}
      <AnimatePresence>
        {viewingProfile && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#0b1a3d] border border-white/[0.08] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button
                onClick={() => setViewingProfile(null)}
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/[0.08] transition-all z-20"
              >
                <X size={24} />
              </button>

              <div className="p-8 sm:p-12">
                <div className="flex items-center gap-6 mb-12 pb-8 border-b border-white/[0.08]">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-blue-500 rounded-[2rem] flex items-center justify-center font-black text-3xl text-white shadow-2xl">
                    {viewingProfile.store_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-1">{viewingProfile.store_name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                        REF: #ZBR-{viewingProfile.id.toString().padStart(4, '0')}
                      </span>
                      <span className="text-white/30 font-bold text-xs uppercase tracking-widest">Enterprise Profile</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Sections */}
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Business Details</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <DetailRow label="Trading Name" value={viewingProfile.store_name} icon={Store} />
                        <DetailRow label="Brand Identity" value={viewingProfile.brand_name} icon={Briefcase} />
                        <DetailRow label="Category" value={viewingProfile.business_type} icon={Briefcase} />
                        <DetailRow label="Cuisine Type" value={viewingProfile.cuisine_type} icon={Store} isCuisine />
                        <DetailRow label="Operational Address" value={viewingProfile.store_address} icon={MapPin} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Contact Protocol</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <DetailRow label="Full Name" value={`${viewingProfile.first_name} ${viewingProfile.surname}`} icon={Users} />
                        <DetailRow label="Email Line" value={viewingProfile.email} icon={Mail} />
                        <DetailRow label="Mobile Line" value={`${viewingProfile.country_code} ${viewingProfile.mobile_number}`} icon={Phone} />
                        <DetailRow label="Digital Signature" value={viewingProfile.social_media_website_link} icon={Globe} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Verification Vault</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <DetailRow label="Food License" value={viewingProfile.food_business_license} isFile icon={Shield} />
                        <DetailRow label="Hygiene Cert" value={viewingProfile.food_hygiene_certificate} isFile icon={CheckCircle} />
                        <DetailRow label="Business Reg" value={viewingProfile.business_registration_certificate} isFile icon={Briefcase} />
                        <DetailRow label="Tax identifier" value={viewingProfile.vat_registration_number} icon={Hash} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Financial Node</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <DetailRow label="Account Name" value={viewingProfile.bank_account_name} icon={Users} />
                        <DetailRow label="Account Digits" value={viewingProfile.bank_account_number} icon={Hash} />
                        <DetailRow label="Sort Code" value={viewingProfile.bank_sort_code} icon={Building2} />
                        <DetailRow label="Bank Statement" value={viewingProfile.bank_statement_file} isFile icon={Download} />
                      </div>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && viewingProfile.status === 0 && (
                  <div className="mt-14 pt-10 border-t border-white/[0.08] flex gap-5">
                    <button onClick={() => handleUpdateStatus(viewingProfile.id, 1)} className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all shadow-emerald-500/20 active:scale-95">Accept Application</button>
                    <button onClick={() => setRejectingId(viewingProfile.id)} className="flex-1 py-5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all shadow-rose-500/20 active:scale-95">Decline Application</button>
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

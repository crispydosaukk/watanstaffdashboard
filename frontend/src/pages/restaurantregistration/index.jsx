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
  Edit3, ArrowLeft, Send
} from "lucide-react";
import api from "../../api.js";

const InputGroup = ({ label, icon: Icon, value, onChange, placeholder, type = "text", required = false, name }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-white/70 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-emerald-400" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-outfit"
    />
  </div>
);

const SelectGroup = ({ label, icon: Icon, value, onChange, options, required = false, name }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-white/70 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-emerald-400" />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 bg-[#1A4D3A] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer font-outfit"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <ChevronRight className="rotate-90" size={16} />
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
    <div className="p-2 bg-emerald-500/10 rounded-xl">
      {Icon && <Icon className="text-emerald-400" size={18} />}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{label}</p>
      <p className="text-white font-semibold">{value || "—"}</p>
    </div>
  </div>
);

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
    store_address: "",
    floor_suite: "",
    store_name: "",
    brand_name: "",
    business_type: "Restaurant",
    cuisine_type: "",
    number_of_locations: "",
    social_media_website_link: ""
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
          store_address: res.data.data.store_address || "",
          floor_suite: res.data.data.floor_suite || "",
          store_name: res.data.data.store_name || "",
          brand_name: res.data.data.brand_name || "",
          business_type: res.data.data.business_type || "Restaurant",
          cuisine_type: res.data.data.cuisine_type || "",
          number_of_locations: res.data.data.number_of_locations || "",
          social_media_website_link: res.data.data.social_media_website_link || ""
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
    try {
      let res;
      if (myProfile) {
        // Update
        res = await api.put("/merchant-profile/my-update", formData);
      } else {
        // Create
        res = await api.post("/merchant-profiles", formData);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-outfit">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 text-white min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            
            {/* Page Header - Hidden when editing or viewing status to save space */}
            {!isEditing && !(myProfile && !isSuperAdmin) && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                      <Store className="text-white" size={28} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black text-white drop-shadow-lg tracking-tight uppercase">Restaurant Registration</h1>
                      <p className="text-white/90 mt-1 text-base drop-shadow">
                        {isSuperAdmin ? "Approval queue for merchant store profiles" : "Register your business and track your application status"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {isSuperAdmin ? (
              /* SUPER ADMIN VIEW: LIST OF SUBMISSIONS */
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Total Apps</p>
                      <h3 className="text-2xl font-black mt-1">{merchantProfiles.length}</h3>
                    </div>
                    <Users className="text-white/20" size={28} />
                  </div>
                  <div className="bg-amber-500/10 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/20 shadow-2xl flex items-center justify-between text-amber-400">
                    <div>
                      <p className="text-amber-400/60 text-[10px] font-black uppercase tracking-widest">Pending</p>
                      <h3 className="text-2xl font-black mt-1">{merchantProfiles.filter(p=>p.status===0).length}</h3>
                    </div>
                    <Clock size={28} />
                  </div>
                  <div className="bg-emerald-500/10 backdrop-blur-xl rounded-2xl p-5 border border-emerald-500/20 shadow-2xl flex items-center justify-between text-emerald-400">
                    <div>
                      <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest">Approved</p>
                      <h3 className="text-2xl font-black mt-1">{merchantProfiles.filter(p=>p.status===1).length}</h3>
                    </div>
                    <CheckCircle size={28} />
                  </div>
                  <div className="bg-rose-500/10 backdrop-blur-xl rounded-2xl p-5 border border-rose-500/20 shadow-2xl flex items-center justify-between text-rose-400">
                    <div>
                      <p className="text-rose-400/60 text-[10px] font-black uppercase tracking-widest">Declined</p>
                      <h3 className="text-2xl font-black mt-1">{merchantProfiles.filter(p=>p.status===2).length}</h3>
                    </div>
                    <AlertCircle size={28} />
                  </div>
                </div>

                {/* Search & Actions */}
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input 
                    type="text"
                    placeholder="Search by store name, applicant name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white/10 backdrop-blur-xl border-2 border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 shadow-2xl transition-all"
                  />
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-left border-b border-white/5">
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Business</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Applicant</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Status</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-white/30 tracking-[0.3em] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredProfiles.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-10 py-16 text-center opacity-40 uppercase tracking-widest font-black">No Records Found</td>
                            </tr>
                        ) : (
                          filteredProfiles.map((p) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${p.status === 1 ? 'bg-emerald-500' : p.status === 2 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                                      {p.store_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="font-black text-lg tracking-tight uppercase">{p.store_name}</p>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <p className="font-bold">{p.first_name} {p.surname}</p>
                                  <p className="text-white/40 text-[10px] mt-0.5">{p.email}</p>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${p.status === 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : p.status === 1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                        {p.status === 0 && <Clock size={10} />}
                                        {p.status === 1 && <CheckCircle size={10} />}
                                        {p.status === 2 && <X size={10} />}
                                        {p.status === 0 ? "Pending" : p.status === 1 ? "Approved" : "Declined"}
                                      </span>
                                      <button onClick={() => setViewingProfile(p)} className="p-1.5 bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 rounded-lg transition-all border border-white/10"><Eye size={14} /></button>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center justify-center gap-3">
                                    {p.status === 0 && (
                                      <>
                                        <button onClick={() => handleUpdateStatus(p.id, 1)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-all"><Check size={18} /></button>
                                        <button onClick={() => setRejectingId(p.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all"><X size={18} /></button>
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
                className="flex-1 flex items-center justify-center"
              >
                <div className="bg-white/10 backdrop-blur-[40px] rounded-[2.5rem] p-10 md:p-12 border border-white/20 shadow-2xl relative overflow-hidden w-full max-w-4xl">
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="relative flex flex-col items-center text-center space-y-8">
                     
                     {/* Status Icon */}
                     <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-2xl relative ${myProfile.status === 0 ? 'bg-amber-500/10 border-amber-500/30' : myProfile.status === 1 ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                        {myProfile.status === 0 && <Clock size={40} className="text-amber-400" />}
                        {myProfile.status === 1 && <CheckCircle size={40} className="text-emerald-400" />}
                        {myProfile.status === 2 && <AlertCircle size={40} className="text-rose-400" />}
                     </div>

                     {/* Main Text */}
                     <div className="space-y-4">
                        <h2 className={`text-4xl font-black uppercase tracking-tight leading-none ${myProfile.status === 1 ? 'text-emerald-400' : myProfile.status === 2 ? 'text-rose-400' : 'text-white'}`}>
                           {myProfile.status === 0 ? "APPLICATION UNDER REVIEW" : myProfile.status === 1 ? "PARTNER VERIFIED" : "APPLICATION DECLINED"}
                        </h2>
                        <p className="text-white/60 text-lg font-medium max-w-2xl leading-relaxed">
                           {myProfile.status === 0 && <>Your request has been successfully submitted. Our enterprise compliance team is currently auditing your store details. Please expect formal acceptance within <span className="text-emerald-400 font-black">24 hours</span>.</>}
                           {myProfile.status === 1 && <>Congratulations! <span className="font-black text-white">{myProfile.store_name}</span> is now a verified ZingBite partner. You can now access your restaurant operations.</>}
                           {myProfile.status === 2 && <>Unfortunately, your application for <span className="font-black text-white">{myProfile.store_name}</span> was not successful this time.</>}
                        </p>
                     </div>

                     {/* Compact Info Badges */}
                     <div className="flex flex-wrap items-center justify-center gap-3">
                        <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-start">
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Store Profile</span>
                           <span className="font-black text-sm uppercase">{myProfile.store_name}</span>
                        </div>
                        <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-start">
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Reference ID</span>
                           <span className="font-black text-sm text-emerald-400">#ZBR-{myProfile.id.toString().padStart(4, '0')}</span>
                        </div>
                        {myProfile.status === 2 && myProfile.rejection_reason && (
                           <div className="px-5 py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-start max-w-xs">
                              <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Audit Feedback</span>
                              <span className="font-bold text-rose-100 text-[11px] italic line-clamp-1">"{myProfile.rejection_reason}"</span>
                           </div>
                        )}
                     </div>

                     {/* Action Buttons */}
                     <div className="pt-4 flex flex-wrap gap-4 items-center justify-center">
                        {myProfile.status === 1 ? (
                          <button className="px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all active:scale-95">
                             Launch My Dashboard
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setViewingProfile(myProfile)}
                              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 transition-all flex items-center gap-2"
                            >
                               <Eye size={16} /> View Submitted Details
                            </button>
                            <button 
                               onClick={() => setIsEditing(true)}
                               className="px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-emerald-500/20 transition-all flex items-center gap-2"
                            >
                               <Edit3 size={16} /> Edit & Resubmit
                            </button>
                          </>
                        )}
                     </div>

                     {myProfile.status === 2 && (
                       <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Modified application will go back for a fresh review audit</p>
                     )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* REGISTRATION FORM (Create or Edit) */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto bg-white/10 backdrop-blur-[40px] rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden mb-10"
              >
                <div className="px-10 py-10 border-b border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div>
                    <div className="flex items-center gap-4 mb-2">
                        {isEditing ? (
                           <button onClick={() => setIsEditing(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><ArrowLeft size={20} /></button>
                        ) : (
                          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/30"><Plus className="text-emerald-400" size={24} /></div>
                        )}
                        <h2 className="text-3xl font-black uppercase tracking-tight text-white">{isEditing ? "Modify Application" : "Merchant Onboarding"}</h2>
                    </div>
                    <p className="text-white/40 font-bold text-sm uppercase tracking-widest">{isEditing ? "Refine your business profile and trigger a re-audit" : "Initiate your enterprise partnership with ZingBite"}</p>
                   </div>
                   {isEditing && (
                     <div className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Editing Mode
                     </div>
                   )}
                </div>

                <form onSubmit={handleSubmit} className="p-10 md:p-12 space-y-12">
                   {/* Personal Info */}
                   <div className="space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Section 01. Contact Protocol</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputGroup label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} placeholder="Legal name" required />
                      <InputGroup label="Surname" name="surname" value={formData.surname} onChange={handleInputChange} placeholder="Last name" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputGroup label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Business email" required />
                      <div className="grid grid-cols-3 gap-3">
                         <div className="col-span-1">
                            <SelectGroup label="Code" name="country_code" value={formData.country_code} onChange={handleInputChange} options={[{ value: "IN", label: "IND (+91)" }, { value: "UK", label: "GBR (+44)" }]} required />
                         </div>
                         <div className="col-span-2">
                            <InputGroup label="Number" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} placeholder="Phone line" required />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Store Details */}
                  <div className="space-y-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Section 02. Establishment Profile</h3>
                    <div className="space-y-8">
                      <InputGroup label="Store Address" name="store_address" value={formData.store_address} onChange={handleInputChange} placeholder="Operational address" required />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Floor/Suite" name="floor_suite" value={formData.floor_suite} onChange={handleInputChange} placeholder="Unit #" />
                        <InputGroup label="Entity Trading Name" name="store_name" value={formData.store_name} onChange={handleInputChange} placeholder="Licensed name" required />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Brand identity" name="brand_name" value={formData.brand_name} onChange={handleInputChange} placeholder="Brand name" required />
                        <SelectGroup label="Category" name="business_type" value={formData.business_type} onChange={handleInputChange} options={[{ value: "Restaurant", label: "Restaurant" }, { value: "Bakery", label: "Bakery" }, { value: "Cafe", label: "Cafe" }]} required />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SelectGroup label="Cuisine" name="cuisine_type" value={formData.cuisine_type} onChange={handleInputChange} options={[{ value: "Indian", label: "Classic Indian" }, { value: "Continental", label: "Continental" }, { value: "Bakery", label: "Bakery & Sweets" }]} required />
                        <SelectGroup label="Scope" name="number_of_locations" value={formData.number_of_locations} onChange={handleInputChange} options={[{ value: "1", label: "Single Unit" }, { value: "2-5", label: "2-5 Units" }, { value: "5+", label: "5+ Units" }]} required />
                      </div>
                      <InputGroup label="Digital Link" name="social_media_website_link" value={formData.social_media_website_link} onChange={handleInputChange} placeholder="Website/Instagram" />
                    </div>
                  </div>

                  <div className="pt-6">
                     <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest text-lg rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-40"
                     >
                        {submitting ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : (isEditing ? <><Send size={22} /> Resubmit Application</> : <><Save size={22} /> Initiate Registration</>)}
                     </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* DETAIL VIEW MODAL (UNI-MODAL FOR BOTH ADMIN & USER) */}
            <AnimatePresence>
              {viewingProfile && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0f172a] w-full max-w-4xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                  >
                    <div className="px-8 py-6 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${viewingProfile.status === 1 ? 'bg-emerald-500' : viewingProfile.status === 2 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                            {viewingProfile.store_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">{viewingProfile.store_name}</h3>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Application ID #ZBR-{viewingProfile.id}</p>
                          </div>
                       </div>
                       <button onClick={() => setViewingProfile(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Contact Details */}
                            <div className="space-y-4">
                               <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2 flex items-center gap-2">
                                  <Users size={14} /> Contact Information
                               </h5>
                               <div className="grid grid-cols-1 gap-3">
                                  <DetailRow label="Applicant Name" value={`${viewingProfile.first_name} ${viewingProfile.surname}`} icon={Users} />
                                  <DetailRow label="Direct Email" value={viewingProfile.email} icon={Mail} />
                                  <DetailRow label="Mobile Line" value={`${viewingProfile.country_code} ${viewingProfile.mobile_number}`} icon={Phone} />
                               </div>
                            </div>

                            {/* Store Details */}
                            <div className="space-y-4">
                               <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2 flex items-center gap-2">
                                  <Building2 size={14} /> Business Architecture
                               </h5>
                               <div className="grid grid-cols-1 gap-3">
                                  <DetailRow label="Brand Identify" value={viewingProfile.brand_name} icon={Briefcase} />
                                  <DetailRow label="Business Category" value={viewingProfile.business_type} icon={Info} />
                                  <DetailRow label="Cuisine Type" value={viewingProfile.cuisine_type} icon={Store} />
                                  <DetailRow label="Network reach" value={`${viewingProfile.number_of_locations} Location(s)`} icon={Globe} />
                               </div>
                            </div>

                            {/* Address & Social */}
                            <div className="lg:col-span-2 space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2 flex items-center gap-2">
                                  <MapPin size={14} /> Logistics & Digital
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Physical Location</p>
                                      <p className="text-sm font-bold leading-relaxed">{viewingProfile.store_address}</p>
                                      {viewingProfile.floor_suite && <p className="text-xs text-emerald-400 mt-2 font-bold">{viewingProfile.floor_suite}</p>}
                                   </div>
                                   {viewingProfile.social_media_website_link ? (
                                     <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Digital Signature</p>
                                        <a href={viewingProfile.social_media_website_link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold text-sm block truncate">
                                          {viewingProfile.social_media_website_link}
                                        </a>
                                     </div>
                                   ) : (
                                     <div className="p-5 bg-white/5 rounded-2xl border border-white/5 opacity-30 flex items-center justify-center italic text-xs tracking-widest font-black uppercase">No Digital Signature</div>
                                   )}
                                </div>
                            </div>
                       </div>
                    </div>

                    {isSuperAdmin && viewingProfile.status === 0 && (
                      <div className="px-8 py-6 bg-white/5 border-t border-white/10 flex gap-4 shrink-0">
                         <button onClick={() => handleUpdateStatus(viewingProfile.id, 1)} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl flex items-center justify-center gap-2"><Check size={18} /> Approve</button>
                         <button onClick={() => setRejectingId(viewingProfile.id)} className="flex-1 py-4 bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 font-black uppercase tracking-widest text-xs rounded-xl border border-rose-500/20"><X size={18} /> Decline</button>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Admin Rejection Modal */}
            <AnimatePresence>
              {rejectingId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-rose-500/20 shadow-2xl overflow-hidden p-8 space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-xl font-black uppercase tracking-tight text-rose-400">Audit Decline</h3>
                       <button onClick={() => setRejectingId(null)} className="text-white/40 hover:text-white"><X size={24} /></button>
                    </div>
                    <textarea 
                      className="w-full h-32 px-5 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition-all resize-none text-sm font-medium"
                      placeholder="Enter specific audit failure feedback..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    ></textarea>
                    <div className="flex gap-3">
                       <button onClick={() => setRejectingId(null)} className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl">Cancel</button>
                       <button disabled={!rejectionReason.trim()} onClick={() => handleUpdateStatus(rejectingId, 2, rejectionReason)} className="flex-1 py-4 bg-rose-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl disabled:opacity-40">Finalize Decline</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

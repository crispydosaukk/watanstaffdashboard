// src/pages/offers/index.jsx
import { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Sparkles, Megaphone, Plus, Image as ImageIcon,
  Upload, X, Layers, ShoppingBag, Info, Save, Trash2, Edit
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

export default function OffersPage() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectionTab, setSelectionTab] = useState("categories");

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    banner: null,
    bannerPreview: null,
    target_categories: [],
    target_products: []
  });

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch(`${API}/offers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setOffers(data);
    } catch (err) { }
  };

  useEffect(() => {
    loadData();
    fetch(`${API}/category`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).then(setCategories).catch(err => console.error(err));
    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).then(setProducts).catch(err => console.error(err));
  }, [API, token]);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({
        ...prev,
        banner: file,
        bannerPreview: URL.createObjectURL(file)
      }));
    }
  };

  const toggleTarget = (type, id) => {
    setForm(prev => {
      const current = prev[type];
      const exists = current.includes(id);
      return { ...prev, [type]: exists ? current.filter(i => i !== id) : [...current, id] };
    });
  };

  const handleSubmit = async () => {
    if (!form.title) return alert("Title is required");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("status", "active");
      if (form.banner) fd.append("banner", form.banner);
      const targets = [...form.target_categories.map(id => ({ type: 'category', id })), ...form.target_products.map(id => ({ type: 'product', id }))];
      fd.append("targets", JSON.stringify(targets));
      const url = isEdit ? `${API}/offers/${form.id}` : `${API}/offers`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.ok) {
        setShowModal(false);
        setIsEdit(false);
        resetForm();
        loadData();
      }
    } catch (err) { } finally { setLoading(false); }
  };

  const resetForm = () => setForm({ id: null, title: "", description: "", banner: null, bannerPreview: null, target_categories: [], target_products: [] });

  const handleEdit = (offer) => {
    setIsEdit(true);
    setForm({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      banner: null,
      bannerPreview: offer.banner_image ? `${API_BASE}/uploads/${offer.banner_image}` : null,
      target_categories: offer.targets?.filter(t => t.type === 'category').map(t => t.id) || [],
      target_products: offer.targets?.filter(t => t.type === 'product').map(t => t.id) || []
    });
    setShowModal(true);
  };

  const handleSelectAll = () => {
    const list = selectionTab === "categories" ? categories : products;
    const current = selectionTab === "categories" ? form.target_categories : form.target_products;
    const allIds = list.map(x => x.id);
    const isAll = current.length === allIds.length;
    setForm(prev => ({ ...prev, [selectionTab === "categories" ? "target_categories" : "target_products"]: isAll ? [] : allIds }));
  };

  const handleDelete = (id) => {
    showPopup({
      title: "Delete Offer",
      message: "Are you sure you want to delete this offer?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`${API}/offers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          loadData();
          showPopup({ title: "Deleted", message: "Offer deleted successfully.", type: "success" });
        } catch (err) {
          showPopup({ title: "Error", message: "Failed to delete offer.", type: "error" });
        }
      }
    });
  };

  const handleToggle = async (offer) => {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`${API}/offers/toggle/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) { }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-[#D0B079]/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-16 min-h-0 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`flex-1 flex flex-col pt-16 lg:pt-20 min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-4 lg:pt-8 pb-12 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-8">

              {/* Offers Welcome Section */}
              <div className="mb-8 space-y-8 sm:-mt-16 -mt-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                      <Tag className="text-yellow-400" size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-lg leading-none">Offers & Promotions</h1>
                      <p className="text-white mt-1.5 text-sm font-medium tracking-wide leading-none">Create and manage special offers for your customers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsEdit(false); resetForm(); setShowModal(true); }}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] text-slate-900 rounded-xl font-bold text-base shadow-2xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Plus size={16} /> Add New Offer
                  </button>
                </div>
              </div>

              {/* Active Campaigns List */}
              <div className="flex items-center gap-4 mb-10">
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-3"><Tag size={16} className="text-yellow-400" /> Current Offers</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {offers.map((offer) => (
                  <div key={offer.id} className={`bg-[#0b1a3d]/60 backdrop-blur-xl border ${offer.status === 'active' ? 'border-white/[0.08]' : 'border-rose-500/20 opacity-60 grayscale'} rounded-[2rem] overflow-hidden group transition-all`}>
                    <div className="h-44 bg-black/20 relative overflow-hidden border-b border-white/[0.05]">
                      {offer.banner_image ? (
                        <img src={`${API_BASE}/uploads/${offer.banner_image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={40} className="text-white/10" /></div>
                      )}
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 text-[10px] font-bold capitalize rounded-full border backdrop-blur-md ${offer.status === 'active' ? 'bg-[#D0B079]/20 text-yellow-400 border-[#D0B079]/30' : 'bg-white/10 text-white/40 border-white/20'}`}>
                          {offer.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate">{offer.title}</h4>
                        <p className="text-xs font-medium text-white/50 tracking-wide mt-1.5 leading-relaxed line-clamp-2">{offer.description || "No description available"}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <div className="relative group/toggle cursor-pointer" onClick={() => handleToggle(offer)}>
                            <input type="checkbox" className="sr-only" checked={offer.status === 'active'} readOnly />
                            <div className={`w-10 h-5 rounded-full transition-colors ${offer.status === 'active' ? 'bg-[#D0B079]' : 'bg-white/10'}`}></div>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${offer.status === 'active' ? 'translate-x-5' : ''}`}></div>
                          </div>
                          <span className={`text-[10px] font-bold tracking-wide transition-colors ${offer.status === 'active' ? 'text-yellow-400' : 'text-white/30'}`}>
                            {offer.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(offer)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-yellow-400 hover:bg-[#D0B079]/10 transition-all"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(offer.id)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => { setIsEdit(false); resetForm(); setShowModal(true); }}
                  className="bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[2rem] h-full min-h-[280px] flex flex-col items-center justify-center gap-4 group hover:bg-white/5 hover:border-[#D0B079]/30 transition-all"
                >
                  <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-[#D0B079]/10 transition-colors"><Plus className="text-white/20 group-hover:text-yellow-400" size={32} /></div>
                  <span className="text-white/20 font-bold text-sm">Create Offer</span>
                </button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
              <div className="sticky top-0 z-10 p-8 border-b border-white/[0.08] bg-white/5 backdrop-blur-xl flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{isEdit ? "Update Campaign" : "New Campaign"}</h2>
                  <p className="text-xs font-medium text-white/40 tracking-wide mt-1">Campaign Details</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                       <ImageIcon size={14} /> Campaign Offer Banner <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Recommended: 1280 x 720px (Max 2MB)</span>
                  </div>
                  <div className="relative group">
                    <input type="file" id="offerBanner" className="hidden" accept="image/*" onChange={handleBannerChange} />
                    <label htmlFor="offerBanner" className={`cursor-pointer min-h-[220px] rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative ${form.bannerPreview ? 'border-[#D0B079]/40' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      {form.bannerPreview ? (
                        <img src={form.bannerPreview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
                      ) : (
                        <div className="text-center p-6"><Upload size={32} className="mx-auto text-white/10 mb-4" /><p className="text-xs font-bold text-white/40">Drag or upload offer image</p></div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                        <Upload size={24} className="text-white mb-2" />
                        <span className="text-xs font-bold text-white">Change Image</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-white mb-3">Offer Title <span className="text-rose-500">*</span></label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-yellow-400/40 transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white mb-3">Offer Description</label>
                    <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-yellow-400/40 transition-all shadow-inner" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 py-3 border-b border-white/[0.08] text-sm font-bold uppercase tracking-wider text-white grid grid-cols-[80px_1fr_1.5fr_1fr_120px_140px] items-center">
                    <div className="px-6 flex items-center justify-center"></div>
                    <div className="px-6 flex items-center">Banner</div>
                    <div className="px-6 flex items-center">Title & Logic</div>
                    <div className="px-6 flex items-center">Validation</div>
                    <div className="px-6 flex items-center justify-center">Status</div>
                    <div className="px-6 flex items-center justify-end">Actions</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white">Target Items</label>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      <button onClick={() => setSelectionTab("categories")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectionTab === 'categories' ? 'bg-gradient-to-r from-[#D0B079] to-[#b8965f] text-[#071428]' : 'text-white/40'}`}>Categories</button>
                      <button onClick={() => setSelectionTab("products")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectionTab === 'products' ? 'bg-gradient-to-r from-[#D0B079] to-[#b8965f] text-[#071428]' : 'text-white/40'}`}>Products</button>
                    </div>
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-white/10 rounded-[1.5rem] max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(selectionTab === 'categories' ? categories : products).map(item => (
                        <div
                          key={item.id}
                          onClick={() => toggleTarget(selectionTab === 'categories' ? "target_categories" : "target_products", item.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${(selectionTab === 'categories' ? form.target_categories : form.target_products).includes(item.id) ? 'bg-[#D0B079]/10 border-yellow-400' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}
                        >
                          <div className="shrink-0">{selectionTab === 'categories' ? <Layers size={14} /> : <ShoppingBag size={14} />}</div>
                          <span className="text-xs font-bold truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white/5 border-t border-white/10 flex justify-end gap-4">
                <button onClick={() => setShowModal(false)} className="px-8 py-4 text-xs font-bold text-white/40 hover:text-white transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={loading} className="px-10 py-4 bg-gradient-to-r from-[#D0B079] to-[#b8965f] hover:from-[#b8965f] hover:to-[#a3804d] text-slate-900 rounded-2xl font-bold text-xs shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Campaign"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

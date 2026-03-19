// src/pages/category/index.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, GripVertical, Search, Plus, X, Upload, Save, Check, RefreshCw, Store, Zap, ChevronRight, Globe, Image as ImageIcon, Info, Loader2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePopup } from "../../context/PopupContext";

export default function Category() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: "",
    image: null,
    oldImage: "",
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [categories, setCategories] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // GLOBAL SEARCH STATE
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  // INTEGRATE MODAL STATE (SUPER ADMIN)
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = userData.role_title === "Super Admin" || userData.role_id === 6;
  const [showIntegrateModal, setShowIntegrateModal] = useState(false);
  const [integrateSearch, setIntegrateSearch] = useState("");
  const [integrateResults, setIntegrateResults] = useState([]);
  const [targetRestaurantId, setTargetRestaurantId] = useState("");
  const [selectedSourceCat, setSelectedSourceCat] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [integrating, setIntegrating] = useState(false);

  // =============================
  // FETCH ALL CATEGORIES (SORT SAFE)
  // =============================
  useEffect(() => {
    if (!API || !token) return;

    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) =>
        setCategories(
          Array.isArray(data)
            ? [...data].sort((a, b) => a.sort_order - b.sort_order)
            : []
        )
      )
      .catch((err) => console.error("Error fetching categories:", err));
  }, [API, token]);

  // =============================
  // SEARCH DEBOUNCE
  // =============================
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(searchQuery.trim().toLowerCase()),
      300
    );
    return () => clearTimeout(t);
  }, [searchQuery]);

  // =============================
  // GLOBAL SEARCH EFFECT
  // =============================
  useEffect(() => {
    if (!showSearchModal || !globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}/category/search-global?q=${encodeURIComponent(globalSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setGlobalSearchResults(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 300);
    return () => clearTimeout(t);
  }, [globalSearchQuery, showSearchModal, API, token]);

  // =============================
  // ADMIN CATEGORY SEARCH
  // =============================
  useEffect(() => {
    if (!showIntegrateModal || !integrateSearch.trim()) {
      setIntegrateResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}/category/admin-search-global?q=${encodeURIComponent(integrateSearch)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setIntegrateResults(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 300);
    return () => clearTimeout(t);
  }, [integrateSearch, showIntegrateModal, API, token]);

  // =============================
  // FETCH RESTAURANTS FOR INTEGRATE
  // =============================
  useEffect(() => {
    if (showIntegrateModal && isSuperAdmin) {
      fetch(`${API}/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setRestaurants(data.data || []))
        .catch(err => console.error(err));
    }
  }, [showIntegrateModal, isSuperAdmin, API, token]);

  const handleIntegrate = async () => {
    if (!selectedSourceCat || !targetRestaurantId) {
      showPopup({ title: "Incomplete", message: "Please select a category and target restaurant.", type: "error" });
      return;
    }

    setIntegrating(true);
    try {
      const res = await fetch(`${API}/category/integrate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceCategoryId: selectedSourceCat.id,
          targetUserId: targetRestaurantId
        })
      });

      const data = await res.json();
      if (res.ok) {
        showPopup({ title: "Success", message: data.message, type: "success" });
        setShowIntegrateModal(false);
        setSelectedSourceCat(null);
        setTargetRestaurantId("");
        setIntegrateSearch("");
      } else {
        showPopup({ title: "Integration Failed", message: data.message, type: "error" });
      }
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: "Integrations server error", type: "error" });
    } finally {
      setIntegrating(false);
    }
  };

  const handleImportProducts = async (categoryName, targetCategoryId) => {
    try {
      const res = await fetch(`${API}/products/import-global`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryName, targetCategoryId }),
      });
      const data = await res.json();
      if (data.count > 0) {
        showPopup({
          title: "Import Success",
          message: `Successfully imported ${data.count} products for "${categoryName}".`,
          type: "success"
        });
      } else {
        showPopup({
          title: "Import Info",
          message: `No new products found for "${categoryName}" to import.`,
          type: "info"
        });
      }
    } catch (err) {
      console.error("Import products error:", err);
      showPopup({ title: "Import Failed", message: "Failed to import products.", type: "error" });
    }
  };

  const handleAddGlobalCategory = async (cat) => {
    const existingCat = categories.find(
      (c) => c.name.trim().toLowerCase() === cat.name.trim().toLowerCase()
    );

    if (existingCat) {
      showPopup({
        title: "Duplicate Category",
        message: `Category "${cat.name}" already exists. Check for new products?`,
        type: "confirm",
        onConfirm: async () => {
          await handleImportProducts(cat.name, existingCat.id);
          setShowSearchModal(false);
          setGlobalSearchQuery("");
        }
      });
      return;
    }

    showPopup({
      title: "Add Category?",
      message: `Add "${cat.name}" and its products to your list?`,
      type: "confirm",
      onConfirm: async () => {
        const fd = new FormData();
        fd.append("name", cat.name.trim());
        if (cat.image) fd.append("existingImage", cat.image);

        try {
          const res = await fetch(`${API}/category`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });

          if (!res.ok) {
            const err = await res.json();
            showPopup({ title: "Failed", message: err.message || "Failed to add", type: "error" });
            return;
          }

          const newData = await res.json();
          setCategories((prev) =>
            [...prev, newData].sort((a, b) => a.sort_order - b.sort_order)
          );
          setShowSearchModal(false);
          setGlobalSearchQuery("");

          showPopup({
            title: "Category Added",
            message: `Category "${cat.name}" added. Import related products now?`,
            type: "confirm",
            onConfirm: async () => {
              await handleImportProducts(cat.name, newData.id);
            }
          });
        } catch (err) {
          console.error("Add global error:", err);
          showPopup({ title: "Error", message: "Something went wrong", type: "error" });
        }
      }
    });
  };

  const filteredCategories = useMemo(() => {
    if (!debouncedQuery) return categories;
    const q = debouncedQuery;
    return categories.filter((c) => {
      if (!c) return false;
      if (c.name?.toLowerCase().includes(q)) return true;
      if (String(c.id).includes(q)) return true;
      return false;
    });
  }, [categories, debouncedQuery]);

  useEffect(() => {
    if (form.image instanceof File) {
      const url = URL.createObjectURL(form.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
  }, [form.image]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameTrim = form.name.trim();
    if (!nameTrim) return showPopup({ title: "Required", message: "Enter a category name", type: "warning" });

    const exists = categories.some(
      (c) => c.id !== form.id && c.name.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (exists) return showPopup({ title: "Duplicate", message: "Name already exists", type: "warning" });

    const fd = new FormData();
    fd.append("name", nameTrim);
    if (form.image) fd.append("image", form.image);

    try {
      let res;
      if (!isEdit) {
        res = await fetch(`${API}/category`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const newData = await res.json();
        setCategories((prev) => [...prev, newData].sort((a, b) => a.sort_order - b.sort_order));

        showPopup({
          title: "Added",
          message: `Category "${nameTrim}" added. Import products?`,
          type: "confirm",
          onConfirm: async () => { await handleImportProducts(nameTrim, newData.id); }
        });
      } else {
        res = await fetch(`${API}/category/${form.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const updated = await res.json();
        setCategories((prev) => prev.map((c) => c.id === form.id ? { ...c, ...updated } : c).sort((a, b) => a.sort_order - b.sort_order));
        showPopup({ title: "Success", message: "Updated successfully", type: "success" });
      }

      setShowModal(false);
      setIsEdit(false);
      setForm({ id: null, name: "", image: null, oldImage: "" });
      setPreviewUrl("");
    } catch (err) {
      console.error("Save error:", err);
      showPopup({ title: "Error", message: "Internal server error", type: "error" });
    }
  };

  const handleEdit = (item) => {
    setIsEdit(true);
    setForm({ id: item.id, name: item.name, image: null, oldImage: item.image || "" });
    setPreviewUrl("");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showPopup({
      title: "Delete?",
      message: "This node and its contents will be permanently purged. Proceed?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`${API}/category/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          setCategories((prev) => prev.filter((c) => c.id !== id));
          showPopup({ title: "Deleted", message: "Category node purged.", type: "success" });
        } catch (e) {
          showPopup({ title: "Error", message: "Purge failed", type: "error" });
        }
      }
    });
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 1 ? 0 : 1;
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, status: newStatus } : c));
    try {
      await fetch(`${API}/category/${cat.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: cat.name, status: newStatus }),
      });
    } catch (err) { }
  };

  const saveOrder = async (newList) => {
    const payload = newList.map((item, index) => ({ id: item.id, sort_order: index + 1 }));
    try {
      await fetch(`${API}/category/reorder`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ order: payload }),
      });
    } catch (err) { }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const updated = items.map((cat, index) => ({ ...cat, sort_order: index + 1 }));
    setCategories(updated);
    saveOrder(updated);
  };

  const CategoryCard = ({ item }) => {
    const imgUrl = item.image ? `${API_BASE}/uploads/${item.image}` : null;
    const status = item.status === 1;
    return (
      <div className={`bg-white/[0.03] backdrop-blur-md border ${status ? 'border-white/[0.08]' : 'border-rose-500/20 opacity-60'} rounded-[1.5rem] p-5 shadow-2xl transition-all`}>
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
            {imgUrl ? <img src={imgUrl} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full flex items-center justify-center text-[8px] font-black uppercase text-white/20">NO IMAGE</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-white tracking-tight uppercase truncate">{item.name}</h4>
            <div className="text-[9px] font-black text-white/30 tracking-[0.2em] mt-1">ID: {item.id}</div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => handleToggleStatus(item)} className={`px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${status ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                {status ? "ACTIVE" : "INACTIVE"}
              </button>
              <button onClick={() => handleEdit(item)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-yellow-400"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-rose-500"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-16 min-h-0 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={`flex-1 flex flex-col pt-16 lg:pt-20 min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-4 lg:pt-8 pb-12 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-8">

              {/* Page Header Area */}
              <div className="mb-8 space-y-8 -mt-12 sm:-mt-16">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <Zap className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg uppercase leading-none">Categories</h1>
                    <p className="text-white/40 mt-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] leading-none">Manage menu categories and sorting</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-3 bg-[#0b1a3d]/40 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-inner">
                  <div className="relative group flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={16} />
                    <input
                      placeholder="SEARCH CATEGORIES..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-white placeholder-white/10 focus:outline-none focus:border-yellow-500/40 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    {isSuperAdmin && (
                      <button onClick={() => setShowIntegrateModal(true)} className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95">
                        <Zap size={14} /> Integrate
                      </button>
                    )}

                    <button onClick={() => setShowSearchModal(true)} className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95">
                      <Globe size={14} /> Global Search
                    </button>

                    <button
                      onClick={() => { setIsEdit(false); setForm({ id: null, name: "", image: null, oldImage: "" }); setShowModal(true); }}
                      className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black uppercase tracking-widest text-[9px] rounded-xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap border border-white/10"
                    >
                      <Plus size={16} /> New Category
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden mb-12">
                <div className="px-8 py-6 border-b border-white/[0.08] bg-white/5 flex justify-between items-center sm:px-10">
                  <h3 className="text-[11px] font-black text-white tracking-[0.3em] uppercase flex items-center gap-3">
                    <GripVertical size={16} className="text-yellow-400" /> Category List
                  </h3>
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                    {filteredCategories.length} Categories Active
                  </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0b1a3d]/60 text-white/40 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-5 w-16"></th>
                        <th className="px-8 py-5">Image</th>
                        <th className="px-8 py-5">Category Name</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="categoryTable">
                        {(provided) => (
                          <tbody {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-white/[0.05]">
                            {filteredCategories.map((item, index) => (
                              <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                                {(dragProvided, snapshot) => (
                                  <tr
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`${item.status === 0 ? "opacity-40" : ""} hover:bg-white/[0.02] transition-colors ${snapshot.isDragging ? "bg-[#0d1f45] shadow-2xl !table" : ""}`}
                                    style={{ ...dragProvided.draggableProps.style }}
                                  >
                                    <td {...dragProvided.dragHandleProps} className="px-8 py-5 cursor-grab text-white/10 hover:text-yellow-400 transition-colors">
                                      <GripVertical size={20} />
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/20 border border-white/10 shadow-inner group">
                                        {item.image ? (
                                          <img src={`${API_BASE}/uploads/${item.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white/20">NO IMAGE</div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="min-w-0">
                                        <div className="text-sm font-black text-white tracking-tight uppercase leading-tight truncate max-w-xs">{item.name}</div>
                                        <div className="text-[9px] font-black text-white/30 tracking-[0.2em] mt-1 leading-none uppercase">ID: {item.id}</div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                      <button
                                        onClick={() => handleToggleStatus(item)}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${item.status === 1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}
                                      >
                                        {item.status === 1 ? "ACTIVE" : "INACTIVE"}
                                      </button>
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => handleImportProducts(item.name, item.id)} className="p-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-yellow-500 hover:bg-yellow-500/10 transition-all active:scale-90" title="Import Logic"><Upload size={16} /></button>
                                        <button onClick={() => handleEdit(item)} className="p-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-yellow-400 hover:bg-yellow-500/10 transition-all active:scale-90"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"><Trash2 size={16} /></button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </table>
                </div>

                <div className="md:hidden p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {filteredCategories.map((item) => (
                    <CategoryCard key={item.id} item={item} />
                  ))}
                </div>
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
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-8 border-b border-white/[0.08] bg-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{isEdit ? "Edit Category" : "Add Category"}</h2>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Category Details</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Category Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter category name..."
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm font-black text-white placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all shadow-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Category Image</label>
                  <div
                    onClick={() => document.getElementById('imageUp').click()}
                    className="aspect-video bg-white/[0.03] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500/50 transition-all overflow-hidden relative group"
                  >
                    <input type="file" id="imageUp" className="hidden" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })} />
                    {previewUrl || form.oldImage ? (
                      <img src={previewUrl || `${API_BASE}/uploads/${form.oldImage}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                    ) : (
                      <>
                        <Plus size={32} className="text-white/10 group-hover:text-yellow-400 transition-colors" />
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-2">Upload Image</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Overwrite Media</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all transform active:scale-95 border border-white/10">
                    {isEdit ? "UPDATE CATEGORY" : "SAVE CATEGORY"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showSearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-white/[0.08] bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-500/10 rounded-xl"><Globe size={20} className="text-yellow-400" /></div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Global Category Search</h2>
                </div>
                <button onClick={() => setShowSearchModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>
              <div className="p-8 shrink-0">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400" size={18} />
                  <input
                    autoFocus
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 py-4 text-sm font-black text-white placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all shadow-xl"
                    placeholder="SEARCH GLOBAL CATEGORIES..."
                    value={globalSearchQuery}
                    onChange={e => setGlobalSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-4 custom-scrollbar">
                {globalSearchResults.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:bg-white/[0.06] transition-all group/res">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20 flex-shrink-0">
                        {cat.image ? <img src={`${API_BASE}/uploads/${cat.image}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-white/20">IMAGE</div>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white uppercase tracking-tight truncate">{cat.name}</div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">{cat.restaurant_name}</div>
                      </div>
                    </div>
                    <button onClick={() => handleAddGlobalCategory(cat)} className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 rounded-xl shadow-lg border border-white/20 hover:scale-105 transition-all transform active:scale-95"><Plus size={20} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showIntegrateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIntegrateModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2.5rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-white/[0.08] bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-500/10 rounded-xl"><Zap size={20} className="text-yellow-400" /></div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Restaurant Integration</h2>
                </div>
                <button onClick={() => setShowIntegrateModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>
              <div className="flex flex-col md:flex-row h-full overflow-hidden">
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/[0.08]">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Source Category</label>
                  <div className="relative group mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400" size={16} />
                    <input
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm font-black text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/40 transition-all"
                      placeholder="SCAN ALL CATEGORIES..."
                      value={integrateSearch}
                      onChange={e => setIntegrateSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    {integrateResults.map((cat, i) => (
                      <div key={i} onClick={() => setSelectedSourceCat(cat)} className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${selectedSourceCat?.id === cat.id ? 'bg-yellow-500/20 border-yellow-500/50 shadow-lg' : 'bg-white/5 border-white/[0.05] hover:border-white/20'}`}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 shrink-0">
                          {cat.image ? <img src={`${API_BASE}/uploads/${cat.image}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-white/10">VOID</div>}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white uppercase tracking-tight truncate">{cat.name}</div>
                          <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">{cat.restaurant_name}</div>
                        </div>
                        {selectedSourceCat?.id === cat.id && <Check size={16} className="text-yellow-400 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-8 bg-white/[0.01] flex flex-col">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Target Restaurant</label>
                  <select
                    value={targetRestaurantId}
                    onChange={e => setTargetRestaurantId(e.target.value)}
                    className="w-full bg-[#0b1a3d] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-black text-white appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 mb-8"
                  >
                    <option value="">SELECT DESTINATION...</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.restaurant_name.toUpperCase()}</option>)}
                  </select>
                  <div className="mt-auto p-6 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">READY</span>
                    </div>
                    <button
                      disabled={integrating}
                      onClick={handleIntegrate}
                      className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-black uppercase tracking-widest text-xs rounded-xl shadow-2xl transition-all transform active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 border border-white/10"
                    >
                      {integrating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                      {integrating ? "Processing..." : "Start Integration"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// src/pages/product/index.jsx
import { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Edit, Trash2, Save, Upload, Filter,
  GripVertical, Tag, Image as ImageIcon, Loader2, Zap, Globe, Package
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

export default function ProductPage() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const CONTAINS_OPTIONS = [
    { key: "Dairy", icon: "/contains/Dairy.png" },
    { key: "Gluten", icon: "/contains/Gluten.png" },
    { key: "Mild", icon: "/contains/Mild.png" },
    { key: "Nuts", icon: "/contains/Nuts.png" },
    { key: "Sesame", icon: "/contains/Sesame.png" },
    { key: "Vegan", icon: "/contains/Vegan.png" },
    { key: "Vegetarian", icon: "/contains/Vegetarian.png" },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    cat_id: "",
    contains: [],
    image: null,
    oldImage: null,
  });

  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    fetch(`${API}/category`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCategories)
      .catch((err) => console.error("Error loading categories:", err));

    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(data => {
        const safeData = data.map(p => {
          let c = p.contains;
          try {
            if (typeof c === 'string') c = JSON.parse(c);
            if (typeof c === 'string') c = JSON.parse(c);
          } catch (e) { }
          return { ...p, contains: Array.isArray(c) ? c : [] };
        });
        setProducts(safeData.sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch((err) => console.error("Error loading products:", err));
  }, [API, token]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!showSearchModal || !globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}/products/search-global?q=${encodeURIComponent(globalSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setGlobalSearchResults(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 300);
    return () => clearTimeout(t);
  }, [globalSearchQuery, showSearchModal, API, token]);

  useEffect(() => {
    if (form.image instanceof File) {
      const url = URL.createObjectURL(form.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(form.oldImage ? `${API_BASE}/uploads/${form.oldImage}` : "");
  }, [form.image, form.oldImage, API_BASE]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (filterCategory !== "all") {
      list = list.filter((p) => String(p.cat_id) === String(filterCategory));
    }
    if (!debouncedQuery) return list;
    const q = debouncedQuery;
    return list.filter((p) => {
      if (p.name?.toLowerCase().includes(q)) return true;
      if (p.description?.toLowerCase().includes(q)) return true;
      const catName = categories.find((c) => c.id == p.cat_id)?.name;
      if (catName?.toLowerCase().includes(q)) return true;
      if (String(p.price).includes(q)) return true;
      return false;
    });
  }, [products, categories, debouncedQuery, filterCategory]);

  const handleAddGlobalProduct = async (item) => {
    showPopup({
      title: "Add Global Product?",
      message: `Do you want to add "${item.name}" to your menu?`,
      type: "confirm",
      onConfirm: async () => {
        try {
          let targetCatId = null;

          // 1. Check Category
          if (item.category_name) {
            const match = categories.find(c => c.name.toLowerCase() === item.category_name.toLowerCase());
            if (match) {
              targetCatId = match.id;
            } else {
              // Create Category
              const catFd = new FormData();
              catFd.append("name", item.category_name);
              if (item.category_image) catFd.append("existingImage", item.category_image);

              const catRes = await fetch(`${API}/category`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: catFd
              });

              if (catRes.ok) {
                const newCat = await catRes.json();
                setCategories(prev => [...prev, newCat].sort((a, b) => a.sort_order - b.sort_order));
                targetCatId = newCat.id;
              }
            }
          }

          if (!targetCatId) {
            if (categories.length > 0) targetCatId = categories[0].id;
            else {
              showPopup({
                title: "No Categories",
                message: "Please create at least one category before adding products.",
                type: "warning"
              });
              return;
            }
          }

          // 2. Create Product
          const fd = new FormData();
          fd.append("name", item.name);
          fd.append("description", item.description || "");
          fd.append("price", item.price || 0);
          fd.append("discountPrice", item.discountPrice || "");
          fd.append("cat_id", targetCatId);
          fd.append("contains", JSON.stringify(item.contains || []));
          if (item.image) fd.append("existingImage", item.image);

          const res = await fetch(`${API}/products`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          });

          if (!res.ok) {
            const err = await res.json();
            showPopup({
              title: "Import Failed",
              message: res.status === 409 ? "Product already exists in your menu." : (err.message || "Failed to add product"),
              type: "error"
            });
            return;
          }

          const saved = await res.json();
          let savedContains = saved.contains;
          try {
            if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
            if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
          } catch (e) { }
          saved.contains = Array.isArray(savedContains) ? savedContains : [];

          setProducts(prev => [saved, ...prev].sort((a, b) => a.sort_order - b.sort_order));

          setShowSearchModal(false);
          setGlobalSearchQuery("");
          showPopup({
            title: "Success",
            message: "Product imported and added to menu.",
            type: "success"
          });

        } catch (err) {
          console.error("Add global product error:", err);
          showPopup({
            title: "System Error",
            message: "Something went wrong while importing the product.",
            type: "error"
          });
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameTrim = form.name?.trim();
    if (!nameTrim) return showPopup({ title: "Validation Error", message: "Please enter product name", type: "warning" });

    const localExists = products.some((p) => p.id !== form.id && p.name?.trim().toLowerCase() === nameTrim.toLowerCase());
    if (localExists) return showPopup({ title: "Validation Error", message: "Product name already exists", type: "warning" });

    const rawPrice = parseFloat(form.price || 0);
    if (rawPrice <= 0) return showPopup({ title: "Validation Error", message: "Price must be greater than zero", type: "warning" });

    let finalPrice = rawPrice;
    let discountPriceToSend = "";
    if (form.discountPrice && String(form.discountPrice).trim() !== "") {
      const disc = parseFloat(String(form.discountPrice).replace("%", "").trim());
      if (disc > 0 && disc <= 100) {
        finalPrice = +(rawPrice - (rawPrice * disc) / 100).toFixed(2);
        discountPriceToSend = rawPrice;
      } else if (disc > 100) {
        finalPrice = rawPrice;
        discountPriceToSend = disc;
      }
    }

    const fd = new FormData();
    fd.append("name", nameTrim);
    fd.append("description", form.description || "");
    fd.append("price", finalPrice);
    fd.append("discountPrice", discountPriceToSend);
    fd.append("cat_id", form.cat_id || "");
    fd.append("contains", JSON.stringify(form.contains));
    if (form.image instanceof File) fd.append("image", form.image);

    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${API}/products/${form.id}` : `${API}/products`;

    try {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) {
        const err = await res.json();
        return showPopup({ title: "Save Failed", message: err.message || "Failed to save product", type: "error" });
      }
      const saved = await res.json();
      let savedContains = saved.contains;
      try {
        if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
        if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
      } catch (e) { }
      saved.contains = Array.isArray(savedContains) ? savedContains : [];
      setProducts((prev) => form.id ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev].sort((a, b) => a.sort_order - b.sort_order));
      setShowModal(false);
      resetForm();
      showPopup({ title: "Success", message: "Product saved successfully", type: "success" });
    } catch (error) {
      showPopup({ title: "System Error", message: "Server error", type: "error" });
    }
  };

  const resetForm = () => setForm({ id: null, name: "", description: "", price: "", discountPrice: "", cat_id: "", contains: [], image: null, oldImage: null });

  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Product?",
      message: "This action cannot be undone. Purge this item from the registry?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`${API}/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          setProducts((prev) => prev.filter((item) => item.id !== id));
          showPopup({ title: "Deleted", message: "Product has been removed.", type: "success" });
        } catch (err) { }
      }
    });
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
    try {
      await fetch(`${API}/products/${product.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: product.name, status: newStatus }),
      });
    } catch (err) { }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(products);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const updated = items.map((p, i) => ({ ...p, sort_order: i + 1 }));
    setProducts(updated);
    await fetch(`${API}/products/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order: updated })
    });
  };

  const formatGBP = (v) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v || 0);

  const ProductCard = ({ p }) => {
    const imgUrl = p.image ? `${API_BASE}/uploads/${p.image}` : null;
    const status = p.status === 1;
    return (
      <div className={`bg-white/[0.03] backdrop-blur-md border ${status ? 'border-white/[0.08]' : 'border-rose-500/20 opacity-60'} rounded-[1.5rem] p-5 shadow-2xl transition-all`}>
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
            {imgUrl ? <img src={imgUrl} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full flex items-center justify-center text-[8px] font-black text-white/20">NO IMAGE</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-white tracking-tight truncate">{p.name}</h4>
            <div className="text-xs font-bold text-white/30 truncate mt-1">{categories.find(c => c.id == p.cat_id)?.name || "Void"} Node</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-yellow-500">{formatGBP(p.price)}</span>
              <div className="flex items-center gap-3">
                <div className="relative group/toggle cursor-pointer" onClick={() => handleToggleStatus(p)}>
                  <input type="checkbox" className="sr-only" checked={status} readOnly />
                  <div className={`w-12 h-6 rounded-full transition-colors ${status ? 'bg-yellow-500' : 'bg-white/10'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${status ? 'translate-x-6' : ''}`}></div>
                </div>
                <span className={`text-[10px] font-bold tracking-wide transition-colors ${status ? 'text-yellow-400' : 'text-white/30'}`}>
                  {status ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => { setForm({ ...p, oldImage: p.image, image: null }); setShowModal(true); }} className="p-2 bg-white/5 border border-white/10 rounded-xl text-yellow-400 ml-auto"><Edit size={14} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/5 border border-white/10 rounded-xl text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] selection:bg-yellow-500/30 font-sans text-white overflow-x-hidden">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 min-h-0 relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`flex-1 flex flex-col pt-16 lg:pt-20 min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "pl-0"}`}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-4 lg:pt-8 pb-12 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-8">

              {/* Page Header Area */}
              <div className="mb-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0b1a3d]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08]">
                    <Package className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-lg leading-none">Products</h1>
                    <p className="text-white mt-1.5 text-sm font-medium tracking-wide leading-none">Manage your menu items and pricing</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-3 bg-[#0b1a3d]/40 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-inner">
                  <div className="relative group flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400 transition-colors" size={16} />
                    <input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder-white/10 focus:outline-none focus:border-yellow-500/40 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                     <div className="relative group">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={12} />
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="pl-8 pr-4 py-3 bg-white/5 border border-white/[0.08] rounded-xl text-white text-sm font-bold tracking-tight appearance-none focus:outline-none focus:border-yellow-400/40 transition-all"
                      >
                        <option value="all" className="bg-[#0b1a3d]">All Categories</option>
                        {categories.map((c) => <option key={c.id} value={c.id} className="bg-[#0b1a3d]">{c.name}</option>)}
                      </select>
                    </div>

                    <button onClick={() => setShowSearchModal(true)} className="px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] font-bold text-sm rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95">
                      <Globe size={18} /> Search Global
                    </button>

                    <button
                      onClick={() => { resetForm(); setShowModal(true); }}
                      className="px-8 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold text-sm rounded-xl shadow-2xl transition-all flex items-center justify-center gap-2 whitespace-nowrap border border-white/10"
                    >
                      <Plus size={18} /> Add Product
                    </button>
                  </div>
                </div>
              </div>

              {/* Registry Container */}
              <div className="bg-[#0b1a3d]/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/[0.08] overflow-hidden mb-12">
                 <div className="px-8 py-6 border-b border-white/[0.08] bg-white/5 flex justify-between items-center sm:px-10">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-3">
                    <GripVertical size={20} className="text-yellow-400" /> Product List
                  </h3>
                  <div className="text-sm font-bold text-white tracking-wide">
                    {filteredProducts.length} Items
                  </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-[#0b1a3d]/60 text-white text-sm font-bold tracking-tight">
                      <tr>
                        <th className="px-8 py-5 w-16"></th>
                        <th className="px-8 py-5">Image</th>
                        <th className="px-8 py-5">Product Name</th>
                        <th className="px-8 py-5">Price</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="productsTable">
                        {(provided) => (
                          <tbody {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-white/[0.05]">
                            {filteredProducts.map((p, index) => (
                              <Draggable key={String(p.id)} draggableId={String(p.id)} index={index}>
                                {(dragProvided, snapshot) => (
                                  <tr
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`${p.status === 0 ? "opacity-40" : ""} hover:bg-white/[0.02] transition-colors ${snapshot.isDragging ? "bg-[#0d1f45] shadow-2xl !table" : ""}`}
                                    style={{ ...dragProvided.draggableProps.style }}
                                  >
                                    <td {...dragProvided.dragHandleProps} className="px-8 py-5 cursor-grab text-white/10 hover:text-yellow-400 transition-colors">
                                      <GripVertical size={20} />
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/20 border border-white/10 shadow-inner group">
                                        {p.image ? (
                                          <img src={`${API_BASE}/uploads/${p.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white/20">VOID</div>
                                        )}
                                      </div>
                                    </td>
                                     <td className="px-8 py-5">
                                      <div className="min-w-0">
                                        <div className="text-base font-bold text-white tracking-tight truncate max-w-xs">{p.name}</div>
                                        <div className="text-xs font-bold text-white/30 tracking-widest mt-1 leading-none">
                                          {categories.find(c => c.id == p.cat_id)?.name || "Void"} Node
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-5 text-base font-bold text-yellow-500">
                                      {formatGBP(p.price)}
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="flex flex-col items-center gap-2">
                                        <div className="relative group/toggle cursor-pointer" onClick={() => handleToggleStatus(p)}>
                                          <input type="checkbox" className="sr-only" checked={p.status === 1} readOnly />
                                          <div className={`w-12 h-6 rounded-full transition-colors ${p.status === 1 ? 'bg-yellow-500' : 'bg-white/10'}`}></div>
                                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${p.status === 1 ? 'translate-x-6' : ''}`}></div>
                                        </div>
                                        <span className={`text-[10px] font-bold tracking-wide transition-colors ${p.status === 1 ? 'text-yellow-400' : 'text-white/30'}`}>
                                          {p.status === 1 ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => { setForm({ ...p, oldImage: p.image, image: null }); setShowModal(true); }} className="p-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-yellow-400 hover:bg-yellow-500/10 transition-all active:scale-90"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"><Trash2 size={16} /></button>
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

                <div className="md:hidden p-4 sm:p-6 space-y-4">
                  {filteredProducts.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="py-20 text-center uppercase tracking-widest text-white/20 text-[10px] font-black">
                      No products found
                    </div>
                  )}
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
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
              <div className="sticky top-0 z-10 p-8 border-b border-white/[0.08] bg-white/5 backdrop-blur-xl flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{form.id ? "Edit Product" : "Add Product"}</h2>
                  <p className="text-xs font-bold text-white/30 mt-1">Product Details</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-3">Product Name</label>
                      <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white placeholder-white/10 focus:outline-none focus:border-yellow-500/40 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-3">Description</label>
                      <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white focus:outline-none focus:border-yellow-500/40 transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/40 mb-3">Price (GBP)</label>
                        <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white focus:outline-none focus:border-yellow-500/40 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/40 mb-3">Discount (%)</label>
                        <input type="text" value={form.discountPrice} onChange={e => setForm({ ...form, discountPrice: e.target.value })} placeholder="e.g. 15%" className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white focus:outline-none focus:border-yellow-500/40 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-3">Category</label>
                      <select value={form.cat_id} onChange={e => setForm({ ...form, cat_id: e.target.value })} className="w-full bg-[#0b1a3d] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white appearance-none focus:outline-none">
                        <option value="">Select category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-3">Product Image</label>
                      <div
                        onClick={() => document.getElementById('imageProd').click()}
                        className="aspect-square bg-white/[0.03] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500/50 transition-all overflow-hidden relative group"
                      >
                        <input type="file" id="imageProd" className="hidden" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })} />
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /> : <ImageIcon size={32} className="text-white/10" />}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs font-bold text-white">Overwrite Media</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-3">Allergens</label>
                      <div className="flex flex-wrap gap-3">
                        {CONTAINS_OPTIONS.map(opt => (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => {
                              const current = form.contains || [];
                              const exists = current.includes(opt.key);
                              setForm({ ...form, contains: exists ? current.filter(x => x !== opt.key) : [...current, opt.key] });
                            }}
                            className={`p-2 rounded-lg border transition-all ${form.contains?.includes(opt.key) ? 'bg-yellow-500/20 border-yellow-400' : 'bg-white/5 border-white/10 opacity-30 group hover:opacity-100'}`}
                          >
                            <img src={opt.icon} className="w-6 h-6 object-contain" alt={opt.key} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/[0.08] flex justify-end">
                  <button type="submit" className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold text-base rounded-2xl shadow-2xl transition-all transform active:scale-95 border border-white/10 flex items-center gap-3">
                    <Save size={18} /> {form.id ? "Save Changes" : "Add Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showSearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#0b1a3d] border border-white/[0.08] rounded-[2rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-white/[0.08] bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-500/10 rounded-xl"><Globe size={20} className="text-yellow-400" /></div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Product Menu Import</h2>
                </div>
                <button onClick={() => setShowSearchModal(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
              </div>
              <div className="p-8 shrink-0">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-400" size={18} />
                  <input
                    autoFocus
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-14 pr-6 py-4 text-sm font-semibold text-white focus:outline-none focus:border-yellow-500/40 transition-all shadow-xl"
                    placeholder="Search global products..."
                    value={globalSearchQuery}
                    onChange={e => setGlobalSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-4 custom-scrollbar">
                {globalSearchResults.map((prod, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:bg-white/[0.06] transition-all group/res">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20 shrink-0">
                        {prod.image ? <img src={`${API_BASE}/uploads/${prod.image}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-white/20">VOID</div>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white tracking-tight truncate">{prod.name}</div>
                        <div className="text-[10px] font-medium text-white/20 mt-0.5">{prod.restaurant_name}</div>
                      </div>
                    </div>
                    <button onClick={() => handleAddGlobalProduct(prod)} className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 rounded-xl hover:scale-105 transition-all shadow-lg border border-white/10"><Plus size={20} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

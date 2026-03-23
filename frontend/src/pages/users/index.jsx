import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Users as UsersIcon, ChevronDown, Check, User, Mail, Lock } from "lucide-react";
import { usePopup } from "../../context/PopupContext";

// Helper: Custom Glass MultiSelect (reused concept)
const GlassMultiSelect = ({ loading, options, selected, onToggle, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const labelText = useMemo(() => {
    if (loading) return "Loading...";
    if (!options?.length) return "No items found";
    if (!selected?.length) return `Select ${label}...`;
    const picked = options.filter((o) => selected.includes(o.id)).map((o) => o.title);
    if (picked.length <= 2) return picked.join(", ");
    return `${picked.slice(0, 2).join(", ")} +${picked.length - 2} more`;
  }, [loading, options, selected, label]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-yellow-500/50 flex justify-between items-center text-white transition-all hover:bg-white/10"
      >
        <span className={selected.length ? "text-white" : "text-white/40"}>{labelText}</span>
        <ChevronDown size={16} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-white/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {loading ? (
              <div className="px-4 py-3 text-white/50 text-sm">Loading...</div>
            ) : !options?.length ? (
              <div className="px-4 py-3 text-white/50 text-sm">No items found</div>
            ) : (
              <div className="p-2 space-y-1">
                {options.map((opt) => {
                  const active = selected.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => onToggle(opt.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? "bg-yellow-500/10 text-yellow-500" : "hover:bg-white/10 text-white/80"}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${active ? "bg-yellow-500 border-yellow-500" : "border-white/30"}`}>
                        {active && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{opt.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Users() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Table state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  // Roles
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRoleIds, setCRoleIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const canSave = cName.trim() && cEmail.trim() && cRoleIds.length > 0;

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [eId, setEId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [eRoleIds, setERoleIds] = useState([]);
  const [updating, setUpdating] = useState(false);
  const canUpdate = eId && eName.trim() && eEmail.trim() && eRoleIds.length > 0;

  // Load roles
  useEffect(() => {
    (async () => {
      try {
        setRolesLoading(true);
        const res = await api.get("/roles");
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRoleOptions(list.map(r => ({ id: r.id, title: r.title })));
        setRolesError("");
      } catch (e) {
        setRolesError(e?.message || "Failed to load roles");
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  // Load users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await api.get("/users");
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setUsers(list);
      setUsersError("");
    } catch (e) {
      setUsersError(e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };
  useEffect(() => { fetchUsers(); }, []);

  // Search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const role = (u.role_title || "").toLowerCase();
      const pwd = u.has_password ? "password set" : "no password";
      return (
        (u.name || "").toLowerCase().includes(needle) ||
        (u.email || "").toLowerCase().includes(needle) ||
        role.includes(needle) ||
        pwd.includes(needle)
      );
    });
  }, [q, users]);

  useEffect(() => setPage(1), [q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Create
  const handleCreate = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      const role_id = cRoleIds[0] || null;
      await api.post("/users", { name: cName, email: cEmail, password: cPassword, role_id });
      setCName(""); setCEmail(""); setCPassword(""); setCRoleIds([]);
      setOpenCreate(false);
      await fetchUsers();
      showPopup({ title: "User Created", message: `Successfully added ${cName}.`, type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.response?.data?.message || "Failed to create user", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Edit populator
  const openEditFor = (u) => {
    setEId(u.id);
    setEName(u.name || "");
    setEEmail(u.email || "");
    setEPassword("");
    setERoleIds(u.role_id ? [Number(u.role_id)] : []);
    setOpenEdit(true);
  };

  // Update
  const handleUpdate = async () => {
    if (!canUpdate) return;
    try {
      setUpdating(true);
      const role_id = eRoleIds[0] || null;
      const body = { name: eName, email: eEmail, role_id };
      if (ePassword.trim()) body.password = ePassword.trim();
      await api.put(`/users/${eId}`, body);
      setOpenEdit(false);
      await fetchUsers();
      showPopup({ title: "Success", message: "User updated successfully.", type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.response?.data?.message || "Failed to update user", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // Delete
  const handleDelete = async (u) => {
    showPopup({
      title: "Delete User?",
      message: `Are you sure you want to delete "${u.name}"? This action cannot be undone.`,
      type: "confirm",
      onConfirm: async () => {
        try {
          await api.delete(`/users/${u.id}`);
          await fetchUsers();
          showPopup({ title: "Deleted", message: "User has been removed.", type: "success" });
        } catch (e) {
          showPopup({ title: "Error", message: e?.response?.data?.message || "Failed to delete user", type: "error" });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071428] via-[#0d1f45] to-[#071428] font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 -mt-12 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                <UsersIcon className="text-[#00f2ff]" size={36} />
                Users List
              </h2>
              <p className="mt-2 text-white/50 text-base font-medium">Manage registered users and their roles.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setOpenCreate(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] rounded-2xl font-bold shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all hover:-translate-y-1 active:scale-95 text-base"
              >
                <Plus size={20} strokeWidth={3} />
                Add User
              </button>
            </div>
          </motion.div>

          <div className="bg-[#0b1a3d]/60 backdrop-blur-xl border border-white/[0.08] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-6 border-b border-white/[0.08] flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl pl-12 pr-6 py-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#00f2ff]/50 transition-all font-medium"
                  />
                </div>
              </div>
              <div className="text-white text-sm font-bold tracking-wide">
                {filtered.length} Users Found
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.08] text-white text-sm font-bold tracking-tight">
                    <th className="px-8 py-6 w-16">#</th>
                    <th className="px-8 py-6">Name</th>
                    <th className="px-8 py-6">Email</th>
                    <th className="px-8 py-6">Role</th>
                    <th className="px-8 py-6 text-right w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-white/90">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="px-8 py-16 text-center text-white/30 font-bold text-lg">Loading users...</td></tr>
                  ) : usersError ? (
                    <tr><td colSpan={5} className="px-8 py-16 text-center text-red-300 font-bold">{usersError}</td></tr>
                  ) : pageSlice.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-16 text-center text-white/30 font-bold text-lg">No users found</td></tr>
                  ) : (
                    pageSlice.map((u, idx) => (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={u.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                         <td className="px-8 py-6 text-white font-bold">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-8 py-6 font-bold text-[#00f2ff] group-hover:text-white transition-colors tracking-wide">{u.name}</td>
                        <td className="px-8 py-6 text-white/60 font-medium tracking-wide">{u.email}</td>
                        <td className="px-8 py-6">
                          {u.role_title ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold tracking-wide bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                              {u.role_title}
                            </span>
                          ) : (
                            <span className="text-white/20 italic font-medium text-[10px] tracking-wide">No Role</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEditFor(u)}
                              className="p-3 bg-[#00f2ff]/10 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-[#071428] rounded-xl transition-all border border-[#00f2ff]/20 shadow-lg shadow-[#00f2ff]/5"
                              title="Edit"
                            >
                              <Edit size={18} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg shadow-red-500/5"
                              title="Delete"
                            >
                              <Trash2 size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
               <span className="text-white/40 text-sm font-bold tracking-wide">Showing {pageSlice.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>

              <div className="flex items-center gap-6">
                <select
                  className="bg-white/[0.05] border border-white/[0.1] rounded-xl text-[10px] font-black uppercase tracking-widest py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#00f2ff]/50 appearance-none cursor-pointer"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="10" className="bg-[#0b1a3d]">10 per page</option>
                  <option value="25" className="bg-[#0b1a3d]">25 per page</option>
                  <option value="50" className="bg-[#0b1a3d]">50 per page</option>
                </select>

                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-white/40 border border-white/[0.1] hover:bg-white/[0.1] disabled:opacity-30 transition-all shadow-inner" disabled={page === 1}>&laquo;</button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#00f2ff] text-[#071428] font-black border border-[#00f2ff]/20 shadow-lg shadow-[#00f2ff]/20">{page}</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-white/40 border border-white/[0.1] hover:bg-white/[0.1] disabled:opacity-30 transition-all shadow-inner" disabled={page >= totalPages}>&raquo;</button>
                </div>
              </div>
            </div>
          </div>
          {usersError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-red-500/10 border border-red-500/20 rounded-[1.5rem] text-red-400 font-bold flex items-center gap-3"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              {usersError}
            </motion.div>
          )}
        </main>
        <Footer />
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenCreate(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New User</h3>
                <button onClick={() => setOpenCreate(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      value={cName} onChange={(e) => setCName(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="Set initial password"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Assign Role</label>
                  <GlassMultiSelect
                    loading={rolesLoading} options={roleOptions} selected={cRoleIds}
                    onToggle={(id) => setCRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    label="role"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
                <button onClick={() => setOpenCreate(false)} className="px-6 py-3 rounded-xl text-white/60 hover:text-white font-bold text-sm transition-all">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={!canSave || saving}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] rounded-xl font-bold text-sm shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {openEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenEdit(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit User</h3>
                <button onClick={() => setOpenEdit(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      value={eName} onChange={(e) => setEName(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="password" value={ePassword} onChange={(e) => setEPassword(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="Blank to keep current"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Assign Role</label>
                  <GlassMultiSelect
                    loading={rolesLoading} options={roleOptions} selected={eRoleIds}
                    onToggle={(id) => setERoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    label="role"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
                <button onClick={() => setOpenEdit(false)} className="px-6 py-3 rounded-xl text-white/60 hover:text-white font-bold text-sm transition-all">Cancel</button>
                <button
                  onClick={handleUpdate}
                  disabled={!canUpdate || updating}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#071428] rounded-xl font-bold text-sm shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

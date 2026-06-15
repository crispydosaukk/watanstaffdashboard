const fs = require('fs');

const handleAddLogic = `
  const handleAddAttendanceRecord = async (e) => {
    e.preventDefault();
    if (!manualAddData.clock_in || !manualAddData.clock_out) {
      showPopup({ title: "Required", message: "Please provide both clock in and clock out times", type: "warning" });
      return;
    }
    if (!manualAddData.edit_reason || manualAddData.edit_reason.trim() === "") {
      showPopup({ title: "Required", message: "Please provide a reason for manual entry", type: "warning" });
      return;
    }
    setAddingAttendance(true);
    try {
      const cin = new Date(manualAddData.clock_in);
      const cout = new Date(manualAddData.clock_out);
      const totalMinutes = Math.floor((cout - cin) / 60000);
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const dateObj = new Date(cin);
      dateObj.setHours(0, 0, 0, 0);

      const staffMember = attendanceData?.staff;
      if (!staffMember) throw new Error("Staff member data not available");

      await addDoc(collection(db, "attendance"), {
        staff_id: staffMember.id,
        restaurant_id: staffMember.restaurant_id || user.uid,
        clock_in: cin,
        clock_out: cout,
        date: dateObj,
        total_minutes: Math.max(0, totalMinutes),
        edit_reason: manualAddData.edit_reason.trim(),
        is_manual: true,
        created_at: new Date(),
        audit_log: [{
          action: "created",
          by: user.email || user.uid,
          at: new Date(),
          reason: manualAddData.edit_reason.trim(),
          changes: \`Manual record created. Cin: \${cin.toISOString()} Cout: \${cout.toISOString()}\`
        }]
      });

      showPopup({ title: "Success", message: "Manual attendance record added", type: "success" });
      setShowManualAddModal(false);
      setManualAddData({ clock_in: "", clock_out: "", edit_reason: "" });
      handleViewAttendance(staffMember.id, attendanceFilters || null);
    } catch (err) {
      console.error(err);
      showPopup({ title: "Error", message: err.message, type: "error" });
    }
    setAddingAttendance(false);
  };
`;

const stateVars = `
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [manualAddData, setManualAddData] = useState({ clock_in: "", clock_out: "", edit_reason: "" });
  const [addingAttendance, setAddingAttendance] = useState(false);
`;

const manualModalJSX = `
      {/* Manual Add Modal */}
      <AnimatePresence>
        {showManualAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowManualAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0b1a3d] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Plus className="text-[#D0B079]" size={20} /> Add Missing Record
                  </h3>
                  <p className="text-white/40 text-xs mt-1">Manual entry will be logged for audit purposes.</p>
                </div>
                <button onClick={() => setShowManualAddModal(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-500 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddAttendanceRecord} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 tracking-widest ml-1 uppercase">Clock In Time <span className="text-rose-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={manualAddData.clock_in}
                    onChange={(e) => setManualAddData(p => ({ ...p, clock_in: e.target.value }))}
                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-semibold focus:outline-none focus:border-[#D0B079]/40 focus:ring-2 focus:ring-[#D0B079]/10 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 tracking-widest ml-1 uppercase">Clock Out Time <span className="text-rose-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={manualAddData.clock_out}
                    onChange={(e) => setManualAddData(p => ({ ...p, clock_out: e.target.value }))}
                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-semibold focus:outline-none focus:border-[#D0B079]/40 focus:ring-2 focus:ring-[#D0B079]/10 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 tracking-widest ml-1 uppercase">Reason for manual entry <span className="text-rose-500">*</span></label>
                  <textarea
                    value={manualAddData.edit_reason}
                    onChange={(e) => setManualAddData(p => ({ ...p, edit_reason: e.target.value }))}
                    placeholder="e.g. Forgot to clock in due to app issue"
                    rows="2"
                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white font-semibold focus:outline-none focus:border-[#D0B079]/40 focus:ring-2 focus:ring-[#D0B079]/10 transition-all placeholder:text-white/20 resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={addingAttendance}
                  className="w-full py-4 mt-6 bg-[#D0B079] text-slate-900 font-bold rounded-2xl text-xs tracking-widest hover:bg-[#b8965f] shadow-xl shadow-[#D0B079]/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {addingAttendance ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {addingAttendance ? 'SAVING...' : 'SAVE RECORD'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add Plus to lucide-react imports if not there
  if (!content.includes('Plus,')) {
    content = content.replace('XCircle,', 'Plus, XCircle,');
  }

  // 2. Add state variables
  if (!content.includes('showManualAddModal')) {
    content = content.replace('const [loadingAttendance, setLoadingAttendance] = useState(false);', \`const [loadingAttendance, setLoadingAttendance] = useState(false);\${stateVars}\`);
  }

  // 3. Add handleAddAttendanceRecord function
  if (!content.includes('handleAddAttendanceRecord')) {
    content = content.replace('const handleUpdateAttendanceRecord = async (e) => {', \`\${handleAddLogic}\n  const handleUpdateAttendanceRecord = async (e) => {\`);
  }

  // 4. Update REFRESH DATA button wrapper
  const oldBtnWrapper1 = \`
                    <button
                      onClick={() => handleViewAttendance(attendanceData?.staff?.id, attendanceFilters)}
                      className="w-full md:w-auto px-10 py-4 bg-[#D0B079] text-slate-900 font-bold rounded-2xl text-xs tracking-widest hover:bg-[#b8965f] shadow-xl shadow-[#D0B079]/10 transition-all active:scale-95"
                    >
                      REFRESH DATA
                    </button>
                  </div>\`;
                  
  const oldBtnWrapper2 = \`
                    <button
                      onClick={() => handleViewAttendance(attendanceData?.staff?.id)}
                      className="w-full md:w-auto px-10 py-4 bg-[#D0B079] text-slate-900 font-bold rounded-2xl text-xs tracking-widest hover:bg-[#b8965f] shadow-xl shadow-[#D0B079]/10 transition-all active:scale-95"
                    >
                      REFRESH DATA
                    </button>
                  </div>\`;

  const newBtnWrapper = \`
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <button
                        onClick={() => handleViewAttendance(attendanceData?.staff?.id, attendanceFilters)}
                        className="flex-1 px-10 py-4 bg-[#D0B079] text-slate-900 font-bold rounded-2xl text-xs tracking-widest hover:bg-[#b8965f] shadow-xl shadow-[#D0B079]/10 transition-all active:scale-95 whitespace-nowrap"
                      >
                        REFRESH DATA
                      </button>
                      <button
                        onClick={() => setShowManualAddModal(true)}
                        className="flex-1 px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-xs tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Plus size={16} /> MANUAL ADD
                      </button>
                    </div>
                  </div>\`;

  if (content.includes(oldBtnWrapper1)) {
    content = content.replace(oldBtnWrapper1, newBtnWrapper);
  } else if (content.includes(oldBtnWrapper2)) {
    content = content.replace(oldBtnWrapper2, newBtnWrapper.replace(' attendanceFilters)', ')'));
  }

  // 5. Add Manual Add Modal JSX
  if (!content.includes('Manual Add Modal')) {
    content = content.replace('{/* Create/Edit Modal */}', \`\${manualModalJSX}\n      {/* Create/Edit Modal */}\`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('src/pages/allstaff/index.jsx');
patchFile('src/pages/staff/index.jsx');
console.log('Patch complete.');

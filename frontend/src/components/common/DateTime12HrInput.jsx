import React from "react";

export default function DateTime12HrInput({ value, onChange, required = false, isGold = false }) {
  // Parse standard YYYY-MM-DDTHH:mm into parts
  const parseDateTime = (val) => {
    if (!val) {
      // Default to today and 12:00 AM if empty
      const today = new Date().toISOString().split("T")[0];
      return { date: today, hour: "12", minute: "00", ampm: "AM" };
    }
    const [date, time] = val.split("T");
    if (!time) return { date, hour: "12", minute: "00", ampm: "AM" };
    const [hoursStr, minutesStr] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || "00";
    let ampm = "AM";
    if (hours >= 12) {
      ampm = "PM";
      if (hours > 12) hours -= 12;
    }
    if (hours === 0) hours = 12;
    return {
      date,
      hour: String(hours).padStart(2, "0"),
      minute: String(minutes).padStart(2, "0"),
      ampm
    };
  };

  const { date, hour, minute, ampm } = parseDateTime(value);

  const update = (newDate, newHour, newMinute, newAmpm) => {
    if (!newDate) {
      onChange("");
      return;
    }
    let hours = parseInt(newHour, 10);
    if (newAmpm === "PM" && hours < 12) hours += 12;
    if (newAmpm === "AM" && hours === 12) hours = 0;
    const hoursStr = String(hours).padStart(2, "0");
    const minutesStr = String(newMinute).padStart(2, "0");
    onChange(`${newDate}T${hoursStr}:${minutesStr}`);
  };

  // Base styling depending on the theme prop
  const dateBg = isGold ? "bg-white/5" : "bg-white/5";
  const borderStyle = isGold ? "border-[#D0B079]/30" : "border-white/10";
  const focusStyle = isGold ? "focus:border-[#D0B079]" : "focus:border-[#D0B079]/50";
  const textStyle = isGold ? "text-[#D0B079]" : "text-white";

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => update(e.target.value, hour, minute, ampm)}
        className={`flex-1 min-w-0 px-4 py-3 ${dateBg} border ${borderStyle} rounded-xl ${textStyle} focus:outline-none ${focusStyle} font-medium [color-scheme:dark] transition-all`}
        required={required}
      />
      
      {/* Time Picker Controls */}
      <div className="flex gap-1 shrink-0">
        {/* Hour Select */}
        <select
          value={hour}
          onChange={(e) => update(date, e.target.value, minute, ampm)}
          className={`px-3 py-3 bg-[#0b1a3d] border ${borderStyle} rounded-xl ${textStyle} focus:outline-none ${focusStyle} font-medium cursor-pointer transition-all appearance-none text-center min-w-[55px]`}
        >
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
            <option key={h} value={h} className="bg-[#0b1a3d] text-white">
              {h}
            </option>
          ))}
        </select>
        
        <span className="text-white/40 self-center font-bold px-0.5">:</span>
        
        {/* Minute Select */}
        <select
          value={minute}
          onChange={(e) => update(date, hour, e.target.value, ampm)}
          className={`px-3 py-3 bg-[#0b1a3d] border ${borderStyle} rounded-xl ${textStyle} focus:outline-none ${focusStyle} font-medium cursor-pointer transition-all appearance-none text-center min-w-[55px]`}
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
            <option key={m} value={m} className="bg-[#0b1a3d] text-white">
              {m}
            </option>
          ))}
        </select>
        
        {/* AM/PM Select */}
        <select
          value={ampm}
          onChange={(e) => update(date, hour, minute, e.target.value)}
          className={`px-3.5 py-3 bg-[#0b1a3d] border ${borderStyle} rounded-xl text-[#D0B079] focus:outline-none ${focusStyle} font-bold cursor-pointer transition-all appearance-none text-center min-w-[65px]`}
        >
          <option value="AM" className="bg-[#0b1a3d] text-white">AM</option>
          <option value="PM" className="bg-[#0b1a3d] text-white">PM</option>
        </select>
      </div>
    </div>
  );
}

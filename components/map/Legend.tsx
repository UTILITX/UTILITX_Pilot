"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileCog, FileSignature, Locate } from "lucide-react";

const APWA_COLORS = {
  water: "#00A3E0",
  wastewater: "#742774",
  storm: "#3A7D44",
  gas: "#FEDD00",
  telecom: "#F68D2E",
  electric: "#DA291C",
};

const RECORD_TYPES = [
  { type: "asbuilt", label: "As-Built", icon: FileCog },
  { type: "permit", label: "Permit", icon: FileSignature },
  { type: "locate", label: "Locate", icon: Locate },
];

const Legend = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-[536px] z-[9999] flex flex-col items-start gap-2">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="
          flex items-center gap-2 
          bg-white/20 backdrop-blur-xl border border-white/40
          shadow-lg px-4 py-2 rounded-full
          text-sm font-medium text-gray-800
          hover:bg-white/30 hover:shadow-xl
          transition-all active:scale-[0.97]
        "
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        Legend
      </button>

      {/* Legend Panel */}
      {open && (
        <div
          className="
            w-72 bg-white/30 backdrop-blur-xl
            shadow-[0_4px_30px_rgba(0,0,0,0.1)]
            border border-white/40 rounded-2xl p-5
            animate-slide-down transition-all duration-300
          "
        >
          {/* APWA Utility Colours Section */}
          <h3 className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            APWA Utility Colours
          </h3>

          <div className="flex flex-col gap-2 mb-5">
            {Object.entries(APWA_COLORS).map(([label, color]) => (
              <div
                key={label}
                className="
                  flex items-center gap-3 text-sm p-1.5 rounded-lg
                  hover:bg-white/40 hover:shadow-sm transition-all
                "
              >
                <div
                  className="w-3.5 h-3.5 rounded-md shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize text-gray-800">{label}</span>
              </div>
            ))}
          </div>

          {/* Record Types Section */}
          <h3 className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            Record Types
          </h3>

          <div className="flex flex-col gap-2">
            {RECORD_TYPES.map(({ type, label, icon: Icon }) => (
              <div
                key={type}
                className="
                  flex items-center gap-3 text-sm p-1.5 rounded-lg
                  hover:bg-white/40 hover:shadow-sm transition-all
                "
              >
                <Icon size={16} className="text-gray-700" />
                <span className="text-gray-800">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;


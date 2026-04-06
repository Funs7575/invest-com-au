"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Icon from "@/components/Icon";

const IntentPicker = dynamic(() => import("@/components/IntentPicker"), { ssr: false });

export default function HeroIntentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2.5 px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-base rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 active:scale-[0.97] w-full sm:w-auto cursor-pointer"
      >
        What are you looking for?
        <Icon name="arrow-right" size={18} />
      </button>
      <IntentPicker isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

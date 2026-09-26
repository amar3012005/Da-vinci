import React, { useState } from "react";
import { AtSign, ChevronDown, Folder, Plus, Sparkles } from "lucide-react";

const MODEL_LABEL = "@cf/zai-org/glm-5.3-flash";

export default function NewSession({ onSubmit }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("HyperAgents mode");
  const [lane, setLane] = useState("Web-intelligence");
  const [menu, setMenu] = useState("");

  function send() {
    const query = text.trim();
    if (!query) return;
    onSubmit(query);
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white px-6">
      <div className="w-full max-w-[720px] -translate-y-8">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center text-[#111]">
            <Sparkles size={22} strokeWidth={1.75} />
          </span>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111]">Into the Unknown</h1>
          <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-medium text-[#4f46e5]">Preview</span>
        </div>

        <div className="mb-3 flex items-center gap-4 px-1 text-[13px] text-[#3f3f46]">
          <MenuButton label={lane} open={menu === "lane"} onToggle={() => setMenu(menu === "lane" ? "" : "lane")} icon={<Folder size={14} />}>
            {["Web-intelligence", "Company memory", "Browser"].map((item) => (
              <button key={item} type="button" onClick={() => { setLane(item); setMenu(""); }} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f4f5]">{item}</button>
            ))}
          </MenuButton>
          <MenuButton label={mode} open={menu === "mode"} onToggle={() => setMenu(menu === "mode" ? "" : "mode")} icon={<Sparkles size={14} />}>
            {["HyperAgents mode", "Direct answer"].map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setMenu(""); }} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f4f5]">{item}</button>
            ))}
          </MenuButton>
        </div>

        <div className="rounded-[22px] border border-[#ececef] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Describe what you want to build… / commands, @ files or sessions"
            className="w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-6 text-[#18181b] outline-none placeholder:text-[#c4c4cc]"
          />
          <div className="flex items-center gap-1.5 px-3 pb-3">
            <RoundIcon><Plus size={16} /></RoundIcon>
            <RoundIcon><AtSign size={15} /></RoundIcon>
            <button type="button" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] text-[#3f3f46] hover:bg-[#f4f4f5]">
              <Folder size={14} /> Workspace Write <ChevronDown size={13} className="text-[#a1a1aa]" />
            </button>
            <button type="button" className="ml-auto inline-flex max-w-[240px] items-center gap-1 truncate text-[12px] text-[#71717a]">
              <span className="truncate">{MODEL_LABEL}</span>
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!text.trim()}
              aria-label="Send"
              className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-[#c7d2fe] text-[#3730a3] disabled:opacity-50"
            >
              <span className="text-[16px] leading-none">↑</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundIcon({ children }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full text-[#3f3f46] hover:bg-[#f4f4f5]">{children}</span>
  );
}

function MenuButton({ label, icon, open, onToggle, children }) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-[#f4f4f5]">
        {icon} {label} <ChevronDown size={13} className="text-[#a1a1aa]" />
      </button>
      {open ? <div className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded-xl border border-[#ececef] bg-white py-1 shadow-lg">{children}</div> : null}
    </div>
  );
}

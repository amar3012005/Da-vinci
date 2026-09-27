import React, { useState } from "react";
import { ChevronDown, Mic, Paperclip, Plus } from "lucide-react";
import { NativeSessionLayout } from "../../../../../packages/native-session-layout";
import apiClient from "../../shared/api-client";
import SingulanceMark from "../../shared/SingulanceMark";
import AgentAvatar from "../AgentAvatar";

const MODEL_LABEL = "@cf/zai-org/glm-5.3-flash";

export default function NewSession({ onSubmit }) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = React.useState([]);
  const [ownerId, setOwnerId] = React.useState("");
  const selectedEmployee = employees.find((employee) => employee.id === ownerId);

  React.useEffect(() => {
    let active = true;
    apiClient.listEmployees().then(({ employees: list }) => {
      if (!active) return;
      const available = (list || []).filter((employee) => employee.status !== "archived").slice(0, 3);
      setEmployees(available);
      setOwnerId((current) => current || available[0]?.id || "");
      if (!available.length) setError("Create a HyperAgent before starting a session.");
    }).catch(() => { if (active) setError("Could not load your HyperAgents."); });
    return () => { active = false; };
  }, []);

  async function send() {
    const query = text.trim();
    if (!query || !ownerId || sending) return;
    setSending(true);
    setError("");
    try {
      await onSubmit(query, { mode: "auto", employeeId: ownerId, employeeIds: employees.map(({ id }) => id) });
    } catch (cause) {
      setError(cause.response?.data?.error || cause.message || "Could not create room.");
      setSending(false);
    }
  }

  return (
    <NativeSessionLayout>
      <div className="w-full">
        <div className="mb-7 flex items-center justify-start gap-2.5">
          <SingulanceMark size={32} />
          <h1 className="text-[30px] font-normal leading-9 tracking-[-0.025em] text-[#808080]">OS · Remember what matters.</h1>
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="rounded-[20px] border border-[#e9e9e9] bg-white shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
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
            placeholder="Describe what you want to build, / commands, @ files or sessions"
            className="w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-6 text-[#18181b] outline-none placeholder:text-[#b7bbc2]"
          />
          <div className="flex items-center gap-1.5 px-3 pb-3">
            <RoundIcon><Plus size={16} /></RoundIcon>
            <RoundIcon><Paperclip size={15} /></RoundIcon>
            <div className="relative">
              <button type="button" aria-label="Choose HyperAgent" aria-haspopup="menu" aria-expanded={menu === "employee"}
                onClick={() => setMenu(menu === "employee" ? "" : "employee")}
                className="inline-flex max-w-[190px] items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-[#3f3f46] hover:bg-[#f4f4f5]">
                <AgentAvatar agent={selectedEmployee} size={22} faceOnly />
                <span className="truncate">{selectedEmployee?.name || "Choose HyperAgent"}</span>
                <ChevronDown size={13} className="shrink-0 text-[#a1a1aa]" />
              </button>
              {menu === "employee" && <div role="menu" aria-label="HyperAgents" className="absolute bottom-full left-0 z-20 mb-2 min-w-[230px] rounded-xl border border-[#ececef] bg-white py-1 shadow-lg">
                {employees.map((employee) => (
                  <button key={employee.id} type="button" role="menuitemradio" aria-checked={ownerId === employee.id}
                    onClick={() => { setOwnerId(employee.id); setMenu(""); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f4f4f5]">
                    <AgentAvatar agent={employee} size={28} faceOnly />
                    <span className="min-w-0"><span className="block truncate text-[13px] font-medium text-[#18181b]">{employee.name}</span><span className="block truncate text-[11px] text-[#71717a]">{employee.roleArchetype || "HyperAgent"}</span></span>
                  </button>
                ))}
              </div>}
            </div>
            <RoundIcon><Mic size={15} /></RoundIcon>
            <button type="button" className="ml-auto inline-flex max-w-[240px] items-center gap-1 truncate text-[12px] text-[#71717a]">
              <span className="truncate">{MODEL_LABEL}</span>
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() || !ownerId || sending}
              aria-label="Send"
              className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#a9c1fc] text-white disabled:opacity-50"
            >
              <span className="text-[16px] leading-none">↑</span>
            </button>
          </div>
        </div>
      </div>
    </NativeSessionLayout>
  );
}

function RoundIcon({ children }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full text-[#3f3f46] hover:bg-[#f4f4f5]">{children}</span>
  );
}

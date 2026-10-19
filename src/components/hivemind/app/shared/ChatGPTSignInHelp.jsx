import React from 'react';
/** Guidance only: OpenAI account permissions are changed by the user at OpenAI. */
export default function ChatGPTSignInHelp() {
 return <aside aria-label="ChatGPT device sign-in setup" className="mt-4 rounded-xl border border-[#dce7f7] bg-[#f6f9ff] p-4 text-sm text-[#454b55]">
  <h3 className="font-semibold text-[#171717]">Set up device sign-in once</h3>
  <p className="mt-1 text-xs leading-5">Device sign-in avoids the localhost error page. Enable it in the ChatGPT account you want to connect.</p>
  <div className="mt-3 grid gap-4 sm:grid-cols-2">
   <div><h4 className="text-xs font-semibold text-[#171717]">Personal ChatGPT account</h4><ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5"><li>Open ChatGPT and select your profile → Settings.</li><li>Open Security (it may be called Security and login).</li><li>Enable device-code authorization or sign-in for Codex. Some accounts include Excel, PowerPoint and Word in this setting’s name.</li></ol></div>
   <div><h4 className="text-xs font-semibold text-[#171717]">Business or Enterprise workspace</h4><ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5"><li>A workspace owner opens Workspace settings → Permissions &amp; roles.</li><li>Enable “Enable device code authentication for Codex CLI” for the appropriate members. If you cannot change it, ask your workspace admin.</li></ol></div>
  </div>
  <p className="mt-3 text-xs leading-5">Then return here, choose the device-code sign-in method, open the verification link and enter the code shown here. This panel waits for the provider’s confirmation.</p>
  <div className="mt-3 flex flex-wrap gap-4 text-xs"><a className="font-medium text-blue-700 underline underline-offset-4" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT</a><a className="text-[#666] underline underline-offset-4" href="https://learn.chatgpt.com/docs/auth#login-on-headless-devices" target="_blank" rel="noreferrer">Official sign-in guide</a></div>
 </aside>;
}

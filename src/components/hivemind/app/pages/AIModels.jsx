import React from 'react';
import { Cpu } from 'lucide-react';
import ModelConnectionCard from '../shared/ModelConnectionCard';
import OpenRouterConnectionCard from '../shared/OpenRouterConnectionCard';

/** Model accounts live here, independently of billing and usage reporting. */
export default function AIModels() {
 return <main className="mx-auto w-full max-w-6xl py-4" aria-label="AI Models">
  <header className="mb-7 flex items-center gap-3">
   <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#117dff]"><Cpu size={23}/></span>
   <div><h1 className="text-2xl font-semibold text-[#171717]">AI Models</h1><p className="mt-1 text-sm text-[#737373]">Connect your model accounts and explore available models.</p></div>
  </header>
  <div className="flex flex-col gap-1"><ModelConnectionCard compact/><OpenRouterConnectionCard compact/></div>
 </main>;
}

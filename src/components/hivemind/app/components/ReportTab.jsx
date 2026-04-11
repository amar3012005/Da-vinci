import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, Award } from 'lucide-react';

export function renderMarkdown(text) {
  if (!text) return '';

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#0a0a0a]/90 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#0a0a0a]/90 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#0a0a0a] mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#0a0a0a]/90 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#117dff] text-xs font-mono">$1</code>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-[#525252]/80">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#525252]/80">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-[#525252]/80">$1</li>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#117dff] hover:text-[#0a6ddb] underline underline-offset-2">$1</a>'
    )
    .replace(/^---$/gm, '<hr class="border-[#e3e0db] my-4" />')
    .replace(/\n\n/g, '</p><p class="text-[#525252]/80 leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');
}

/**
 * ReportTab displays synthesized report content and research summary stats.
 */
export default function ReportTab({
  report = null,
  findings = [],
  durationMs = 0,
  confidence = 0,
  fromCache = false,
  onSaveAsBlueprint,
  isGenerating = false,
  className = '',
}) {
  const showLoadingState = !report && isGenerating;

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`h-full ${className}`.trim()}
    >
      {report ? (
        <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-[#117dff]" />
              <span className="text-xs text-[#525252] font-mono">{findings.length} findings</span>
            </div>
            <span className="text-[#e3e0db]">·</span>
            <span className="text-xs text-[#525252] font-mono">{(durationMs / 1000).toFixed(1)}s</span>
            <span className="text-[#e3e0db]">·</span>
            <span className="text-xs text-[#525252] font-mono">{(confidence * 100).toFixed(0)}% confidence</span>
            {fromCache && (
              <>
                <span className="text-[#e3e0db]">·</span>
                <span className="px-2 py-0.5 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] text-[10px] font-medium">
                  Cached
                </span>
              </>
            )}
            {onSaveAsBlueprint && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={onSaveAsBlueprint}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#d97706]/10 border border-[#d97706]/20 text-[#d97706] text-[10px] font-medium hover:bg-[#d97706]/20 transition-colors"
                  title="Save this research state as reusable blueprint"
                >
                  <Award size={10} />
                  Save as Blueprint
                </button>
              </div>
            )}
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <div
              className="text-[#525252] leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(report),
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-[#525252]">
          <Loader2 size={32} className={`${showLoadingState ? 'animate-spin' : ''} text-[#117dff] mb-3`} />
          <p className="text-sm">{showLoadingState ? 'Generating report...' : 'No report available yet'}</p>
        </div>
      )}
    </motion.div>
  );
}

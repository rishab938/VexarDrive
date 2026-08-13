import React from 'react';
import { ShieldAlert, Cpu, HelpCircle } from 'lucide-react';

interface ExplainerCardProps {
  id: string;
  explanation: string | null;
  score: number;
  category: string;
  onOpenLineage: () => void;
  isLoading?: boolean;
}

export const ExplainerCard: React.FC<ExplainerCardProps> = ({
  id,
  explanation,
  score,
  category,
  onOpenLineage,
  isLoading = false,
}) => {
  // Determine if it was likely an LLM summary (contains AI-like phrases) or template
  const isLLM = explanation ? !explanation.includes("Primary telemetry markers") && !explanation.includes("primary concerns are") : false;

  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Analytical Explanation</h4>
            <span className="text-xs text-slate-500">Justifying score calculation</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass-pill px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            {isLLM ? (
              <>
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                AI Assistant
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                Core Rules engine
              </>
            )}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 bg-slate-800 rounded w-full"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          <div className="h-4 bg-slate-800 rounded w-4/6"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            {explanation || `Loading score details for ${id}...`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Analytical Value</span>
                <span className="text-sm font-bold text-slate-200">{score.toFixed(1)} ({category})</span>
              </div>
            </div>
            <button
              onClick={onOpenLineage}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Trace Metric Lineage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

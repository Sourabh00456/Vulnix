export default function ThreatScore({ score, status, progress = 0, step = "Idle" }: { score: number, status: string, progress?: number, step?: string }) {
  const riskLevel = score >= 90 ? "Critical Risk" : score >= 70 ? "Elevated Risk" : "Moderate Risk";
  const circleOffset = status === "scanning" 
      ? 552.92 - ((552.92 * progress) / 100) 
      : 552.92 - ((552.92 * score) / 100);

  return (
    <div className="bg-surface-container-high rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/10 blur-[100px] rounded-full"></div>
      <h3 className="label-font text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-8">
          {status === "scanning" ? "Active Operation Progress" : "Composite Threat Index"}
      </h3>
      
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle className="text-surface-container-lowest" cx="96" cy="96" fill="transparent" r="88" strokeWidth="4"></circle>
          <circle 
            className="text-primary-container transition-all duration-[2000ms] ease-out" 
            cx="96" cy="96" 
            fill="transparent" r="88" 
            stroke="currentColor" 
            strokeDasharray="552.92" 
            strokeDashoffset={circleOffset}
            strokeWidth="12"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-black tracking-tighter text-white">
            {status === "scanning" ? `${progress}%` : score}
          </span>
          <span className="mono text-[10px] uppercase text-primary tracking-widest mt-1">
            {status === "scanning" ? step : riskLevel}
          </span>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4 w-full opacity-70">
        <div className="p-4 bg-surface-container-lowest rounded-xl">
          <p className="mono text-[10px] text-on-surface-variant uppercase mb-1">State</p>
          <p className="text-sm font-bold text-primary">{status === "scanning" ? "ACTIVE" : "SEALED"}</p>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl">
          <p className="mono text-[10px] text-on-surface-variant uppercase mb-1">Sequence</p>
          <p className="text-sm font-bold truncate">{step}</p>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl">
          <p className="mono text-[10px] text-on-surface-variant uppercase mb-1">Score</p>
          <p className="text-sm font-bold">{status === "scanning" ? "--" : score}</p>
        </div>
      </div>
    </div>
  );
}

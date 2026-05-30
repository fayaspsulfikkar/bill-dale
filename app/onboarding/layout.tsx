import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Setup — BillDale",
  description: "Set up your business profile to start billing",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>
      <div className="w-full max-w-2xl relative z-10">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="font-bold text-white text-lg">B</span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">
            Bill<span className="text-blue-600">Dale</span>
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}

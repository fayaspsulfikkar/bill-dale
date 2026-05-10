import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Setup — BillDale",
  description: "Set up your business profile to start billing",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-lg relative z-10">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.4)]">
            <span className="font-bold text-background text-sm">B</span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            Bill<span className="text-primary">Dale</span>
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}

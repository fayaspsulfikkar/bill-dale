import { DashboardSidebar } from "@/components/DashboardSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { BranchLoginModal } from "@/components/pos/BranchLoginModal";
import { CurrencyRefreshBoundary } from "@/components/CurrencyRefreshBoundary";
import { GlobalSync } from "@/components/GlobalSync";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden relative">
      <GlobalSync />
      {/* Global Terminal Lock Modal */}
      <div className="z-50">
        <BranchLoginModal />
      </div>

      <div className="print:hidden">
        <DashboardSidebar />
      </div>
      <div className="flex-1 ml-64 flex flex-col print:ml-0">
        {/* Top header */}
        <header className="h-14 shrink-0 border-b border-border/30 bg-card/20 backdrop-blur-sm flex items-center justify-end px-6 gap-3 z-30 print:hidden">
          <NotificationBell />
        </header>
        <main className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible relative">
          <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
            <CurrencyRefreshBoundary>
              {children}
            </CurrencyRefreshBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

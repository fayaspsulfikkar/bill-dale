import { DashboardSidebar } from "@/components/DashboardSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="print:hidden">
        <DashboardSidebar />
      </div>
      <div className="flex-1 ml-64 flex flex-col print:ml-0">
        {/* Top header */}
        <header className="h-14 border-b border-border/30 bg-card/20 backdrop-blur-sm flex items-center justify-end px-6 gap-3 sticky top-0 z-30 print:hidden">
          <NotificationBell />
        </header>
        <main className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

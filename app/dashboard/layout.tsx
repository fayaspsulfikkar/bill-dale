import { DashboardSidebar } from "@/components/DashboardSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 ml-64 flex flex-col">
        {/* Top header */}
        <header className="h-14 border-b border-border/30 bg-card/20 backdrop-blur-sm flex items-center justify-end px-6 gap-3 sticky top-0 z-30">
          <NotificationBell />
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

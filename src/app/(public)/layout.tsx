import { SiteHeader } from "@/components/public/layout/SiteHeader";
import { SiteSidebar } from "@/components/public/layout/SiteSidebar";
import { SiteFooter } from "@/components/public/layout/SiteFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
        <SiteSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SiteFooter />
    </div>
  );
}

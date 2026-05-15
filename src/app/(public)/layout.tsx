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

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 sm:gap-8 lg:gap-10 px-4 sm:px-6 py-6 sm:py-8 lg:py-10 lg:flex-row">
        <div className="hidden lg:block lg:w-56">
          <SiteSidebar />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SiteFooter />
    </div>
  );
}

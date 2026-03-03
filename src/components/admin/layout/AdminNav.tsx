"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Tag, LogOut, ExternalLink } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/manage", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/manage/recipes", label: "Recipes", icon: BookOpen, exact: false },
  { href: "/manage/labels", label: "Labels", icon: Tag, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0">
      <div className="space-y-6">
        <div>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Manage
          </p>
          <nav className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border pt-4 space-y-0.5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            View site
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

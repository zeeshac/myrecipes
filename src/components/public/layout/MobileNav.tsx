"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Label } from "@/db/schema";

type Props = {
  labels: Label[];
};

export function MobileNav({ labels }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-border bg-background/95 backdrop-blur-sm lg:hidden">
          <nav aria-label="Mobile navigation" className="px-4 py-4">
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/recipes"
                  className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  All Recipes
                </Link>
              </li>
              {labels.map((label) => (
                <li key={label.id}>
                  <Link
                    href={`/label/${label.slug}`}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    {label.color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                        aria-hidden="true"
                      />
                    )}
                    {label.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}

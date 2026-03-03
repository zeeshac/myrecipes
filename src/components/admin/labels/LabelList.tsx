"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteLabel, updateLabel, reorderLabels, toggleLabelNav } from "@/app/manage/labels/actions";
import type { Label } from "@/db/schema";

export function LabelList({ labels: initialLabels }: { labels: Label[] }) {
  const [items, setItems] = useState(initialLabels);
  const [editingId, setEditingId] = useState<string | null>(null);

  function toggleNav(idx: number) {
    const next = items.map((item, i) =>
      i === idx ? { ...item, showInNav: !item.showInNav } : item
    );
    setItems(next);
    toggleLabelNav(next[idx].id, next[idx].showInNav);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
    reorderLabels(next.map((l) => l.id));
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No labels yet. Create your first one above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
      {items.map((label, idx) => (
        <li key={label.id}>
          {editingId === label.id ? (
            <form
              action={async (fd) => {
                await updateLabel(label.id, fd);
                setEditingId(null);
              }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <input type="hidden" name="sortOrder" defaultValue={label.sortOrder} />
              <Input
                name="name"
                defaultValue={label.name}
                className="h-8 w-40"
                autoFocus
                required
              />
              <Input
                name="color"
                type="color"
                defaultValue={label.color ?? "#c5603a"}
                className="h-8 w-12 cursor-pointer p-1"
              />
              <div className="flex gap-1.5 ml-auto">
                <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {label.color && (
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
              )}
              <span className="text-sm font-medium text-foreground">{label.name}</span>
              <span className="text-xs text-muted-foreground">/{label.slug}</span>
              <div className="flex gap-1.5 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${label.showInNav ? "text-muted-foreground" : "text-muted-foreground/40"}`}
                  onClick={() => toggleNav(idx)}
                  title={label.showInNav ? "Hide from navigation" : "Show in navigation"}
                >
                  {label.showInNav ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingId(label.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <form action={deleteLabel.bind(null, label.id)}>
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

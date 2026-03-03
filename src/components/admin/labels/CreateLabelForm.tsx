"use client";

import { useActionState } from "react";
import { createLabel } from "@/app/manage/labels/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLabelForm() {
  const [state, action, pending] = useActionState(createLabel, null);

  return (
    <form action={action} className="rounded-xl border border-border p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">New label</h2>
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Breakfast" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue="#c5603a"
            className="h-9 w-14 cursor-pointer p-1"
          />
        </div>
        <div className="space-y-1.5 w-20">
          <Label htmlFor="sortOrder">Order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue="0"
            className="h-9"
          />
        </div>
        <Button type="submit" disabled={pending}>Add</Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      )}
    </form>
  );
}

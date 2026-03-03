"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Loader2, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRecipe, updateRecipe, importRecipeFromUrl } from "@/app/manage/recipes/actions";
import { parseIngredientLine, parseStepsText } from "@/lib/parseIngredients";
import type { Label as LabelType, RecipeWithRelations } from "@/db/schema";

type IngRow = { amount: string; name: string };

// ─── Blob parser ──────────────────────────────────────────────────────────────

function parseRecipeBlob(text: string) {
  const lines = text.split("\n").map((l) => l.trim());

  const isIngHeader = (l: string) =>
    /^(ingredients?|what you('ll)? need):?$/i.test(l);
  const isStepHeader = (l: string) =>
    /^(instructions?|directions?|steps?|method|how to make|preparation):?$/i.test(l);

  let section: "pre" | "ingredients" | "steps" = "pre";
  const preLines: string[] = [];
  const ingLines: string[] = [];
  const stepLines: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    if (isIngHeader(line)) { section = "ingredients"; continue; }
    if (isStepHeader(line)) { section = "steps"; continue; }
    if (section === "pre") preLines.push(line);
    else if (section === "ingredients") ingLines.push(line);
    else stepLines.push(line);
  }

  // Heuristic split when no headers
  if (ingLines.length === 0 && stepLines.length === 0 && preLines.length > 2) {
    const measurePat = /^\d|^[½⅓⅔¼¾⅛]/;
    const numberedPat = /^\d+[.)]\s/;
    for (const line of preLines.slice(1)) {
      if (numberedPat.test(line) || line.length > 80) stepLines.push(line);
      else if (measurePat.test(line)) ingLines.push(line);
      else if (line.length < 50) ingLines.push(line);
      else stepLines.push(line);
    }
    preLines.splice(1);
  }

  return {
    title: preLines[0] ?? "",
    description: preLines.slice(1).join(" "),
    ingredientLines: ingLines,
    steps: stepLines,
  };
}

function lineToIngRow(line: string): IngRow {
  const p = parseIngredientLine(line);
  const amount = [p.qty, p.unit].filter(Boolean).join(" ");
  const name = [p.name, p.notes].filter(Boolean).join(", ");
  return { amount, name: name || line };
}

function emptyIngRow(): IngRow {
  return { amount: "", name: "" };
}

// Strip numbered prefixes like "1." "2)" from steps
function stripNumberedPrefix(line: string) {
  return line.replace(/^\d+[.)]\s*/, "").trim();
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  allLabels: LabelType[];
  recipe?: RecipeWithRelations;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipeForm({ allLabels, recipe }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Basic fields
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(recipe?.heroImageUrl ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? "");
  const [difficulty, setDifficulty] = useState<string>(recipe?.difficulty ?? "");

  // Image upload
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Labels
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    recipe?.recipeLabels.map((rl) => rl.label.id) ?? []
  );

  // Ingredients: array of { amount, name } rows
  const [ingredients, setIngredients] = useState<IngRow[]>(() => {
    if (!recipe || recipe.sections.length === 0) return [emptyIngRow()];
    const section = [...recipe.sections].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    const rows = [...section.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        amount: [i.qty, i.unit].filter(Boolean).join(" "),
        name: [i.name, i.notes].filter(Boolean).join(", "),
      }));
    return rows.length > 0 ? rows : [emptyIngRow()];
  });

  // Steps: array of editable strings (one per step)
  const [steps, setSteps] = useState<string[]>(() => {
    if (!recipe || recipe.sections.length === 0) return [""];
    const section = [...recipe.sections].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    const lines = [...section.steps]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((st) => st.content);
    return lines.length > 0 ? lines : [""];
  });

  // Paste blob
  const [blobText, setBlobText] = useState("");
  const [blobParsed, setBlobParsed] = useState(false);

  // URL import
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function toggleLabel(id: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function handleParseBlob() {
    if (!blobText.trim()) return;
    const parsed = parseRecipeBlob(blobText);
    if (parsed.title) setTitle(parsed.title);
    if (parsed.description) setDescription(parsed.description);
    setIngredients(parsed.ingredientLines.length > 0 ? parsed.ingredientLines.map(lineToIngRow) : [emptyIngRow()]);
    setSteps(parsed.steps.length > 0 ? parsed.steps.map(stripNumberedPrefix) : [""]);
    setBlobParsed(true);
  }

  async function handleImageUpload(file: File) {
    setImageError("");
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setImageUploading(false);
    if (!res.ok || json.error) setImageError(json.error ?? "Upload failed.");
    else setHeroImageUrl(json.url);
  }

  async function handleUrlImport() {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError("");
    const result = await importRecipeFromUrl(importUrl.trim());
    setImportLoading(false);
    if (result.error) { setImportError(result.error); return; }
    const d = result.data!;
    if (d.title) setTitle(d.title);
    if (d.description) setDescription(d.description);
    if (d.servings) setServings(d.servings);
    if (d.rawIngredients.length > 0) setIngredients(d.rawIngredients.map(lineToIngRow));
    if (d.rawSteps.length > 0) setSteps(d.rawSteps.map(stripNumberedPrefix));
    setImportUrl("");
    setBlobParsed(true);
  }

  // Ingredient row helpers
  function updateIngredient(idx: number, patch: Partial<IngRow>) {
    setIngredients((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function addIngredient(afterIdx: number) {
    setIngredients((prev) => [...prev.slice(0, afterIdx + 1), emptyIngRow(), ...prev.slice(afterIdx + 1)]);
  }
  function removeIngredient(idx: number) {
    setIngredients((prev) => (prev.length === 1 ? [emptyIngRow()] : prev.filter((_, i) => i !== idx)));
  }

  // Step row helpers
  function updateStep(idx: number, val: string) {
    setSteps((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }
  function addStep(afterIdx: number) {
    setSteps((prev) => [...prev.slice(0, afterIdx + 1), "", ...prev.slice(afterIdx + 1)]);
  }
  function removeStep(idx: number) {
    setSteps((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== idx)));
  }

  function handleSubmit(publish: boolean) {
    setError(null);
    const filteredIngredients = ingredients.filter((r) => r.name.trim() || r.amount.trim());
    const filteredSteps = steps.filter((l) => l.trim());

    const data = {
      title,
      description,
      heroImageUrl,
      heroImageAlt: title,
      servings,
      difficulty: (difficulty as "easy" | "medium" | "hard") || undefined,
      isPublished: publish,
      labelIds: selectedLabelIds,
      sections: [
        {
          title: "",
          ingredients: filteredIngredients.map((r) => ({
            qty: r.amount,
            unit: "",
            name: r.name,
            notes: "",
          })),
          steps: filteredSteps.map((content) => ({ content, imageUrl: "" })),
        },
      ],
    };

    startTransition(async () => {
      try {
        const result = recipe
          ? await updateRecipe(recipe.id, data)
          : await createRecipe(data);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
        } else if (recipe) {
          // updateRecipe returns { error: null } on success
          toast.success("Recipe saved!");
        }
        // createRecipe redirects on success — no toast needed
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
        // NEXT_REDIRECT is thrown by redirect() — not a real error
        if (msg.includes("NEXT_REDIRECT")) return;
        setError(msg);
        toast.error(msg);
      }
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Quick fill (new recipes only) ── */}
      {!recipe && (!blobParsed ? (
        <div className="rounded-xl border border-border bg-accent/20 p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Paste your recipe</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste the full text and click Parse — title, ingredients, and steps will be extracted automatically. You can fix anything below.
            </p>
          </div>

          <Textarea
            value={blobText}
            onChange={(e) => setBlobText(e.target.value)}
            rows={8}
            placeholder={"Shami Kabab\n\nIngredients:\n500g chicken mince\n1 cup chana dal\n2 tsp ginger garlic paste\n\nInstructions:\n1. Boil chicken and dal together\n2. Grind to a smooth mixture\n3. Shape into patties and pan fry"}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleParseBlob} disabled={!blobText.trim()}>
              Parse & fill form
            </Button>
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex gap-2 flex-1">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Import from URL…"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleUrlImport}
                disabled={importLoading || !importUrl.trim()}
              >
                {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </div>
          </div>
          {importError && <p className="text-xs text-destructive">{importError}</p>}

          <button
            type="button"
            onClick={() => setBlobParsed(true)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Skip — I'll fill in manually
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent/10 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">Recipe imported — review and fix anything below before saving.</p>
          <button
            type="button"
            onClick={() => { setBlobParsed(false); setBlobText(""); }}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Start over
          </button>
        </div>
      ))}

      {/* ── Title & description ── */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A short description shown on recipe cards"
          />
        </div>
      </div>

      {/* ── Image ── */}
      <div className="space-y-2">
        <Label>Recipe photo</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
        {heroImageUrl ? (
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl bg-accent/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImageUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setHeroImageUrl("")}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/20 py-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {imageUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
            {imageUploading ? "Uploading…" : "Click to upload photo"}
          </button>
        )}
        {imageError && <p className="text-xs text-destructive">{imageError}</p>}
      </div>

      {/* ── Details ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4 servings"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="difficulty">Difficulty</Label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="">—</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* ── Labels ── */}
      {allLabels.length > 0 && (
        <div className="space-y-3">
          <Label>
            Labels <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {allLabels.map((label) => {
              const selected = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                  style={
                    selected && label.color
                      ? { backgroundColor: label.color, borderColor: label.color, color: "#fff" }
                      : undefined
                  }
                >
                  {label.name}
                </button>
              );
            })}
          </div>
          {selectedLabelIds.length === 0 && (
            <p className="text-xs text-muted-foreground">Select at least one label.</p>
          )}
        </div>
      )}

      {/* ── Ingredients ── */}
      <div className="space-y-3">
        <div className="border-t border-border pt-6">
          <h2 className="font-serif text-xl font-semibold text-foreground">Ingredients</h2>
        </div>
        <div className="mb-1 grid grid-cols-[1.5rem_1fr_2fr_1.5rem] gap-2 px-0.5">
          <span />
          <span className="text-xs font-medium text-muted-foreground">Amount</span>
          <span className="text-xs font-medium text-muted-foreground">Ingredient</span>
          <span />
        </div>
        <div className="space-y-1.5">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="grid grid-cols-[1.5rem_1fr_2fr_1.5rem] items-center gap-2">
              <span className="text-right text-xs text-muted-foreground">{idx + 1}</span>
              <Input
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, { amount: e.target.value })}
                placeholder="1 cup"
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addIngredient(idx); }
                }}
              />
              <Input
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                placeholder="all-purpose flour"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addIngredient(idx); }
                }}
              />
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove ingredient"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addIngredient(ingredients.length - 1)}
          className="mt-1 text-muted-foreground"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add ingredient
        </Button>
      </div>

      {/* ── Steps ── */}
      <div className="space-y-3">
        <div className="border-t border-border pt-6">
          <h2 className="font-serif text-xl font-semibold text-foreground">Instructions</h2>
        </div>
        <p className="text-xs text-muted-foreground">One step per line. Press Enter to add the next step.</p>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {idx + 1}
              </span>
              <Textarea
                value={step}
                onChange={(e) => updateStep(idx, e.target.value)}
                placeholder={`Step ${idx + 1}…`}
                rows={2}
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addStep(idx); }
                }}
              />
              <button
                type="button"
                onClick={() => removeStep(idx)}
                className="mt-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove step"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addStep(steps.length - 1)}
          className="mt-1 text-muted-foreground"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add step
        </Button>
      </div>

      {/* ── Error ── */}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button onClick={() => handleSubmit(true)} disabled={isPending || !title.trim() || (allLabels.length > 0 && selectedLabelIds.length === 0)}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {recipe?.isPublished ? "Save changes" : "Publish"}
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isPending || !title.trim() || (allLabels.length > 0 && selectedLabelIds.length === 0)}>
          Save as draft
        </Button>
        <Button variant="ghost" onClick={() => router.push("/manage/recipes")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

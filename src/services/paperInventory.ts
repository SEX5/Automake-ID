import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SavedPaper, PaperBlockLayout } from '../types';

const STORAGE_KEY_PAPERS = 'idprint_saved_papers_v1';
const STORAGE_KEY_OWNER = 'idprint_owner_id';

let client: SupabaseClient | null = null;
let clientAttempted = false;

/**
 * Lazily creates the Supabase client from Vite env vars.
 * Returns null when the project is not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (clientAttempted) return client;
  clientAttempted = true;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  try {
    client = createClient(url, anonKey);
  } catch {
    client = null;
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

/** Local storage helpers for instant zero-config persistence */
function getLocalPapers(): SavedPaper[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAPERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalPapers(papers: SavedPaper[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PAPERS, JSON.stringify(papers));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

export function getOwnerId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_OWNER);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY_OWNER, id);
    }
    return id;
  } catch {
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

/** Stable cell identity: "<blockIndex>:<cellIndex>" (row-major within a block). */
export function cellKey(blockIdx: number, cellIdx: number): string {
  return `${blockIdx}:${cellIdx}`;
}

export interface SavePaperInput {
  name: string;
  paperSize: string;
  sizeId: string;
  customWidthMm?: number;
  customHeightMm?: number;
  isCombo: boolean;
  marginMm: number;
  spacingMm: number;
  blocks: PaperBlockLayout[];
  cutCells?: string[];
}

export async function listPapers(): Promise<SavedPaper[]> {
  const localList = getLocalPapers();
  const sb = getSupabase();
  if (!sb) {
    return localList;
  }

  try {
    const { data, error } = await sb
      .from('saved_papers')
      .select('*')
      .eq('owner_id', getOwnerId())
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Merge remote into local
      setLocalPapers(data as SavedPaper[]);
      return data as SavedPaper[];
    }
  } catch (err) {
    console.warn('Supabase fetch failed, using local storage:', err);
  }

  return localList;
}

export async function savePaper(input: SavePaperInput): Promise<SavedPaper> {
  const now = new Date().toISOString();
  const localPaper: SavedPaper = {
    id: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    owner_id: getOwnerId(),
    name: input.name,
    paper_size: input.paperSize,
    size_id: input.sizeId,
    custom_width_mm: input.customWidthMm ?? null,
    custom_height_mm: input.customHeightMm ?? null,
    is_combo: input.isCombo,
    margin_mm: input.marginMm,
    spacing_mm: input.spacingMm,
    blocks: input.blocks,
    cut_cells: input.cutCells ?? [],
    created_at: now,
    updated_at: now,
  };

  // Always save locally first so it works 100% offline & without setup
  const current = getLocalPapers();
  setLocalPapers([localPaper, ...current.filter((p) => p.id !== localPaper.id)]);

  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('saved_papers')
        .insert({
          owner_id: localPaper.owner_id,
          name: localPaper.name,
          paper_size: localPaper.paper_size,
          size_id: localPaper.size_id,
          custom_width_mm: localPaper.custom_width_mm,
          custom_height_mm: localPaper.custom_height_mm,
          is_combo: localPaper.is_combo,
          margin_mm: localPaper.margin_mm,
          spacing_mm: localPaper.spacing_mm,
          blocks: localPaper.blocks,
          cut_cells: localPaper.cut_cells,
        })
        .select()
        .single();

      if (!error && data) {
        // Replace with remote version
        const updated = getLocalPapers().map((p) => (p.id === localPaper.id ? (data as SavedPaper) : p));
        setLocalPapers(updated);
        return data as SavedPaper;
      }
    } catch (err) {
      console.warn('Supabase insert failed, paper kept in localStorage:', err);
    }
  }

  return localPaper;
}

export async function updatePaperCuts(id: string, cutCells: string[]): Promise<void> {
  const now = new Date().toISOString();
  const current = getLocalPapers();
  const updated = current.map((p) => (p.id === id ? { ...p, cut_cells: cutCells, updated_at: now } : p));
  setLocalPapers(updated);

  const sb = getSupabase();
  if (sb) {
    try {
      await sb
        .from('saved_papers')
        .update({ cut_cells: cutCells, updated_at: now })
        .eq('id', id)
        .eq('owner_id', getOwnerId());
    } catch (err) {
      console.warn('Supabase update cuts failed:', err);
    }
  }
}

export async function renamePaper(id: string, name: string): Promise<void> {
  const now = new Date().toISOString();
  const current = getLocalPapers();
  const updated = current.map((p) => (p.id === id ? { ...p, name, updated_at: now } : p));
  setLocalPapers(updated);

  const sb = getSupabase();
  if (sb) {
    try {
      await sb
        .from('saved_papers')
        .update({ name, updated_at: now })
        .eq('id', id)
        .eq('owner_id', getOwnerId());
    } catch (err) {
      console.warn('Supabase rename failed:', err);
    }
  }
}

export async function deletePaper(id: string): Promise<void> {
  const current = getLocalPapers();
  setLocalPapers(current.filter((p) => p.id !== id));

  const sb = getSupabase();
  if (sb) {
    try {
      await sb
        .from('saved_papers')
        .delete()
        .eq('id', id)
        .eq('owner_id', getOwnerId());
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }
}

export function totalCells(paper: SavedPaper): number {
  return (paper.blocks ?? []).reduce((sum, b) => sum + (b.cell_count || 0), 0);
}

export function countFreeCells(paper: SavedPaper): number {
  const cut = new Set(paper.cut_cells ?? []);
  let free = 0;
  for (const b of paper.blocks ?? []) {
    for (let i = 0; i < (b.cell_count || 0); i++) {
      if (!cut.has(cellKey(b.block_index, i))) free++;
    }
  }
  return free;
}


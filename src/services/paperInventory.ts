import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SavedPaper, PaperBlockLayout } from '../types';

const STORAGE_KEY_OWNER = 'idprint_owner_id';

let client: SupabaseClient | null = null;
let clientAttempted = false;

/**
 * Lazily creates the Supabase client from Vite env vars.
 * Returns null when the project is not configured (env vars missing),
 * so the UI can show a setup hint instead of crashing.
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

/**
 * Per-browser owner id (no login required for v1). Stored in localStorage
 * so a user's saved papers stay scoped to their own browsers.
 */
export function getOwnerId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_OWNER);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY_OWNER, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode etc.) — fall back to ephemeral id
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
}

export async function listPapers(): Promise<SavedPaper[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('saved_papers')
    .select('*')
    .eq('owner_id', getOwnerId())
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SavedPaper[]) ?? [];
}

export async function savePaper(input: SavePaperInput): Promise<SavedPaper> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await sb
    .from('saved_papers')
    .insert({
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
      cut_cells: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedPaper;
}

export async function updatePaperCuts(id: string, cutCells: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const { error } = await sb
    .from('saved_papers')
    .update({ cut_cells: cutCells, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', getOwnerId());
  if (error) throw error;
}

export async function renamePaper(id: string, name: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const { error } = await sb
    .from('saved_papers')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', getOwnerId());
  if (error) throw error;
}

export async function deletePaper(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const { error } = await sb
    .from('saved_papers')
    .delete()
    .eq('id', id)
    .eq('owner_id', getOwnerId());
  if (error) throw error;
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

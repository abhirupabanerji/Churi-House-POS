import { useState } from "react";
import { X, Plus, Pencil, Trash2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Seed categories — only used to pre-populate if nothing is stored yet
const SEED_CATEGORIES = ["Starters", "Main Course", "Biryani", "Breads", "Desserts", "Beverages"];
const LS_KEY = "menu_all_categories";

function loadCategories() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* noop */ }
  // First time: persist seeds so subsequent opens can edit them
  const seeds = [...SEED_CATEGORIES];
  localStorage.setItem(LS_KEY, JSON.stringify(seeds));
  return seeds;
}

function saveCategories(cats) {
  localStorage.setItem(LS_KEY, JSON.stringify(cats));
}

// Also sync the custom-categories key so POS and other pages see additions
const LS_CAT_KEY = "menu_custom_categories";
function syncCustomKey(allCats) {
  const custom = allCats.filter(c => !SEED_CATEGORIES.includes(c));
  localStorage.setItem(LS_CAT_KEY, JSON.stringify(custom));
}

export default function EditCategoriesModal({ onClose, menuItems = [], onCategoriesChanged }) {
  const [categories, setCategories] = useState(loadCategories);
  const [newName, setNewName] = useState("");
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteWarning, setDeleteWarning] = useState(null);

  const persist = (cats) => {
    setCategories(cats);
    saveCategories(cats);
    syncCustomKey(cats);
    // Notify parent with full list minus seed so POS categories reflect changes
    onCategoriesChanged?.(cats.filter(c => !SEED_CATEGORIES.includes(c)));
  };

  const addCategory = () => {
    const name = newName.trim();
    if (!name || categories.includes(name)) return;
    persist([...categories, name]);
    setNewName("");
  };

  const startRename = (cat) => { setRenamingCat(cat); setRenameValue(cat); };

  const confirmRename = () => {
    const name = renameValue.trim();
    if (!name || name === renamingCat) { setRenamingCat(null); return; }
    if (categories.includes(name)) { setRenamingCat(null); return; }
    persist(categories.map(c => c === renamingCat ? name : c));
    setRenamingCat(null);
  };

  const tryDelete = (cat) => {
    const inUse = menuItems.filter(i => i.category === cat).length;
    if (inUse > 0) { setDeleteWarning({ cat, inUse }); return; }
    persist(categories.filter(c => c !== cat));
  };

  const forceDelete = (cat) => {
    persist(categories.filter(c => c !== cat));
    setDeleteWarning(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit Categories</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* All categories — fully editable */}
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No categories yet. Add one below.</p>
          )}
          {categories.map(c => (
            <div key={c} className="flex items-center gap-2 glass rounded-xl px-3 py-2">
              {renamingCat === c ? (
                <>
                  <Input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenamingCat(null); }}
                    className="flex-1 h-7 bg-white/5 border-white/10 text-sm"
                    autoFocus
                  />
                  <button onClick={confirmRename} className="p-1 rounded hover:bg-green-500/10 text-green-400" title="Save">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setRenamingCat(null)} className="p-1 rounded hover:bg-white/10 text-muted-foreground" title="Cancel">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-foreground">{c}</span>
                  <span className="text-[10px] text-muted-foreground mr-1">
                    {menuItems.filter(i => i.category === c).length} items
                  </span>
                  <button onClick={() => startRename(c)} className="p-1 rounded hover:bg-white/10 text-muted-foreground" title="Rename">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => tryDelete(c)} className="p-1 rounded hover:bg-red-500/10 text-red-400" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div className="flex gap-2 pt-1 border-t border-white/5">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            placeholder="New category name..."
            className="flex-1 h-9 bg-white/5 border-white/10 text-sm"
          />
          <Button
            size="sm"
            onClick={addCategory}
            disabled={!newName.trim() || categories.includes(newName.trim())}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Delete warning — items in use */}
        {deleteWarning && (
          <div className="glass rounded-xl p-4 border border-yellow-500/20 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                <span className="font-semibold text-yellow-400">{deleteWarning.cat}</span> has{" "}
                <span className="font-semibold">{deleteWarning.inUse} item(s)</span> assigned.
                Those items will lose their category label.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-xs" onClick={() => setDeleteWarning(null)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-xs" onClick={() => forceDelete(deleteWarning.cat)}>
                Delete Anyway
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full bg-white/5 border-white/10" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
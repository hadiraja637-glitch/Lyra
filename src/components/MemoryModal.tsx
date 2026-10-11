import React, { useState } from 'react';
import {
  X,
  Brain,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  MemoryItem,
  MemoryCategory,
  MEMORY_CATEGORIES,
  AppTheme,
  CustomThemeConfig,
} from '../types/companion';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (content: string, category: MemoryCategory) => void;
  onUpdateMemory: (id: string, content: string, category: MemoryCategory) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
  onSyncWithServer?: () => void;
  theme?: AppTheme;
  customTheme?: CustomThemeConfig;
  isNight?: boolean;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  onSyncWithServer,
  theme = 'pink-night',
  customTheme,
  isNight = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('goals');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('preferences');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory(newContent.trim(), newCategory);
    setNewContent('');
    setIsAddingOpen(false);
  };

  const handleStartEdit = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setEditContent(mem.content);
    setEditCategory(mem.category);
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    onUpdateMemory(id, editContent.trim(), editCategory);
    setEditingId(null);
  };

  const getCategoryMeta = (cat: MemoryCategory) => {
    return (
      MEMORY_CATEGORIES.find((c) => c.id === cat) || {
        id: cat,
        label: cat,
        icon: '📌',
        description: '',
      }
    );
  };

  const formatTimestamp = (ts: number) => {
    const diffHours = (Date.now() - ts) / (1000 * 60 * 60);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getCategoryColor = (cat: MemoryCategory) => {
    switch (cat) {
      case 'identity':
        return isNight
          ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'preferences':
        return isNight
          ? 'bg-pink-950/40 text-pink-300 border-pink-500/30'
          : 'bg-pink-50 text-pink-700 border-pink-200';
      case 'goals':
        return isNight
          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'life':
        return isNight
          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'communication':
        return isNight
          ? 'bg-sky-950/40 text-sky-300 border-sky-500/30'
          : 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return isNight
          ? 'bg-slate-800 text-slate-300 border-slate-700'
          : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const accentColor =
    theme === 'pink-night'
      ? '#f472b6'
      : theme === 'midnight'
      ? '#fbbf24'
      : theme === 'custom' && customTheme?.accentColor
      ? customTheme.accentColor
      : '#6366f1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isNight
            ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isNight
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}
            >
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Lyra's Long-Term Memory</h2>
                <span
                  className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                    isNight
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Active in Live Voice & Chat
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                Persistent personal context remembered across conversations & reboots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isNight
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div
          className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
            isNight
              ? 'bg-[#0f172a]/60 border-[#1e2a4a] text-slate-300'
              : 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Tell Lyra <strong>"Remember that..."</strong> anytime in voice or chat to save new details automatically!
            </span>
          </div>
          {onSyncWithServer && (
            <button
              onClick={onSyncWithServer}
              title="Sync with server"
              className={`p-1 rounded-lg hover:bg-black/10 transition-colors cursor-pointer flex items-center gap-1 text-2xs ${
                isNight ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          )}
        </div>

        {/* Toolbar: Category Filters & Search */}
        <div
          className={`p-4 border-b space-y-3 ${
            isNight ? 'border-[#1e2a4a] bg-[#0a1024]' : 'border-slate-100 bg-white'
          }`}
        >
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : isNight
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Memories</span>
              <span className="text-2xs opacity-80 px-1 py-0.2 rounded-full bg-black/20">
                {memories.length}
              </span>
            </button>

            {MEMORY_CATEGORIES.map((cat) => {
              const count = memories.filter((m) => m.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-pink-500 text-white shadow-xs'
                      : isNight
                      ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className="text-2xs opacity-80 px-1 py-0.2 rounded-full bg-black/20">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search bar & Add button */}
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                isNight
                  ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-200 focus-within:border-pink-500/50'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-indigo-500'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search memories by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsAddingOpen(!isAddingOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ${
                isAddingOpen
                  ? isNight
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-200 text-slate-700'
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-xs'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {/* Add Memory Form (Collapsible) */}
        {isAddingOpen && (
          <form
            onSubmit={handleAddSubmit}
            className={`p-4 border-b space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              isNight ? 'bg-[#0c142c] border-[#1e2a4a]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Record New Personal Memory</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="text-2xs font-medium text-slate-400 mb-1 block">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className={`w-full p-2 rounded-xl text-xs border cursor-pointer ${
                    isNight
                      ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-200'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {MEMORY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-2xs font-medium text-slate-400 mb-1 block">
                  What should Lyra remember?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Preparing for MDCAT biology in September; Call me Alex"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border ${
                    isNight
                      ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-200 focus:border-pink-500/60'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-2xs text-slate-400">Quick ideas:</span>
              {[
                { label: 'Preferred Nickname', cat: 'identity', sample: 'User prefers to be called ' },
                { label: 'Exam / Target Goal', cat: 'goals', sample: 'Focusing on preparing for ' },
                { label: 'Tone Preference', cat: 'communication', sample: 'Prefers concise explanations with humor' },
                { label: 'Daily Routine', cat: 'life', sample: 'Best study time is in the evening' },
              ].map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewCategory(pill.cat as MemoryCategory);
                    setNewContent(pill.sample);
                  }}
                  className={`text-2xs px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    isNight
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:border-pink-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-indigo-400'
                  }`}
                >
                  + {pill.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={!newContent.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white cursor-pointer shadow-xs"
              >
                Save to Memory
              </button>
            </div>
          </form>
        )}

        {/* Memories List */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 min-h-[220px]">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div
                className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
                  isNight ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Brain className="w-6 h-6 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">No memories found</p>
                <p className={`text-xs max-w-sm mx-auto ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {searchQuery
                    ? `No memories match "${searchQuery}". Try a different keyword.`
                    : 'Lyra has not stored any personal memories in this category yet.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingOpen(true)}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-pink-500 text-white font-medium cursor-pointer shadow-xs"
              >
                + Add First Memory
              </button>
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const meta = getCategoryMeta(mem.category);
              const isEditing = editingId === mem.id;

              return (
                <div
                  key={mem.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isNight
                      ? 'bg-[#0a1126] border-[#1e2a4a] hover:border-slate-600'
                      : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                          className={`p-1.5 rounded-lg text-xs border ${
                            isNight
                              ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-200'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        >
                          {MEMORY_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className={`w-full p-2 rounded-xl text-xs border focus:outline-hidden ${
                          isNight
                            ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-200'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(mem.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-2xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getCategoryColor(
                              mem.category
                            )}`}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                          <span
                            className={`text-2xs ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {formatTimestamp(mem.createdAt)}
                          </span>
                          {mem.source === 'learned' && (
                            <span className="text-2xs px-1.5 py-0.2 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">
                              Learned from dialogue
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed font-medium break-words">
                          {mem.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          onClick={() => handleStartEdit(mem)}
                          title="Edit Memory"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isNight
                              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMemory(mem.id)}
                          title="Delete Memory"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isNight
                              ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/30'
                              : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Clear All safety button */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="text-2xs text-slate-400">
            Total memories stored: <strong className="text-slate-200">{memories.length}</strong>
          </div>

          <div className="flex items-center gap-2">
            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <span className="text-2xs text-red-400 font-semibold">Delete all memories?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllMemories();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-red-600 text-white cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded-lg text-2xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              memories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-2xs text-red-400/80 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

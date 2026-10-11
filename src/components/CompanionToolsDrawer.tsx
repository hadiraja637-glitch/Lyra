import React, { useState } from 'react';
import { FocusTimerState, TaskItem, StudyNote, MemoryItem } from '../types/companion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  ListTodo,
  BookOpen,
  Brain,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CompanionToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timer: FocusTimerState;
  onStartTimer: (minutes: number, label?: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  tasks: TaskItem[];
  onAddTask: (title: string, priority?: 'high' | 'medium' | 'normal') => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  notes: StudyNote[];
  onAddNote: (note: string, topic?: string) => void;
  onDeleteNote: (id: string) => void;
  memories?: MemoryItem[];
  onOpenMemoryManager?: () => void;
  onDeleteMemory?: (id: string) => void;
  isNight?: boolean;
}

export const CompanionToolsDrawer: React.FC<CompanionToolsDrawerProps> = ({
  isOpen,
  onClose,
  timer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  notes,
  onAddNote,
  onDeleteNote,
  memories = [],
  onOpenMemoryManager,
  onDeleteMemory,
  isNight = false,
}) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'notes' | 'memories'>('timer');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'normal'>('normal');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTopic, setNewNoteTopic] = useState('');

  if (!isOpen) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim(), newTaskPriority);
    setNewTaskTitle('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent.trim(), newNoteTopic.trim() || 'General');
    setNewNoteContent('');
    setNewNoteTopic('');
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-full max-w-md border-l shadow-2xl flex flex-col transition-transform duration-300 ${
        isNight
          ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Drawer Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${
          isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-200 bg-white'
        }`}
      >
        <div>
          <h2 className="text-sm font-semibold">Companion Tools</h2>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
            Study sessions, reminders, and scratchpad
          </p>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isNight
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Close companion tools drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Segmented Control Tabs */}
      <div
        className={`flex items-center gap-1 p-2 border-b ${
          isNight ? 'bg-[#0b1022] border-[#1e2a4a]' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'timer'
              ? isNight
                ? 'bg-[#162248] text-amber-300 border border-amber-400/20 shadow-xs'
                : 'bg-white text-slate-900 shadow-xs'
              : isNight
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Focus Timer
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tasks'
              ? isNight
                ? 'bg-[#162248] text-amber-300 border border-amber-400/20 shadow-xs'
                : 'bg-white text-slate-900 shadow-xs'
              : isNight
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          Tasks ({tasks.filter((t) => !t.completed).length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? isNight
                ? 'bg-[#162248] text-amber-300 border border-amber-400/20 shadow-xs'
                : 'bg-white text-slate-900 shadow-xs'
              : isNight
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'memories'
              ? isNight
                ? 'bg-[#162248] text-pink-300 border border-pink-400/20 shadow-xs'
                : 'bg-white text-slate-900 shadow-xs'
              : isNight
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          Memory ({memories.length})
        </button>
      </div>

      {/* Content Panels */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: FOCUS TIMER */}
        {activeTab === 'timer' && (
          <div className="space-y-6">
            <div
              className={`text-center py-6 rounded-2xl border ${
                isNight
                  ? 'bg-[#0b1022] border-[#1e2a4a]'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span
                className={`text-xs font-medium uppercase tracking-wider block mb-1 ${
                  isNight ? 'text-amber-400/80' : 'text-slate-500'
                }`}
              >
                {timer.label || 'Focus Session'}
              </span>
              <div
                className={`text-5xl font-mono font-bold tabular-nums tracking-tight mb-4 ${
                  isNight ? 'text-amber-300 text-shadow-amber' : 'text-slate-900'
                }`}
              >
                {formatSeconds(timer.remainingSeconds)}
              </div>

              <div className="flex items-center justify-center gap-3">
                {timer.isRunning ? (
                  <button
                    onClick={onPauseTimer}
                    className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                      isNight
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={onResumeTimer}
                    className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs ${
                      isNight
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}

                <button
                  onClick={onResetTimer}
                  className={`p-2.5 border rounded-xl transition-colors cursor-pointer ${
                    isNight
                      ? 'bg-[#111a36] border-[#22335c] text-slate-300 hover:bg-[#18264e]'
                      : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                  aria-label="Reset timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold mb-2 opacity-80">Preset Durations</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onStartTimer(25, 'Pomodoro Focus')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isNight
                      ? 'bg-[#0b1022] border-[#1e2a4a] hover:bg-[#101833]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isNight ? 'text-amber-300' : 'text-slate-900'}`}>
                    25 min
                  </div>
                  <div className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Pomodoro
                  </div>
                </button>
                <button
                  onClick={() => onStartTimer(15, 'Quick Sprint')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isNight
                      ? 'bg-[#0b1022] border-[#1e2a4a] hover:bg-[#101833]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isNight ? 'text-amber-300' : 'text-slate-900'}`}>
                    15 min
                  </div>
                  <div className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Sprint
                  </div>
                </button>
                <button
                  onClick={() => onStartTimer(5, 'Short Break')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isNight
                      ? 'bg-[#0b1022] border-[#1e2a4a] hover:bg-[#101833]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isNight ? 'text-amber-300' : 'text-slate-900'}`}>
                    5 min
                  </div>
                  <div className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Break
                  </div>
                </button>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>
              Tip: You can also say out loud: <em>“Lyra, start a 25-minute study timer”</em> during voice mode!
            </p>
          </div>
        )}

        {/* TAB 2: TASKS & REMINDERS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <form onSubmit={handleCreateTask} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task or reminder..."
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors focus:outline-none ${
                    isNight
                      ? 'bg-[#0e1630] border border-[#22335c] text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-slate-900'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                    isNight
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
              <div className={`flex items-center gap-2 text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Priority:</span>
                {(['normal', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewTaskPriority(p)}
                    className={`px-2 py-0.5 rounded capitalize cursor-pointer ${
                      newTaskPriority === p
                        ? isNight
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-900 text-white'
                        : isNight
                        ? 'bg-[#111a36] text-slate-400 hover:bg-[#18264e]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </form>

            <div className="space-y-2 pt-2">
              {tasks.length === 0 ? (
                <div className={`text-center py-8 text-xs ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                  No tasks added yet. Ask Lyra to set reminders or add them above!
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      task.completed
                        ? isNight
                          ? 'bg-[#0a0f20]/50 border-[#162244] opacity-50'
                          : 'bg-slate-50/60 border-slate-200 opacity-60'
                        : isNight
                        ? 'bg-[#0b1022] border-[#1e2a4a] hover:border-amber-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className={`w-4 h-4 shrink-0 ${isNight ? 'text-slate-500' : 'text-slate-400'}`} />
                      )}
                      <span
                        className={`text-xs ${
                          task.completed
                            ? 'line-through opacity-50'
                            : isNight
                            ? 'text-slate-200 font-medium'
                            : 'text-slate-800 font-medium'
                        }`}
                      >
                        {task.title}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      {task.priority !== 'normal' && (
                        <span
                          className={`text-2xs font-semibold uppercase ${
                            task.priority === 'high' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NOTES & SCRATCHPAD */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={handleCreateNote} className="space-y-2">
              <input
                type="text"
                value={newNoteTopic}
                onChange={(e) => setNewNoteTopic(e.target.value)}
                placeholder="Topic / Subject (e.g. Physics, Pakistani History)"
                className={`w-full px-3 py-1.5 text-xs rounded-lg transition-colors focus:outline-none ${
                  isNight
                    ? 'bg-[#0e1630] border border-[#22335c] text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                    : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-slate-900'
                }`}
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write study notes or key takeaways..."
                rows={3}
                className={`w-full px-3 py-2 text-xs rounded-lg transition-colors focus:outline-none resize-none ${
                  isNight
                    ? 'bg-[#0e1630] border border-[#22335c] text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                    : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-slate-900'
                }`}
              />
              <button
                type="submit"
                disabled={!newNoteContent.trim()}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                  isNight
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Save Note
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {notes.length === 0 ? (
                <div className={`text-center py-8 text-xs ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                  No notes saved yet. Tell Lyra: <em>“Save a note that...”</em> or add one above!
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-xl border relative group ${
                      isNight
                        ? 'bg-[#0b1022] border-[#1e2a4a]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-2xs opacity-70">
                      <span className={`font-semibold ${isNight ? 'text-amber-400' : 'text-indigo-600'}`}>
                        {note.topic}
                      </span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>
                      {note.note}
                    </p>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LONG-TERM MEMORY */}
        {activeTab === 'memories' && (
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                isNight
                  ? 'bg-pink-950/20 border-pink-500/30 text-pink-300'
                  : 'bg-pink-50 border-pink-200 text-pink-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="text-xs font-semibold">Active Memories ({memories.length})</span>
              </div>
              {onOpenMemoryManager && (
                <button
                  type="button"
                  onClick={onOpenMemoryManager}
                  className="text-2xs font-semibold px-2.5 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>Manage All</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {memories.length === 0 ? (
                <div
                  className={`text-center py-8 text-xs ${
                    isNight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  No personal memories saved yet. Tell Lyra in voice or chat: <em>“Remember that...”</em>
                </div>
              ) : (
                memories.slice(0, 10).map((mem) => (
                  <div
                    key={mem.id}
                    className={`p-3 rounded-xl border relative group transition-colors ${
                      isNight
                        ? 'bg-[#0b1022] border-[#1e2a4a] text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs uppercase tracking-wider font-bold text-pink-400">
                        {mem.category}
                      </span>
                      {onDeleteMemory && (
                        <button
                          type="button"
                          onClick={() => onDeleteMemory(mem.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                          aria-label="Delete memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed font-medium">{mem.content}</p>
                  </div>
                ))
              )}
            </div>

            {onOpenMemoryManager && (
              <button
                type="button"
                onClick={onOpenMemoryManager}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  isNight
                    ? 'border-[#1e2a4a] bg-[#0c142e] text-slate-200 hover:bg-[#121f44]'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-pink-400" />
                <span>Open Full Memory Studio</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

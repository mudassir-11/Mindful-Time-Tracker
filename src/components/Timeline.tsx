import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, ActivityLog, Reminder } from '../types';
import { databaseService } from '../services/databaseService';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Plus, Check, Bell, X, CheckSquare, Square, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TimelineProps {
  user: User;
  profile: UserProfile | null;
  date: Date;
  onDateChange: (date: Date) => void;
}

export default function Timeline({ user, profile, date, onDateChange }: TimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [activityInput, setActivityInput] = useState('');
  const [categoryIdInput, setCategoryIdInput] = useState('');
  const [showReminders, setShowReminders] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToLogs(user.uid, dateStr, (newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, [user.uid, dateStr]);

  // Ideally this would be a separate subscriber in databaseService, adding it here for simplicity
  useEffect(() => {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', user.uid),
      orderBy('time', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder)));
    });
    return () => unsub();
  }, [user.uid]);

  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;
    
    await setDoc(doc(collection(db, 'reminders')), {
      userId: user.uid,
      title: newReminderTitle.trim(),
      time: Timestamp.fromDate(new Date()),
      isCompleted: false
    });

    setNewReminderTitle('');
    setIsAddingReminder(false);
  };

  const handleDeleteReminder = async (id: string) => {
    await databaseService.deleteReminder(id);
  };

  const handleDeleteLog = async (hour: number) => {
    const logId = `${user.uid}_${dateStr}_${hour}`;
    await databaseService.deleteLog(logId);
    setEditingHour(null);
    setActivityInput('');
  };

  const toggleReminder = async (rem: Reminder) => {
    await setDoc(doc(db, 'reminders', rem.id), { ...rem, isCompleted: !rem.isCompleted });
  };

  const handleSaveLog = async (hour: number) => {
    if (!activityInput) {
      setEditingHour(null);
      return;
    }

    await databaseService.saveLog({
      userId: user.uid,
      date: dateStr,
      hour,
      activity: activityInput,
      categoryId: categoryIdInput || (profile?.categories[0].id || 'learning'),
      durationMinutes: 60
    });

    setEditingHour(null);
    setActivityInput('');
  };

  const handleExport = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hours-export-${dateStr}.json`;
    link.click();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Activity Summary Cards (Match Design) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="card-slate p-2.5 sm:p-5 text-center sm:text-left">
          <p className="text-text-muted text-[9px] sm:text-xs font-bold uppercase tracking-wider">Logged</p>
          <h2 className="text-lg sm:text-3xl font-bold text-text-main mt-0.5 sm:mt-1">
            {logs.length}<span className="text-xs sm:text-lg font-normal text-slate-400 ml-0.5 sm:ml-1">hrs</span>
          </h2>
        </div>
        <div className="card-slate p-2.5 sm:p-5 text-center sm:text-left">
          <p className="text-text-muted text-[9px] sm:text-xs font-bold uppercase tracking-wider">Focus</p>
          <h2 className="text-lg sm:text-3xl font-bold text-emerald-600 mt-0.5 sm:mt-1">
            {logs.length > 0 ? Math.round((logs.length / 12) * 100) : 0}<span className="text-xs sm:text-lg font-normal text-slate-400 ml-0.5 sm:ml-1">%</span>
          </h2>
        </div>
        <div className="card-slate p-2.5 sm:p-5 text-center sm:text-left">
          <p className="text-text-muted text-[9px] sm:text-xs font-bold uppercase tracking-wider">Intent</p>
          <h2 className="text-lg sm:text-3xl font-bold text-primary mt-0.5 sm:mt-1">
            {logs.filter(l => l.categoryId === 'learning').length}<span className="text-xs sm:text-lg font-normal text-slate-400 ml-0.5 sm:ml-1">/ 2h</span>
          </h2>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => onDateChange(subDays(date, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-border">
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </button>
          <span className="text-sm font-bold text-text-main px-2">
            {format(date, 'MMMM d, yyyy')}
          </span>
          <button onClick={() => onDateChange(addDays(date, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-border">
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <button 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                showReminders ? 'bg-primary text-white' : 'text-text-muted border border-border hover:bg-slate-50'
              }`}
              onClick={() => setShowReminders(!showReminders)}
            >
              <Bell className="w-3.5 h-3.5" />
              Reminders
              {reminders.filter(r => !r.isCompleted).length > 0 && <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
            </button>
            <AnimatePresence>
              {showReminders && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 card-slate p-5 shadow-2xl z-50 ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                    {isAddingReminder ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={newReminderTitle}
                          onChange={(e) => setNewReminderTitle(e.target.value)}
                          placeholder="What to remind?"
                          className="flex-1 bg-slate-50 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddReminder();
                          }}
                          autoFocus
                        />
                        <button onClick={handleAddReminder} className="p-1 text-emerald-600 hover:bg-slate-100 rounded-md">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setIsAddingReminder(false)} className="p-1 text-red-500 hover:bg-slate-100 rounded-md">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Reminders</h4>
                        <button onClick={() => setIsAddingReminder(true)} className="p-1 hover:bg-slate-100 rounded-md" title="Add reminder">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {reminders.length === 0 && <p className="text-[10px] text-text-muted italic py-4 text-center">No reminders set.</p>}
                    {reminders.map(rem => (
                      <div key={rem.id} className="flex items-center gap-3 group px-1 justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button onClick={() => toggleReminder(rem)} className="text-text-muted hover:text-primary transition-colors flex-shrink-0">
                            {rem.isCompleted ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className={`text-xs font-medium truncate ${rem.isCompleted ? 'line-through text-text-muted opacity-50' : 'text-text-main'}`}>
                            {rem.title}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteReminder(rem.id)} 
                          className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                          title="Delete reminder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Data
          </button>
        </div>
      </div>

      {/* Hourly Log Section (Timeline Match) */}
      <div className="card-slate">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs sm:text-sm font-bold text-text-main">Activity Timeline</h3>
          <span className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest">Scroll to view</span>
        </div>
        
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[480px] sm:max-h-[600px] overflow-y-auto custom-scrollbar">
          {hours.map((hour) => {
            const log = logs.find(l => l.hour === hour);
            const isEditing = editingHour === hour;
            const category = profile?.categories.find(c => c.id === log?.categoryId);

            return (
              <div key={hour} className="flex gap-3 sm:gap-6 group relative">
                {/* Time Indicator */}
                <div className="w-11 sm:w-16 text-right pt-2 sm:pt-2.5">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-text-muted uppercase tracking-tighter">
                    {format(new Date().setHours(hour, 0), 'HH:mm')}
                  </span>
                  <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium uppercase mt-0.5">
                    {format(new Date().setHours(hour, 0), 'hh aa')}
                  </div>
                </div>

                {/* Entry Card */}
                <div className="flex-1 min-h-[3rem] sm:min-h-[4rem]">
                  <AnimatePresence mode="wait">
                    {isEditing ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="p-4 bg-white border border-primary/20 rounded-xl shadow-lg ring-4 ring-primary/5"
                      >
                        <textarea
                          autoFocus
                          value={activityInput}
                          onChange={(e) => setActivityInput(e.target.value)}
                          placeholder="What did you achieve during this hour?"
                          className="w-full bg-transparent border-none focus:ring-0 resize-none text-text-main placeholder:text-text-muted/40 font-medium text-sm leading-relaxed mb-4"
                          rows={2}
                        />
                        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                          <select 
                            value={categoryIdInput}
                            onChange={(e) => setCategoryIdInput(e.target.value)}
                            className="bg-slate-50 border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                          >
                            {profile?.categories.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            {log && (
                              <button 
                                onClick={() => handleDeleteLog(hour)}
                                className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Clear
                              </button>
                            )}
                            <button 
                              onClick={() => setEditingHour(null)}
                              className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-main transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveLog(hour)}
                              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-primary/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Log Hour
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : log ? (
                      <div 
                        onClick={() => {
                          setEditingHour(hour);
                          setActivityInput(log.activity);
                          setCategoryIdInput(log.categoryId);
                        }}
                        className="cursor-pointer p-3 sm:p-4 rounded-xl border-l-[5px] sm:border-l-[6px] transition-all hover:translate-x-1 group"
                        style={{ 
                          backgroundColor: `${category?.color}10`, // 10% opacity
                          borderLeftColor: category?.color || '#ccc' 
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-text-main leading-snug break-words">
                              {log.activity}
                            </p>
                            <span 
                              className="inline-block px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-widest"
                              style={{ backgroundColor: `${category?.color}30`, color: category?.color }}
                            >
                              {category?.label}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] bg-white/50 px-1.5 py-0.5 rounded-md font-bold text-text-muted border border-white/20 whitespace-nowrap">60 min</span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingHour(hour);
                          setActivityInput('');
                          setCategoryIdInput(profile?.categories[0].id || '');
                        }}
                        className="w-full text-left py-2.5 px-3 bg-slate-50/40 border border-dashed border-border/80 hover:border-primary/30 rounded-xl transition-all hover:bg-slate-50 flex items-center min-h-[2.8rem] sm:min-h-[3.5rem] touch-manipulation"
                      >
                        <p className="text-text-muted/40 font-medium text-[10px] sm:text-sm italic">
                           Tap to log activity for {format(new Date().setHours(hour, 0), 'hh aa')}...
                        </p>
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, ActivityLog } from '../types';
import { databaseService } from '@prism/shared';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineProps {
  user: User;
  profile: UserProfile | null;
  date: Date;
  onDateChange: (date: Date) => void;
  refreshTrigger?: number;
}

export default function Timeline({ user, profile, date, onDateChange, refreshTrigger = 0 }: TimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  
  // State for editing an existing log or adding a new one
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [addingToHour, setAddingToHour] = useState<number | null>(null);
  
  const [activityInput, setActivityInput] = useState('');
  const [categoryIdInput, setCategoryIdInput] = useState('');
  const [durationInput, setDurationInput] = useState<number>(60);

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToLogs(user.id, dateStr, (newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, [user.id, dateStr, refreshTrigger]);

  const handleDeleteLog = async (logId: string) => {
    await databaseService.deleteLog(logId);
    setEditingLogId(null);
    setAddingToHour(null);
  };

  const handleSaveLog = async () => {
    const hour = editingLogId ? logs.find(l => l.id === editingLogId)?.hour : addingToHour;
    if (hour === undefined || hour === null) return;

    const finalCategoryId = categoryIdInput || (profile?.categories[0].id || 'learning');
    const finalActivity = activityInput.trim() || (profile?.categories.find(c => c.id === finalCategoryId)?.label || 'Logged Activity');

    await databaseService.saveLog({
      id: editingLogId || undefined,
      userId: user.id,
      date: dateStr,
      hour,
      activity: finalActivity,
      categoryId: finalCategoryId,
      durationMinutes: durationInput
    });

    setEditingLogId(null);
    setAddingToHour(null);
    setActivityInput('');
  };
  
  const openEdit = (log: ActivityLog) => {
    setEditingLogId(log.id);
    setAddingToHour(null);
    setActivityInput(log.activity);
    setCategoryIdInput(log.categoryId);
    setDurationInput(log.durationMinutes || 60);
  };
  
  const openAdd = (hour: number, defaultDuration: number) => {
    setEditingLogId(null);
    setAddingToHour(hour);
    setActivityInput('');
    setCategoryIdInput(profile?.categories[0].id || '');
    setDurationInput(defaultDuration);
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

  const loggedHrs = logs.reduce((sum, l) => sum + ((l.durationMinutes || 60) / 60), 0);
  const focusHrs = logs.filter(l => l.categoryId !== 'leisure').reduce((sum, l) => sum + ((l.durationMinutes || 60) / 60), 0);
  
  const categoryHrs = logs.reduce((acc, log) => {
    acc[log.categoryId] = (acc[log.categoryId] || 0) + ((log.durationMinutes || 60) / 60);
    return acc;
  }, {} as Record<string, number>);
  
  const topCategoryId = Object.keys(categoryHrs).sort((a, b) => categoryHrs[b] - categoryHrs[a])[0];
  const topCategory = profile?.categories.find(c => c.id === topCategoryId);
  const topCategoryHrs = topCategoryId ? categoryHrs[topCategoryId] : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Activity Summary Cards (Match Design) */}
      <div className="hidden sm:grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card-slate p-3 sm:p-5 text-center sm:text-left flex flex-col justify-center">
          <p className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider">Logged</p>
          <h2 className="text-xl sm:text-3xl font-bold text-text-main mt-1 sm:mt-1">
            {loggedHrs.toFixed(1)}<span className="text-[11px] sm:text-lg font-normal text-slate-400 ml-1 sm:ml-1">hrs</span>
          </h2>
        </div>
        <div className="card-slate p-3 sm:p-5 text-center sm:text-left flex flex-col justify-center">
          <p className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider">Focus</p>
          <h2 className="text-xl sm:text-3xl font-bold text-emerald-600 mt-1 sm:mt-1">
            {Math.min(100, Math.round((focusHrs / 8) * 100))}<span className="text-[11px] sm:text-lg font-normal text-slate-400 ml-1 sm:ml-1">%</span>
          </h2>
        </div>
        <div className="card-slate p-3 sm:p-5 text-center sm:text-left overflow-hidden flex flex-col justify-center">
          <p className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate" style={{ color: topCategory?.color || 'inherit' }}>
            {topCategory?.label || 'Top Area'}
          </p>
          <h2 className="text-xl sm:text-3xl font-bold text-primary mt-1 sm:mt-1" style={{ color: topCategory?.color || 'inherit' }}>
            {topCategoryHrs > 0 ? topCategoryHrs.toFixed(1) : 0}<span className="text-[11px] sm:text-lg font-normal text-slate-400 ml-1 sm:ml-1">hrs</span>
          </h2>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="flex items-center justify-end pb-4 border-b border-border">
        <button 
          onClick={handleExport}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Data
        </button>
      </div>

      {/* Hourly Log Section (Timeline Match) */}
      <div className="card-slate">
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm sm:text-base font-bold text-text-main">Activity Timeline</h3>
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">Scroll to view</span>
        </div>
        
        <div className="p-3 sm:p-6 space-y-4">
          {hours.map((hour) => {
            const hourLogs = logs.filter(l => l.hour === hour);
            const totalDuration = hourLogs.reduce((sum, l) => sum + (l.durationMinutes || 60), 0);
            const remainingDuration = Math.max(0, 60 - totalDuration);
            
            const isEditingAny = (addingToHour === hour) || hourLogs.some(l => l.id === editingLogId);
            
            // Check if this hour is covered by a multi-hour log from an earlier hour
            // Note: Since we have exact durations now, multi-hour span checking might be more complex,
            // but we can preserve the basic logic if someone logged 120 mins.
            const overlappingLog = logs.find(l => l.hour < hour && l.hour + Math.max(1, Math.round((l.durationMinutes || 60) / 60)) > hour);

            if (hourLogs.length === 0 && !isEditingAny && overlappingLog) {
              const overlapCategory = profile?.categories.find(c => c.id === overlappingLog.categoryId);
              return (
                <div key={hour} className="flex gap-4 sm:gap-6 group relative opacity-60">
                  <div className="w-14 sm:w-16 text-right pt-2.5">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-text-muted uppercase tracking-tighter">
                      {format(new Date().setHours(hour, 0), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center min-h-[3rem] sm:min-h-[3.5rem] pl-4 border-l-4" style={{ borderColor: `${overlapCategory?.color}40` }}>
                    <span className="text-[11px] sm:text-xs text-text-muted italic font-medium">Continued ({overlappingLog.activity})</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={hour} className="flex gap-4 sm:gap-6 group relative">
                {/* Time Indicator */}
                <div className="w-14 sm:w-16 text-right pt-2 sm:pt-2.5">
                  <span className="text-[11px] sm:text-[12px] font-mono font-bold text-text-muted uppercase tracking-tighter">
                    {format(new Date().setHours(hour, 0), 'HH:mm')}
                  </span>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                    {format(new Date().setHours(hour, 0), 'hh aa')}
                  </div>
                </div>

                {/* Entry Card */}
                <div className="flex-1 min-h-[3.5rem] sm:min-h-[4rem]">
                  <AnimatePresence mode="wait">
                    {isEditingAny ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="p-4 bg-white border border-primary/20 rounded-xl shadow-lg ring-4 ring-primary/5"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={activityInput}
                          onChange={(e) => setActivityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLog();
                            if (e.key === 'Escape') { setEditingLogId(null); setAddingToHour(null); }
                          }}
                          placeholder={`What did you achieve during this time?`}
                          className="w-full bg-white border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 mb-2 sm:mb-3"
                        />
                        <div className="flex flex-row flex-wrap justify-between gap-2">
                          <select 
                            value={categoryIdInput}
                            onChange={(e) => setCategoryIdInput(e.target.value)}
                            className="bg-white border border-border rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm outline-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 flex-1 min-w-[120px]"
                          >
                            {profile?.categories.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          
                          {/* Duration input */}
                          <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1 bg-slate-50">
                            <span className="text-xs text-text-muted font-bold">Duration:</span>
                            <input 
                              type="number"
                              min="1"
                              max={remainingDuration + (editingLogId ? (hourLogs.find(l => l.id === editingLogId)?.durationMinutes || 60) : 0)}
                              value={durationInput}
                              onChange={(e) => {
                                const maxAllowed = remainingDuration + (editingLogId ? (hourLogs.find(l => l.id === editingLogId)?.durationMinutes || 60) : 0);
                                let val = parseInt(e.target.value) || 0;
                                if (val > maxAllowed) val = maxAllowed;
                                setDurationInput(val);
                              }}
                              className="w-14 text-center bg-white border border-border rounded px-1 py-1 text-sm outline-none focus:border-primary/50"
                            />
                            <span className="text-xs text-text-muted font-bold">m</span>
                          </div>

                          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                            {editingLogId && (
                              <button 
                                onClick={() => handleDeleteLog(editingLogId)}
                                className="px-3 sm:px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 bg-white"
                              >
                                Delete
                              </button>
                            )}
                            <button onClick={() => { setEditingLogId(null); setAddingToHour(null); }} className="px-2 sm:px-4 py-2 text-xs font-semibold text-text-muted hover:bg-slate-100 rounded-lg transition-colors border border-border bg-white">
                              Cancel
                            </button>
                            <button onClick={() => handleSaveLog()} className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity shadow-sm shadow-primary/20">
                              Save
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : hourLogs.length > 0 ? (
                      <div className="flex gap-1 h-full w-full rounded-xl overflow-hidden min-h-[3.5rem] shadow-sm">
                        {hourLogs.map(log => {
                          const cat = profile?.categories.find(c => c.id === log.categoryId);
                          return (
                            <div 
                               key={log.id} 
                               onClick={() => openEdit(log)}
                               style={{ 
                                 flex: log.durationMinutes || 60, 
                                 backgroundColor: `${cat?.color}20`,
                                 borderLeft: `4px solid ${cat?.color || '#ccc'}` 
                               }}
                               className="px-2 py-2 flex flex-col justify-center overflow-hidden transition-all hover:opacity-80 cursor-pointer group"
                               title={`${log.activity} (${log.durationMinutes}m)`}
                            >
                               <span className="text-xs sm:text-sm font-bold text-text-main break-words whitespace-normal group-hover:text-primary transition-colors">{log.activity}</span>
                               <span className="text-[10px] text-text-muted font-semibold mt-0.5">{log.durationMinutes}m</span>
                            </div>
                          );
                        })}
                        {remainingDuration > 0 && (
                          <div 
                             onClick={() => openAdd(hour, remainingDuration)}
                             style={{ flex: remainingDuration }}
                             className="bg-slate-50/40 border border-dashed border-border/80 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer group"
                             title={`Add activity for remaining ${remainingDuration}m`}
                          >
                             <span className="text-[10px] sm:text-xs text-text-muted/50 font-bold group-hover:text-primary/70">+{remainingDuration}m</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => openAdd(hour, 60)}
                        className="w-full text-left py-3 px-4 bg-slate-50/40 border border-dashed border-border/80 hover:border-primary/30 rounded-xl transition-all hover:bg-slate-50 flex items-center min-h-[3.5rem] touch-manipulation"
                      >
                        <p className="text-text-muted/50 font-semibold text-[11px] sm:text-sm italic">
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

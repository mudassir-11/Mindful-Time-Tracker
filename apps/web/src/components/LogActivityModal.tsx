import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { databaseService, DEFAULT_CATEGORIES } from '@prism/shared';
import { X, Clock, Calendar, Tag, FileText, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parse, differenceInMinutes, isValid, addDays } from 'date-fns';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile: UserProfile | null;
  initialDate: Date;
  onLogSaved?: () => void;
}

export default function LogActivityModal({
  isOpen,
  onClose,
  user,
  profile,
  initialDate,
  onLogSaved
}: LogActivityModalProps) {
  const [dateStr, setDateStr] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when initialDate changes
  useEffect(() => {
    setDateStr(format(initialDate, 'yyyy-MM-dd'));
  }, [initialDate, isOpen]);

  const activeCategories = profile?.categories?.length ? profile.categories : DEFAULT_CATEGORIES;

  // Set default category
  useEffect(() => {
    if (activeCategories.length > 0 && !categoryId) {
      setCategoryId(activeCategories[0].id);
    }
  }, [activeCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please write a brief description of what you did.');
      return;
    }

    if (!categoryId) {
      setError('Please select a target category.');
      return;
    }

    try {
      // Parse times to calculate duration
      const parsedStart = parse(startTime, 'HH:mm', new Date());
      const parsedEnd = parse(endTime, 'HH:mm', new Date());

      if (!isValid(parsedStart) || !isValid(parsedEnd)) {
        setError('Please enter valid start and end times.');
        return;
      }

      let duration = differenceInMinutes(parsedEnd, parsedStart);
      
      // Auto-correct 12-hour wrap around for mobile keyboards
      // If start is 10:00 and end is 01:00, user likely meant 13:00 (1 PM)
      if (duration < 0 && parsedStart.getHours() >= 6 && parsedEnd.getHours() < 12) {
        parsedEnd.setHours(parsedEnd.getHours() + 12);
        duration = differenceInMinutes(parsedEnd, parsedStart);
      }
      
      // Handle overnight or negative duration
      if (duration < 0) {
        setError('End time must be after start time. (For overnight activities, please split them at midnight).');
        return;
      }

      if (duration === 0) {
        setError('Activity duration must be at least 1 minute.');
        return;
      }

      setIsSaving(true);

      const startHour = parsedStart.getHours();

      await databaseService.saveLog({
        userId: user.id,
        date: dateStr,
        hour: startHour,
        activity: description.trim(),
        categoryId,
        durationMinutes: duration
      });

      // Clear form & close
      setDescription('');
      if (onLogSaved) onLogSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };



  // Calculate duration in real-time for feedback
  const getDurationFeedback = () => {
    try {
      const parsedStart = parse(startTime, 'HH:mm', new Date());
      const parsedEnd = parse(endTime, 'HH:mm', new Date());
      if (isValid(parsedStart) && isValid(parsedEnd)) {
        let diff = differenceInMinutes(parsedEnd, parsedStart);
        
        if (diff < 0 && parsedStart.getHours() >= 6 && parsedEnd.getHours() < 12) {
           diff = differenceInMinutes(addDays(parsedEnd, 0).setHours(parsedEnd.getHours() + 12), parsedStart);
        }
        
        if (diff > 0) {
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          return `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''} duration`;
        }
      }
    } catch {}
    return null;
  };

  const durationFeedback = getDurationFeedback();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="relative bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-border/80 flex flex-col max-h-[92vh] sm:max-h-[90vh] z-10"
      >
        {/* Mobile Header Handle */}
        <div className="flex justify-center py-2 sm:hidden">
          <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-text-main text-base sm:text-lg">Log New Activity</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Prism Logger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-text-muted" /> Date
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              required
            />
          </div>

          {/* Time Picker Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-text-muted" /> Start Time
              </label>
              <div className="flex items-center gap-1">
                <select 
                  value={(() => {
                    const h = parseInt(startTime.split(':')[0], 10);
                    if (h === 0) return 12;
                    if (h > 12) return h - 12;
                    return h;
                  })()}
                  onChange={(e) => {
                    const newHour12 = parseInt(e.target.value, 10);
                    const isPM = parseInt(startTime.split(':')[0], 10) >= 12;
                    let newHour24 = newHour12;
                    if (isPM && newHour12 < 12) newHour24 += 12;
                    if (!isPM && newHour12 === 12) newHour24 = 0;
                    setStartTime(`${newHour24.toString().padStart(2, '0')}:${startTime.split(':')[1]}`);
                  }}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-2 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="font-bold text-text-muted">:</span>
                <select 
                  value={startTime.split(':')[1]}
                  onChange={(e) => setStartTime(`${startTime.split(':')[0]}:${e.target.value}`)}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-2 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  value={parseInt(startTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                  onChange={(e) => {
                    const isPM = e.target.value === 'PM';
                    let h = parseInt(startTime.split(':')[0], 10);
                    if (isPM && h < 12) h += 12;
                    if (!isPM && h >= 12) h -= 12;
                    setStartTime(`${h.toString().padStart(2, '0')}:${startTime.split(':')[1]}`);
                  }}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-1 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-text-muted" /> End Time
              </label>
              <div className="flex items-center gap-1">
                <select 
                  value={(() => {
                    const h = parseInt(endTime.split(':')[0], 10);
                    if (h === 0) return 12;
                    if (h > 12) return h - 12;
                    return h;
                  })()}
                  onChange={(e) => {
                    const newHour12 = parseInt(e.target.value, 10);
                    const isPM = parseInt(endTime.split(':')[0], 10) >= 12;
                    let newHour24 = newHour12;
                    if (isPM && newHour12 < 12) newHour24 += 12;
                    if (!isPM && newHour12 === 12) newHour24 = 0;
                    setEndTime(`${newHour24.toString().padStart(2, '0')}:${endTime.split(':')[1]}`);
                  }}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-2 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="font-bold text-text-muted">:</span>
                <select 
                  value={endTime.split(':')[1]}
                  onChange={(e) => setEndTime(`${endTime.split(':')[0]}:${e.target.value}`)}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-2 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  value={parseInt(endTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                  onChange={(e) => {
                    const isPM = e.target.value === 'PM';
                    let h = parseInt(endTime.split(':')[0], 10);
                    if (isPM && h < 12) h += 12;
                    if (!isPM && h >= 12) h -= 12;
                    setEndTime(`${h.toString().padStart(2, '0')}:${endTime.split(':')[1]}`);
                  }}
                  className="flex-1 bg-slate-50 border border-border rounded-xl px-1 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-center cursor-pointer"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Duration Feedback */}
          {durationFeedback && (
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">
                {durationFeedback}
              </span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-text-muted" /> Activity Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on? (e.g., Prepared Q3 slide deck, researched React Native)"
              rows={3}
              className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-medium text-text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/40 resize-none leading-relaxed"
              required
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-text-muted" /> Target Category
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-0.5">
              {activeCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-light text-primary ring-2 ring-primary/20'
                        : 'border-border bg-slate-50/50 text-text-muted hover:bg-slate-50 hover:text-text-main'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs sm:text-sm font-bold text-text-muted border border-border rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <span>Saving Log...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Log Activity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

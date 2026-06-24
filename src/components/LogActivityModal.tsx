import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { databaseService } from '../services/databaseService';
import { X, Clock, Calendar, Tag, FileText, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parse, differenceInMinutes, isValid } from 'date-fns';

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

  // Set default category
  useEffect(() => {
    if (profile?.categories && profile.categories.length > 0 && !categoryId) {
      setCategoryId(profile.categories[0].id);
    }
  }, [profile, categoryId]);

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
      
      // Handle overnight or negative duration
      if (duration < 0) {
        setError('End time must be after start time.');
        return;
      }

      if (duration === 0) {
        setError('Activity duration must be at least 1 minute.');
        return;
      }

      setIsSaving(true);

      const startHour = parsedStart.getHours();

      await databaseService.saveLog({
        userId: user.uid,
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
        const diff = differenceInMinutes(parsedEnd, parsedStart);
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
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">TempoFlow Logger</p>
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
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-text-muted" /> End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-semibold text-text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                required
              />
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
              {profile?.categories.map((cat) => {
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

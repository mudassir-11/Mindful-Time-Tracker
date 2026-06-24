import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { JournalEntry } from '../types';
import { databaseService } from '../services/databaseService';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { BookOpen, Save, Check } from 'lucide-react';

interface JournalProps {
  user: User;
  date: Date;
}

export default function Journal({ user, date }: JournalProps) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    async function loadJournal() {
      const entry = await databaseService.getJournalEntry(user.uid, dateStr);
      if (entry) {
        setContent(entry.content);
        setMood(entry.mood || '');
      } else {
        setContent('');
        setMood('');
      }
    }
    loadJournal();
  }, [user.uid, dateStr]);

  const handleSave = async () => {
    setSaving(true);
    await databaseService.saveJournalEntry({
      userId: user.uid,
      date: dateStr,
      content,
      mood
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-12">
      <div>
        <h2 className="text-xl sm:text-4xl font-bold tracking-tight text-text-main">Mindful Reflection</h2>
        <p className="text-xs sm:text-sm text-text-muted mt-1 sm:mt-2">Document your mental state and progress for today.</p>
      </div>

      <div className="card-slate p-4 sm:p-8 space-y-4 sm:space-y-8 bg-white shadow-xl ring-1 ring-black/5">
        <div className="space-y-2 sm:space-y-4">
          <label className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-text-muted">Current Vibe</label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {['Peaceful', 'Productive', 'Challenging', 'Restful'].map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  mood === m 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-slate-50 text-text-muted border border-border hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-text-muted">Daily Log</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts, victories, or lessons learned today..."
            className="w-full bg-slate-50 border border-border rounded-2xl px-4 sm:px-6 py-4 sm:py-6 focus:ring-4 focus:ring-primary/5 outline-none transition-all h-48 sm:h-80 resize-none font-medium text-text-main placeholder:text-text-muted/30 leading-relaxed text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 sm:pt-6 border-t border-slate-100">
          <p className="text-[9px] sm:text-[10px] text-text-muted font-bold uppercase tracking-widest text-center sm:text-left">
            {saving ? 'Synchronizing...' : 'All changes saved locally'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 ${
              saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:opacity-90 active:scale-95 disabled:opacity-50'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Complete Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

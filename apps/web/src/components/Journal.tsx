import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { JournalEntry } from '../types';
import { databaseService } from '@prism/shared';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Save, Check, History, PenTool, Calendar } from 'lucide-react';

interface JournalProps {
  user: User;
  date: Date;
  refreshTrigger?: number;
}

export default function Journal({ user, date, refreshTrigger = 0 }: JournalProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'archive'>('write');
  
  // Write Tab State
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Archive Tab State
  const [archiveEntries, setArchiveEntries] = useState<JournalEntry[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    async function loadJournal() {
      const entry = await databaseService.getJournalEntry(user.id, dateStr);
      if (entry) {
        setContent(entry.content);
        setMood(entry.mood || '');
      } else {
        setContent('');
        setMood('');
      }
    }
    loadJournal();
  }, [user.id, dateStr]);

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchive();
    }
  }, [activeTab, user.id]);

  async function loadArchive() {
    setLoadingArchive(true);
    const entries = await databaseService.getAllJournalEntries(user.id);
    setArchiveEntries(entries);
    setLoadingArchive(false);
  }

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await databaseService.saveJournalEntry({
        userId: user.id,
        date: dateStr,
        content,
        mood
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main">Prism Reflection</h2>
          <p className="text-sm sm:text-base text-text-muted mt-1 sm:mt-2">Your daily companion for clarity and focus.</p>
        </div>
        
        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('write')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'write' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Write
          </button>
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'archive' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Archive
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'write' ? (
          <motion.div 
            key="write"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card-slate p-4 sm:p-8 space-y-4 sm:space-y-8 bg-white shadow-xl ring-1 ring-black/5"
          >
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Calendar className="w-4 h-4" />
                <span>{format(date, 'MMMM d, yyyy')}</span>
              </div>
            </div>

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
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-center sm:text-left flex items-center gap-2">
                {saveStatus === 'idle' && <span className="text-text-muted">Ready to save</span>}
                {saveStatus === 'saving' && <span className="text-text-muted animate-pulse">Synchronizing to cloud...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Successfully saved to Cloud</span>}
                {saveStatus === 'error' && <span className="text-red-500">Failed to save. Please try again.</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 ${
                  saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:opacity-90 active:scale-95 disabled:opacity-50'
                }`}
              >
                {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Journal'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="archive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loadingArchive ? (
              <div className="py-20 text-center text-text-muted font-medium italic text-sm">
                Fetching archives from the cloud...
              </div>
            ) : archiveEntries.length === 0 ? (
              <div className="py-20 text-center text-text-muted font-medium italic text-sm">
                No journal entries found. Time to write your first!
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {archiveEntries.map(entry => (
                  <div key={entry.id} className="card-slate p-5 sm:p-6 bg-white hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{format(parseISO(entry.date), 'MMMM d, yyyy')}</span>
                      </div>
                      {entry.mood && (
                        <span className="px-2 py-1 bg-slate-100 text-text-muted rounded-md text-[10px] font-bold uppercase tracking-widest">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <p className="text-text-main text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

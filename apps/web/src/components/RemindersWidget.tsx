import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Reminder } from '../types';
import { supabase } from '@prism/shared';
import { Bell, Plus, Check, X, CheckSquare, Square, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RemindersWidgetProps {
  user: User;
}

export default function RemindersWidget({ user }: RemindersWidgetProps) {
  const [showReminders, setShowReminders] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');

  const loadReminders = async () => {
    const { data } = await supabase.from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('time', { ascending: true });
    
    if (data) {
      setReminders(data.map(d => ({
        id: d.id, userId: d.user_id, title: d.title, time: d.time, isCompleted: d.is_completed, category: d.category
      })));
    }
  };

  useEffect(() => {
    loadReminders();

    const channel = supabase.channel('reminders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${user.id}` }, () => {
        loadReminders();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;
    
    await supabase.from('reminders').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: newReminderTitle.trim(),
      time: new Date().toISOString(),
      is_completed: false
    });

    setNewReminderTitle('');
    setIsAddingReminder(false);
    await loadReminders();
  };

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    await loadReminders();
  };

  const toggleReminder = async (rem: Reminder) => {
    await supabase.from('reminders').update({ is_completed: !rem.isCompleted }).eq('id', rem.id);
    await loadReminders();
  };

  return (
    <div className="relative">
      <button 
        className={`flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-lg text-sm font-semibold transition-colors ${
          showReminders ? 'bg-primary text-white' : 'text-text-muted border border-border hover:bg-slate-50'
        }`}
        onClick={() => setShowReminders(!showReminders)}
      >
        <Bell className="w-5 h-5 sm:w-4 sm:h-4" />
        {reminders.filter(r => !r.isCompleted).length > 0 && <span className="absolute top-1.5 right-1.5 sm:relative sm:top-0 sm:right-0 w-2.5 h-2.5 sm:w-2 sm:h-2 bg-red-500 rounded-full sm:ml-1.5 border-2 border-white sm:border-none shadow-sm" />}
      </button>
      <AnimatePresence>
        {showReminders && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-72 sm:w-80 card-slate p-4 sm:p-5 shadow-2xl z-50 ring-1 ring-black/5"
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
                  <button onClick={handleAddReminder} className="p-1.5 text-emerald-600 hover:bg-slate-100 rounded-md">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsAddingReminder(false)} className="p-1.5 text-red-500 hover:bg-slate-100 rounded-md">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-muted">Active Reminders</h4>
                  <button onClick={() => setIsAddingReminder(true)} className="p-1.5 hover:bg-slate-100 rounded-md" title="Add reminder">
                    <Plus className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {reminders.length === 0 && <p className="text-[10px] sm:text-xs text-text-muted italic py-4 text-center">No reminders set.</p>}
              {reminders.map(rem => (
                <div key={rem.id} className="flex items-center gap-3 group px-1 justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleReminder(rem)} className="text-text-muted hover:text-primary transition-colors flex-shrink-0">
                      {rem.isCompleted ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                    </button>
                    <span className={`text-sm font-medium truncate ${rem.isCompleted ? 'line-through text-text-muted opacity-50' : 'text-text-main'}`}>
                      {rem.title}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteReminder(rem.id)} 
                    className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

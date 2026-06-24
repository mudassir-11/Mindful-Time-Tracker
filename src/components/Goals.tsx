import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Goal } from '../types';
import { databaseService } from '../services/databaseService';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, Trash2, Check, TrendingUp } from 'lucide-react';

interface GoalsProps {
  user: User;
  profile: UserProfile | null;
}

export default function Goals({ user, profile }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({
    categoryId: '',
    targetHoursPerDay: 2,
    specificObjectives: '',
    isActive: true
  });

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToGoals(user.uid, (newGoals) => {
      setGoals(newGoals);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.categoryId) return;

    await databaseService.saveGoal({
      userId: user.uid,
      categoryId: newGoal.categoryId,
      targetHoursPerDay: newGoal.targetHoursPerDay,
      specificObjectives: newGoal.specificObjectives,
      isActive: true
    });

    setIsAdding(false);
    setNewGoal({
      categoryId: '',
      targetHoursPerDay: 2,
      specificObjectives: '',
      isActive: true
    });
  };

  return (
    <div className="space-y-6 sm:space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-4xl font-bold tracking-tight text-text-main">Intentions</h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1 sm:mt-2">Define focus and track your long-term growth.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-3 sm:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Set Intent</span>
        </button>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card-slate p-4 sm:p-8 shadow-2xl ring-1 ring-black/5"
            >
              <form onSubmit={handleAddGoal} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-text-muted">Target Area</label>
                    <select 
                      value={newGoal.categoryId}
                      onChange={(e) => setNewGoal({...newGoal, categoryId: e.target.value})}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                      required
                    >
                      <option value="">Select Category</option>
                      {profile?.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-text-muted">Daily Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="24"
                      value={newGoal.targetHoursPerDay}
                      onChange={(e) => setNewGoal({...newGoal, targetHoursPerDay: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-text-muted">Specific Objectives</label>
                  <textarea 
                    value={newGoal.specificObjectives}
                    onChange={(e) => setNewGoal({...newGoal, specificObjectives: e.target.value})}
                    placeholder="What does success look like? (e.g., Finish AWS course, read 10 pages...)"
                    className="w-full bg-slate-50 border border-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all h-20 sm:h-24 resize-none font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-text-muted border border-border rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 sm:py-3 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                  >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Commit Intention</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {goals.length === 0 && !isAdding ? (
          <div className="py-12 sm:py-24 text-center space-y-4 sm:space-y-6 card-slate border-dashed bg-slate-50/50">
            <div className="inline-block p-4 sm:p-5 bg-white rounded-2xl shadow-sm">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <div className="space-y-1 px-4">
              <h3 className="text-base sm:text-xl font-bold text-text-main">No intentions set yet</h3>
              <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">Set daily hour targets for your categories to start tracking your consistency.</p>
            </div>
          </div>
        ) : (
          goals.map(goal => {
            const category = profile?.categories.find(c => c.id === goal.categoryId);
            return (
              <motion.div 
                key={goal.id}
                layout
                className="card-slate p-4 sm:p-6 flex flex-row items-center gap-4 sm:gap-6 group hover:border-primary/30 transition-all bg-white"
              >
                <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-xl sm:rounded-2xl flex-shrink-0 flex flex-col items-center justify-center bg-primary-light border border-primary/10 shadow-inner group-hover:scale-105 transition-transform">
                  <span className="text-lg sm:text-3xl font-bold text-primary">{goal.targetHoursPerDay}</span>
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-primary/60">Hrs/D</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h3 className="text-sm sm:text-2xl font-bold text-text-main truncate">{category?.label}</h3>
                    {goal.isActive && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest border border-emerald-100">Tracking</span>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:space-y-3">
                    <p className="text-text-muted italic leading-relaxed text-[11px] sm:text-sm truncate sm:whitespace-normal">
                      {goal.specificObjectives || "Keep consistently working towards your daily target."}
                    </p>
                    {/* Goal Progress Mockup */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-2 sm:mt-4 relative overflow-hidden">
                      <div 
                        className="h-1.5 sm:h-2 rounded-full transition-all duration-1000" 
                        style={{ width: '65%', backgroundColor: category?.color || '#4f46e5' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 flex-shrink-0">
                  <button 
                    onClick={() => databaseService.deleteGoal(goal.id)}
                    className="p-2 sm:p-3 text-text-muted hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
                    title="Delete Intention"
                  >
                    <Trash2 className="w-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

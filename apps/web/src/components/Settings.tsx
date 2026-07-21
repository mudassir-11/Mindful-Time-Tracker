import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, Category } from '../types';
import { databaseService } from '@prism/shared';
import { motion } from 'motion/react';
import { Trash2, Plus, Palette, Settings as SettingsIcon, ChevronDown, ChevronRight } from 'lucide-react';

const PREDEFINED_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
];

interface SettingsProps {
  user: User;
  profile: UserProfile | null;
  onProfileUpdate: (newProfile: UserProfile) => void;
}

export default function Settings({ user, profile, onProfileUpdate }: SettingsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PREDEFINED_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async (categoryId: string) => {
    if (!profile) return;
    
    // Check if it's the last category, we might want to warn or just allow it
    const updatedCategories = profile.categories.filter(c => c.id !== categoryId);
    
    try {
      await databaseService.updateUserCategories(user.id, updatedCategories);
      onProfileUpdate({ ...profile, categories: updatedCategories });
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!newLabel.trim()) {
      setError("Label is required");
      return;
    }
    
    const id = newLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (profile.categories.some(c => c.id === id)) {
      setError("A category with a similar name already exists");
      return;
    }

    const newCategory: Category = {
      id,
      label: newLabel.trim(),
      color: newColor
    };

    const updatedCategories = [...profile.categories, newCategory];
    
    setIsSaving(true);
    setError(null);
    try {
      await databaseService.updateUserCategories(user.id, updatedCategories);
      onProfileUpdate({ ...profile, categories: updatedCategories });
      setIsAdding(false);
      setNewLabel('');
      setNewColor(PREDEFINED_COLORS[0]);
    } catch (err: any) {
      setError(err.message || "Failed to add category");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main">Settings</h2>
        <p className="text-sm sm:text-base text-text-muted mt-1 sm:mt-2">Customize your experience and manage your categories.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            className="flex items-center gap-2 text-xl font-bold text-text-main hover:text-primary transition-colors"
          >
            {isCategoriesExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Your Categories
          </button>
          <button 
            onClick={() => {
              if (!isAdding) setIsCategoriesExpanded(true);
              setIsAdding(!isAdding);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-main rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Category</>}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} 
            className="card-slate p-6 rounded-2xl shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Category Name</label>
                <input 
                  type="text" 
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Sleep, Family" 
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Color
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${newColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </motion.form>
        )}

        {isCategoriesExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-3"
          >
            {profile?.categories.map(category => (
              <motion.div 
                key={category.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between p-4 bg-white border border-border rounded-xl shadow-sm hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="font-bold text-text-main">{category.label}</span>
                </div>
                <button 
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
            {(!profile?.categories || profile.categories.length === 0) && (
              <div className="text-center py-8 text-text-muted border-2 border-dashed border-border rounded-xl">
                No categories found. Add one above to get started!
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

import { supabase } from '../lib/supabase';
import { ActivityLog, Goal, JournalEntry, Reminder, UserProfile, Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', label: 'Work', color: '#2d6a4f' },
  { id: 'project', label: 'Project', color: '#8a124e' },
  { id: 'learning', label: 'Learning', color: '#4c1d95' },
  { id: 'personal', label: 'Personal', color: '#b45309' },
  { id: 'health', label: 'Health', color: '#9a3412' },
  { id: 'leisure', label: 'Leisure', color: '#1e3a8a' },
];

export const databaseService = {
  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching profile:', error);
      return null;
    }
    
    // Initialize default categories if null (new profile without them)
    if (!data.categories) {
      await supabase.from('profiles').update({ categories: DEFAULT_CATEGORIES }).eq('id', userId);
      data.categories = DEFAULT_CATEGORIES;
    }
    
    return {
      userId: data.id,
      categories: data.categories,
      onboardingComplete: data.onboarding_complete
    };
  },

  async createUserProfile(userId: string): Promise<void> {
    // Note: The SQL trigger usually handles this automatically on sign up,
    // but we can do an upsert just in case the trigger failed or user is migrating
    await supabase.from('profiles').upsert({
      id: userId,
      categories: DEFAULT_CATEGORIES,
      onboarding_complete: true
    });
  },

  async updateUserCategories(userId: string, categories: Category[]): Promise<void> {
    const { error } = await supabase.from('profiles').update({ categories }).eq('id', userId);
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  // Activity Logs
  subscribeToLogs(userId: string, date: string, callback: (logs: ActivityLog[]) => void) {
    // Initial fetch
    supabase.from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('hour', { ascending: true })
      .then(({ data }) => {
        if (data) {
          callback(data.map(mapLogFromDB));
        }
      });

    // Subscribe to realtime changes
    const channel = supabase.channel(`logs_${date}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'activity_logs',
        filter: `user_id=eq.${userId}` 
      }, () => {
        // Re-fetch when changed to ensure ordering
        supabase.from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .order('hour', { ascending: true })
          .then(({ data }) => {
            if (data) callback(data.map(mapLogFromDB));
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  async saveLog(log: Omit<ActivityLog, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
    const logId = log.id || `${log.userId}_${log.date}_${log.hour}_${Date.now()}`;
    const { error } = await supabase.from('activity_logs').upsert({
      id: logId,
      user_id: log.userId,
      date: log.date,
      hour: log.hour,
      activity: log.activity,
      category_id: log.categoryId,
      duration_minutes: log.durationMinutes
    });
    if (error) throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
  },

  async deleteLog(logId: string): Promise<void> {
    await supabase.from('activity_logs').delete().eq('id', logId);
  },

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId);
    return (data || []).map(mapGoalFromDB);
  },

  subscribeToGoals(userId: string, callback: (goals: Goal[]) => void) {
    supabase.from('goals').select('*').eq('user_id', userId).then(({ data }) => {
      if (data) callback(data.map(mapGoalFromDB));
    });

    const channel = supabase.channel('goals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => {
        supabase.from('goals').select('*').eq('user_id', userId).then(({ data }) => {
          if (data) callback(data.map(mapGoalFromDB));
        });
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  },

  async saveGoal(goal: Omit<Goal, 'id'>): Promise<void> {
    const goalId = `${goal.userId}_${goal.categoryId}`;
    const { error } = await supabase.from('goals').upsert({
      id: goalId,
      user_id: goal.userId,
      category_id: goal.categoryId,
      target_hours_per_day: goal.targetHoursPerDay,
      specific_objectives: goal.specificObjectives,
      is_active: goal.isActive
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  async deleteGoal(goalId: string): Promise<void> {
    await supabase.from('goals').delete().eq('id', goalId);
  },

  // Journals
  async getJournalEntry(userId: string, date: string): Promise<JournalEntry | null> {
    const { data } = await supabase.from('journals').select('*').eq('user_id', userId).eq('date', date).single();
    if (!data) return null;
    return mapJournalFromDB(data);
  },

  async getAllJournalEntries(userId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase.from('journals').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (error) {
      console.error("Error fetching journals:", error);
      return [];
    }
    return (data || []).map(mapJournalFromDB);
  },

  async saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<void> {
    const entryId = `${entry.userId}_${entry.date}`;
    const { error } = await supabase.from('journals').upsert({
      id: entryId,
      user_id: entry.userId,
      date: entry.date,
      content: entry.content,
      mood: entry.mood
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  }
};

// Mappers from snake_case DB to camelCase Frontend
function mapLogFromDB(dbLog: any): ActivityLog {
  return {
    id: dbLog.id,
    userId: dbLog.user_id,
    date: dbLog.date,
    hour: dbLog.hour,
    activity: dbLog.activity,
    categoryId: dbLog.category_id,
    durationMinutes: dbLog.duration_minutes,
    createdAt: dbLog.created_at
  };
}

function mapGoalFromDB(dbGoal: any): Goal {
  return {
    id: dbGoal.id,
    userId: dbGoal.user_id,
    categoryId: dbGoal.category_id,
    targetHoursPerDay: dbGoal.target_hours_per_day,
    specificObjectives: dbGoal.specific_objectives,
    isActive: dbGoal.is_active
  };
}

function mapJournalFromDB(dbJournal: any): JournalEntry {
  return {
    id: dbJournal.id,
    userId: dbJournal.user_id,
    date: dbJournal.date,
    content: dbJournal.content,
    mood: dbJournal.mood,
    createdAt: dbJournal.created_at
  };
}

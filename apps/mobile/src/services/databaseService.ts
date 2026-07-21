import { supabase } from '../lib/supabase';
import { ActivityLog, Goal, JournalEntry, UserProfile, Category, DEFAULT_CATEGORIES, Reminder } from '../types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const databaseService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!data.categories) {
      await supabase.from('profiles').update({ categories: DEFAULT_CATEGORIES }).eq('id', userId);
      data.categories = DEFAULT_CATEGORIES;
    }

    return {
      userId: data.id,
      categories: data.categories,
      onboardingComplete: data.onboarding_complete,
    };
  },

  async createUserProfile(userId: string): Promise<void> {
    await supabase.from('profiles').upsert({
      id: userId,
      categories: DEFAULT_CATEGORIES,
      onboarding_complete: true,
    });
  },

  async updateUserCategories(userId: string, categories: Category[]): Promise<void> {
    const { error } = await supabase.from('profiles').update({ categories }).eq('id', userId);
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  subscribeToLogs(userId: string, date: string, callback: (logs: ActivityLog[]) => void) {
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('hour', { ascending: true })
      .then(({ data }) => {
        if (data) callback(data.map(mapLogFromDB));
      });

    const channel = supabase
      .channel(`logs_${userId}_${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${userId}` }, () => {
        supabase
          .from('activity_logs')
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
      duration_minutes: log.durationMinutes,
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  async deleteLog(logId: string): Promise<void> {
    await supabase.from('activity_logs').delete().eq('id', logId);
  },

  async getGoals(userId: string): Promise<Goal[]> {
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId);
    return (data || []).map(mapGoalFromDB);
  },

  subscribeToGoals(userId: string, callback: (goals: Goal[]) => void) {
    supabase.from('goals').select('*').eq('user_id', userId).then(({ data }) => {
      if (data) callback(data.map(mapGoalFromDB));
    });

    const channel = supabase
      .channel(`goals_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => {
        supabase.from('goals').select('*').eq('user_id', userId).then(({ data }) => {
          if (data) callback(data.map(mapGoalFromDB));
        });
      })
      .subscribe();

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
      is_active: goal.isActive,
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  async deleteGoal(goalId: string): Promise<void> {
    await supabase.from('goals').delete().eq('id', goalId);
  },

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
      mood: entry.mood,
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  async getLogsForRange(userId: string, startDate: string, endDate: string): Promise<ActivityLog[]> {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    return (data || []).map(mapLogFromDB);
  },

  async getReminders(userId: string): Promise<Reminder[]> {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: true });
    return (data || []).map(mapReminderFromDB);
  },

  subscribeToReminders(userId: string, callback: (reminders: Reminder[]) => void) {
    this.getReminders(userId).then(callback);

    const channel = supabase
      .channel(`reminders_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${userId}` }, () => {
        this.getReminders(userId).then(callback);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  async addReminder(userId: string, title: string): Promise<void> {
    const { error } = await supabase.from('reminders').insert({
      id: generateUUID(),
      user_id: userId,
      title,
      time: new Date().toISOString(),
      is_completed: false
    });
    if (error) throw new Error(`DB Error: ${error.message}`);
  },

  async deleteReminder(id: string): Promise<void> {
    await supabase.from('reminders').delete().eq('id', id);
  }
};

function mapLogFromDB(dbLog: any): ActivityLog {
  return {
    id: dbLog.id,
    userId: dbLog.user_id,
    date: dbLog.date,
    hour: dbLog.hour,
    activity: dbLog.activity,
    categoryId: dbLog.category_id,
    durationMinutes: dbLog.duration_minutes,
    createdAt: dbLog.created_at,
  };
}

function mapGoalFromDB(dbGoal: any): Goal {
  return {
    id: dbGoal.id,
    userId: dbGoal.user_id,
    categoryId: dbGoal.category_id,
    targetHoursPerDay: dbGoal.target_hours_per_day,
    specificObjectives: dbGoal.specific_objectives,
    isActive: dbGoal.is_active,
  };
}

function mapJournalFromDB(dbJournal: any): JournalEntry {
  return {
    id: dbJournal.id,
    userId: dbJournal.user_id,
    date: dbJournal.date,
    content: dbJournal.content,
    mood: dbJournal.mood,
    createdAt: dbJournal.created_at,
  };
}

function mapReminderFromDB(dbRem: any): Reminder {
  return {
    id: dbRem.id,
    userId: dbRem.user_id,
    title: dbRem.title,
    time: dbRem.time,
    isCompleted: dbRem.is_completed,
    category: dbRem.category,
  };
}

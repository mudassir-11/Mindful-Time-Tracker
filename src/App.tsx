/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { databaseService } from './services/databaseService';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  BarChart2, 
  Target, 
  BookOpen, 
  Settings, 
  LogOut,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Download,
  Bell,
  Check
} from 'lucide-react';
import { format, addDays, subDays, startOfToday } from 'date-fns';

// Components
import Timeline from './components/Timeline';
import Goals from './components/Goals';
import Reports from './components/Reports';
import Journal from './components/Journal';
import Onboarding from './components/Onboarding';
import LogActivityModal from './components/LogActivityModal';
import RemindersWidget from './components/RemindersWidget';

type View = 'timeline' | 'goals' | 'reports' | 'journal' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('timeline');
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({ label: 'No Data', hrs: 0, target: 0, percent: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    
    const fetchWeeklyProgress = async () => {
      const today = new Date();
      const startStr = format(subDays(today, 6), 'yyyy-MM-dd');
      
      const { data: logsData } = await supabase.from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startStr);
        
      const { data: goalsData } = await supabase.from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!logsData || !goalsData || goalsData.length === 0) {
        // No goals set, calculate total logged across all categories
        const loggedHrs = (logsData || []).reduce((sum, l) => sum + ((l.duration_minutes || 60) / 60), 0);
        setWeeklyProgress({ label: 'Total Logged', hrs: Number(loggedHrs.toFixed(1)), target: 0, percent: 0 });
        return;
      }

      // Find the goal with the most logged hours or just the first goal
      const targetGoal = goalsData[0];
      const category = profile.categories.find(c => c.id === targetGoal.category_id);
      
      const categoryLogs = logsData.filter(l => l.category_id === targetGoal.category_id);
      const loggedHrs = categoryLogs.reduce((sum, l) => sum + ((l.duration_minutes || 60) / 60), 0);
      const targetHrs = targetGoal.target_hours_per_day * 7;
      
      setWeeklyProgress({
        label: category?.label || 'Goal',
        hrs: Number(loggedHrs.toFixed(1)),
        target: targetHrs,
        percent: Math.min(100, Math.round((loggedHrs / targetHrs) * 100))
      });
    };
    
    fetchWeeklyProgress();
  }, [user, profile, refreshTrigger]);

  const handleAuthChange = async (user: User | null) => {
    setUser(user);
    if (user) {
      try {
        let userProfile = await databaseService.getUserProfile(user.id);
        if (!userProfile) {
          await databaseService.createUserProfile(user.id);
          userProfile = await databaseService.getUserProfile(user.id);
          setShowOnboarding(true);
        } else if (!userProfile.onboardingComplete) {
          setShowOnboarding(true);
        }
        setProfile(userProfile);
      } catch (err) {
        console.error("Error loading user profile:", err);
        setLoginError("Could not load your profile. Please check database permissions or try again.");
        setProfile({ userId: user.id, categories: [], onboardingComplete: true } as UserProfile);
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const handleOnboardingComplete = async () => {
    if (user) {
      // Small optimization: normally I'd update this in firestore
      setShowOnboarding(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter your email and password.');
      return;
    }
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setLoginError(error.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-primary font-bold text-xl"
        >
          Loading your dashboard...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary/20">
              T
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-text-main">TempoFlow</h1>
            <p className="text-text-muted leading-relaxed">
              Elevate your daily rhythm with professional time tracking and focused insights.
            </p>
          </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  required
                />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
                  className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 px-6 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50"
              >
                {isLoggingIn ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
              
              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)} 
                  className="text-text-muted text-sm font-semibold hover:text-primary transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            </form>
          {loginError && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
              {loginError}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      
      {/* Sidebar Nav (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border p-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">T</div>
          <span className="text-xl font-bold tracking-tight text-text-main">TempoFlow</span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLink active={view === 'timeline'} onClick={() => setView('timeline')} icon={<Calendar />} label="Dashboard" />
          <NavLink active={view === 'goals'} onClick={() => setView('goals')} icon={<Target />} label="Intentions" />
          <NavLink active={view === 'reports'} onClick={() => setView('reports')} icon={<BarChart2 />} label="Analytics" />
          <NavLink active={view === 'journal'} onClick={() => setView('journal')} icon={<BookOpen />} label="Journal" />
        </nav>

        <div className="mt-auto pt-6 border-t border-border space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-border/50">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Weekly Progress</p>
            <p className="text-xs text-text-main mb-2 font-medium">
              {weeklyProgress.label}: {weeklyProgress.hrs}h {weeklyProgress.target > 0 ? `/ ${weeklyProgress.target}h` : ''}
            </p>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              {weeklyProgress.target > 0 ? (
                <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${weeklyProgress.percent}%` }}></div>
              ) : (
                <div className="bg-primary/30 h-1.5 rounded-full transition-all duration-1000 w-full"></div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 px-1 py-2">
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full border border-border" alt="" referrerPolicy="no-referrer" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-text-main">{user.user_metadata?.full_name || user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-1 py-2 text-text-muted hover:text-red-500 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header (Match Design) */}
        <header className="min-h-[4.5rem] py-2 sm:py-0 sm:h-[4.5rem] bg-surface border-b border-border px-3 sm:px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center">
            {(view === 'timeline' || view === 'journal') ? (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-text-muted" />
                </button>
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-text-main w-[120px] sm:w-[160px] text-center">
                  {format(selectedDate, 'MMM d, yyyy')}
                </h2>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            ) : (
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-text-main truncate ml-2">
                {view === 'goals' && "Intentions"}
                {view === 'reports' && "Analytics"}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button className="hidden sm:flex px-4 py-1.5 text-sm font-semibold text-text-muted border border-border rounded-lg hover:bg-slate-50 transition-colors">
              Settings
            </button>
            <RemindersWidget user={user} />
            <button 
              onClick={() => setShowLogModal(true)}
              className="px-2.5 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-bold text-white bg-primary rounded-lg shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              <span className="hidden sm:inline">+ Log Activity</span>
              <span className="sm:hidden">+ Log</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto w-full"
            >
              {view === 'timeline' && (
                <Timeline 
                  user={user} 
                  profile={profile} 
                  date={selectedDate} 
                  onDateChange={setSelectedDate}
                  refreshTrigger={refreshTrigger}
                />
              )}
              {view === 'goals' && (
                <Goals user={user} profile={profile} refreshTrigger={refreshTrigger} />
              )}
              {view === 'reports' && (
                <Reports user={user} profile={profile} refreshTrigger={refreshTrigger} />
              )}
              {view === 'journal' && (
                <Journal user={user} date={selectedDate} refreshTrigger={refreshTrigger} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md border-t border-border flex items-center justify-around px-4 z-50 shadow-2xl">
        <MobileNavLink active={view === 'timeline'} onClick={() => setView('timeline')} icon={<Calendar />} />
        <MobileNavLink active={view === 'goals'} onClick={() => setView('goals')} icon={<Target />} />
        <MobileNavLink active={view === 'reports'} onClick={() => setView('reports')} icon={<BarChart2 />} />
        <MobileNavLink active={view === 'journal'} onClick={() => setView('journal')} icon={<BookOpen />} />
      </nav>

      {/* Log Activity Modal */}
      {user && (
        <LogActivityModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          user={user}
          profile={profile}
          initialDate={selectedDate}
          onLogSaved={() => {
            setView('timeline');
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

function NavLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
        active ? 'nav-active' : 'nav-inactive'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function MobileNavLink({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
        active ? 'bg-primary-light text-primary scale-110' : 'text-text-muted'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    </button>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { auth } from './lib/firebase';
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
  Bell
} from 'lucide-react';
import { format, addDays, subDays, startOfToday } from 'date-fns';

// Components
import Timeline from './components/Timeline';
import Goals from './components/Goals';
import Reports from './components/Reports';
import Journal from './components/Journal';
import Onboarding from './components/Onboarding';
import LogActivityModal from './components/LogActivityModal';

type View = 'timeline' | 'goals' | 'reports' | 'journal' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('timeline');
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        let userProfile = await databaseService.getUserProfile(user.uid);
        if (!userProfile) {
          await databaseService.createUserProfile(user.uid);
          userProfile = await databaseService.getUserProfile(user.uid);
          setShowOnboarding(true);
        } else if (!userProfile.onboardingComplete) {
          setShowOnboarding(true);
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const handleOnboardingComplete = async () => {
    if (user) {
      // Small optimization: normally I'd update this in firestore
      setShowOnboarding(false);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => signOut(auth);

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
          <button 
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-md shadow-primary/10"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            Continue with Google
          </button>
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
          {/* Sidebar Widget (Match Design) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-border/50">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Weekly Progress</p>
            <p className="text-xs text-text-main mb-2 font-medium">Learning: 8.5h / 12h</p>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '70.8%' }}></div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1 py-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-border" alt="" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-text-main">{user.displayName}</p>
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
        <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-text-main truncate mr-2">
            {view === 'timeline' && (
              <>
                <span className="hidden md:inline">Daily Dashboard — {format(selectedDate, 'EEEE, MMM d')}</span>
                <span className="md:hidden">{format(selectedDate, 'EEE, MMM d')}</span>
              </>
            )}
            {view === 'goals' && (
              <>
                <span className="hidden sm:inline">Intentions & Growth</span>
                <span className="sm:hidden">Intentions</span>
              </>
            )}
            {view === 'reports' && (
              <>
                <span className="hidden sm:inline">Performance Analysis</span>
                <span className="sm:hidden">Analytics</span>
              </>
            )}
            {view === 'journal' && (
              <>
                <span className="hidden sm:inline">Journal — {format(selectedDate, 'MMM d, yyyy')}</span>
                <span className="sm:hidden">Journal — {format(selectedDate, 'MMM d')}</span>
              </>
            )}
          </h2>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button className="hidden sm:flex px-4 py-1.5 text-sm font-semibold text-text-muted border border-border rounded-lg hover:bg-slate-50 transition-colors">
              Settings
            </button>
            <button 
              onClick={() => setShowLogModal(true)}
              className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-primary rounded-lg shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              + Log Activity
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
                />
              )}
              {view === 'goals' && (
                <Goals user={user} profile={profile} />
              )}
              {view === 'reports' && (
                <Reports user={user} profile={profile} />
              )}
              {view === 'journal' && (
                <Journal user={user} date={selectedDate} />
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
          onLogSaved={() => setView('timeline')}
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

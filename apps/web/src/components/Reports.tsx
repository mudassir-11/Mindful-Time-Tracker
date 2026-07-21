import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, ActivityLog, Goal } from '../types';
import { databaseService } from '@prism/shared';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { supabase } from '@prism/shared';
import { Activity, PieChart as PieChartIcon, BarChart2, TrendingUp } from 'lucide-react';

interface ReportsProps {
  user: User;
  profile: UserProfile | null;
  refreshTrigger?: number;
}

export default function Reports({ user, profile, refreshTrigger = 0 }: ReportsProps) {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState(21);
  const [totalHours, setTotalHours] = useState(0);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const lastWeek = subDays(today, 6);
        const startStr = format(lastWeek, 'yyyy-MM-dd');
        const endStr = format(today, 'yyyy-MM-dd');

        // Fetch all logs and goals for the user in parallel using Supabase
        const [{ data: logsData }, { data: goalsData }] = await Promise.all([
          supabase.from('activity_logs').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id)
        ]);

        const allLogs: ActivityLog[] = (logsData || []).map((d: any) => ({
          id: d.id, userId: d.user_id, date: d.date, hour: d.hour, activity: d.activity, 
          categoryId: d.category_id, durationMinutes: d.duration_minutes, createdAt: d.created_at
        }));
        
        // Client-side filter to avoid complex queries
        const logs = allLogs.filter(l => l.date >= startStr && l.date <= endStr);
        setHasData(logs.length > 0);

        const goals: Goal[] = (goalsData || []).map((d: any) => ({
          id: d.id, userId: d.user_id, categoryId: d.category_id, targetHoursPerDay: d.target_hours_per_day, 
          specificObjectives: d.specific_objectives, isActive: d.is_active
        }));

        // Calculate dynamic weekly target based on active goals
        const calculatedTarget = goals.length > 0
          ? goals.reduce((sum, g) => sum + (g.targetHoursPerDay * 7), 0)
          : 0; // 0 means no goals set
        setWeeklyTarget(calculatedTarget);

        // Process Daily Bar Chart Data
        const days = eachDayOfInterval({ start: lastWeek, end: today });
        const dailyChartData = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayLogs = logs.filter(l => l.date === dayStr);
          const data: any = { name: format(day, 'EEE') };
          
          (profile?.categories || []).forEach(cat => {
            data[cat.label] = dayLogs
              .filter(l => l.categoryId === cat.id)
              .reduce((sum, l) => sum + ((l.durationMinutes ?? 60) / 60), 0);
          });
          
          return data;
        });
        setWeeklyData(dailyChartData);

        // Process Category Distribution Data
        const categoryDistribution = (profile?.categories || []).map(cat => {
          const total = logs
            .filter(l => l.categoryId === cat.id)
            .reduce((sum, l) => sum + ((l.durationMinutes ?? 60) / 60), 0);
          return { name: cat.label, value: Number(total.toFixed(1)), color: cat.color };
        }).filter(c => c.value > 0);
        setCategoryData(categoryDistribution);

        // Total Focused Hours (excluding leisure)
        const focusLogs = logs.filter(l => l.categoryId !== 'leisure');
        const calculatedTotalHours = focusLogs.reduce((sum, l) => sum + ((l.durationMinutes ?? 60) / 60), 0);
        setTotalHours(Number(calculatedTotalHours.toFixed(1)));

      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user.id, profile, refreshTrigger]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-muted italic">Analyzing your lifestyle patterns...</p>
      </div>
    );
  }

  // Get top performing category safely without mutating state
  const sortedCategories = [...categoryData].sort((a, b) => b.value - a.value);
  const topCategoryName = sortedCategories[0]?.name || '---';
  const topCategoryColor = sortedCategories[0]?.color || '#4f46e5';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main">Performance Analysis</h2>
        <p className="text-sm sm:text-base text-text-muted mt-1 sm:mt-2">Visualize your time allocation and progress.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
        {/* Category Share */}
        <div className="card-slate p-4 sm:p-8 space-y-4 sm:space-y-6 bg-white">
          <div className="flex items-center gap-2 text-text-muted border-b border-border pb-3 sm:pb-4">
            <PieChartIcon className="w-4 h-4" />
            <h3 className="text-[10px] uppercase tracking-widest font-bold">Category Distribution</h3>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    fontSize: '12px'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Productivity */}
        <div className="card-slate p-4 sm:p-8 space-y-4 sm:space-y-6 bg-white">
          <div className="flex items-center gap-2 text-text-muted border-b border-border pb-3 sm:pb-4">
            <BarChart2 className="w-4 h-4" />
            <h3 className="text-[10px] uppercase tracking-widest font-bold">Weekly Activity</h3>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                {(profile?.categories || []).map(cat => (
                  <Bar 
                    key={cat.id} 
                    dataKey={cat.label} 
                    stackId="a" 
                    fill={cat.color} 
                    radius={[2, 2, 0, 0]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card-slate p-4 sm:p-8 bg-white border-primary/10">
        <div className="flex items-center gap-2 text-text-muted border-b border-border pb-3 sm:pb-4 mb-4 sm:mb-8">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-[10px] uppercase tracking-widest font-bold">Executive Summary</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12">
          <div className="space-y-1.5 sm:space-y-4">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-text-muted tracking-widest">Total Focused Hours</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-5xl font-bold text-text-main">
                {totalHours.toFixed(1)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-text-muted">HRS</span>
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-4">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-text-muted tracking-widest">Top Performance Area</p>
            <div className="space-y-0.5 sm:space-y-1">
              <span 
                className="text-2xl sm:text-4xl font-bold transition-colors"
                style={{ color: topCategoryName !== '---' ? topCategoryColor : '#4f46e5' }}
              >
                {topCategoryName}
              </span>
              <p className="text-[10px] sm:text-xs text-text-muted font-medium italic">
                {topCategoryName !== '---' ? 'Leading your growth this week.' : 'No activity logged yet.'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-4">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-text-muted tracking-widest">Efficiency Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-5xl font-bold text-emerald-600">
                {weeklyTarget > 0 ? Math.min(100, Math.round((totalHours / weeklyTarget) * 100)) : '--'}%
              </span>
              <p className="text-[10px] sm:text-xs text-text-muted font-medium">
                {weeklyTarget > 0 ? `vs ${weeklyTarget}h Goal` : 'No Goal Set'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {!hasData && (
        <div className="mt-8 p-6 border border-dashed border-border rounded-2xl bg-slate-50 text-center space-y-2">
          <p className="text-sm font-bold text-text-main">No recent logs found</p>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Log your daily accomplishments on the Timeline to see real-time performance analytics, category distributions, and goal efficiency indices.
          </p>
        </div>
      )}
    </div>
  );
}

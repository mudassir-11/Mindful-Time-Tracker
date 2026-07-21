import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { ActivityLog, UserProfile, Category } from '../types';
import { COLORS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

interface Props {
  user: User;
  profile: UserProfile | null;
}

function getLocalDateString(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function getWeekDays(offsetWeeks: number = 0): string[] {
  const days: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - distanceToMonday - (offsetWeeks * 7));
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(getLocalDateString(d));
  }
  return days;
}

function shortDay(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(dateStr + 'T12:00:00');
  return days[d.getDay()];
}

// Simple donut chart using SVG-like View math
function DonutChart({ data, totalHours }: { data: { label: string; hours: number; color: string }[]; totalHours: number }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const strokeWidth = 22;

  let cumulative = 0;
  const segments = data.map(item => {
    const pct = totalHours > 0 ? item.hours / totalHours : 0;
    const start = cumulative;
    cumulative += pct;
    return { ...item, start, pct };
  });

  const polarToXY = (pct: number, radius: number) => {
    const angle = (pct * 2 * Math.PI) - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Render as stacked colored arc bars using Views
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute',
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: strokeWidth,
        borderColor: COLORS.border,
      }} />
      {/* Center text */}
      <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.textMain }}>{totalHours.toFixed(1)}</Text>
      <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>hrs total</Text>
    </View>
  );
}

export default function ReportsScreen({ user, profile }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const categories: Category[] = profile?.categories || [];
  const weekDays = getWeekDays(weekOffset);
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await databaseService.getLogsForRange(user.id, weekDays[0], weekDays[6]);
      setLogs(data);
      setLoading(false);
    };
    if (isFocused) {
      fetchLogs();
    }
  }, [user.id, isFocused, weekOffset]); // intentionally omitted weekDays because it's derived

  useEffect(() => {
    setSelectedDay(null);
  }, [weekOffset]);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const displayLogs = selectedDay ? logs.filter(l => l.date === selectedDay) : logs;

  // Hours per category
  const categoryTotals: Record<string, number> = {};
  displayLogs.forEach(l => {
    categoryTotals[l.categoryId] = (categoryTotals[l.categoryId] || 0) + (l.durationMinutes / 60);
  });
  const totalHours = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const categoryChartData = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([id, hours]) => ({
      id,
      label: getCategoryById(id)?.label || id,
      hours,
      color: getCategoryById(id)?.color || COLORS.primary,
    }));

  // Per-day stacked bars data
  const hoursPerDayPerCategory: Record<string, Record<string, number>> = {};
  weekDays.forEach(day => { hoursPerDayPerCategory[day] = {}; });
  logs.forEach(l => {
    if (!hoursPerDayPerCategory[l.date]) hoursPerDayPerCategory[l.date] = {};
    hoursPerDayPerCategory[l.date][l.categoryId] = (hoursPerDayPerCategory[l.date][l.categoryId] || 0) + (l.durationMinutes / 60);
  });

  const maxDayHours = Math.max(
    ...weekDays.map(day => Object.values(hoursPerDayPerCategory[day] || {}).reduce((a, b) => a + b, 0)),
    1
  );

  const topCategory = categoryChartData[0];
  const BAR_CHART_HEIGHT = 140;
  const barWidth = Math.floor((CHART_WIDTH - 48) / 7) - 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{selectedDay ? formatDate(new Date(selectedDay + 'T12:00:00')) : 'Analytics'}</Text>
          <Text style={styles.headerSubtitle}>
            {selectedDay ? 'Daily Breakdown' : (weekOffset === 0 ? 'This Week' : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`)}
          </Text>
        </View>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => setWeekOffset(prev => prev + 1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(prev => Math.max(0, prev - 1))} style={[styles.navBtn, weekOffset === 0 && { opacity: 0.3 }]} disabled={weekOffset === 0}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Summary Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
              <Text style={styles.statValue}>{totalHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: topCategory?.color || COLORS.primary }]}>
              <Text style={[styles.statValue, { color: topCategory?.color || COLORS.primary }]} numberOfLines={1}>
                {topCategory?.label || '—'}
              </Text>
              <Text style={styles.statLabel}>Top Category</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{Object.keys(categoryTotals).length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>

          {/* Stacked Bar Chart */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View>
                <Text style={[styles.cardTitle, { marginBottom: 4 }]}>Weekly Activity</Text>
                <Text style={{ fontSize: 14, color: COLORS.textMuted }}>Tap a column to view daily breakdown</Text>
              </View>
              {selectedDay && (
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '600' }}>Clear Filter</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.barChart}>
              {weekDays.map((day) => {
                const dayData = hoursPerDayPerCategory[day] || {};
                const dayTotal = Object.values(dayData).reduce((a, b) => a + b, 0);
                const heightScale = dayTotal > 0 ? (dayTotal / maxDayHours) : 0;
                const activeCats = Object.entries(dayData).filter(([, h]) => h > 0);

                return (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.barColumn, selectedDay && selectedDay !== day && { opacity: 0.3 }]}
                    onPress={() => setSelectedDay(prev => prev === day ? null : day)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.barTrack, { height: BAR_CHART_HEIGHT }]}>
                      <View style={[styles.barFillContainer, { height: `${Math.max(heightScale * 100, activeCats.length > 0 ? 2 : 0)}%` as any }]}>
                        {activeCats.map(([catId, hrs], idx) => {
                          const cat = getCategoryById(catId);
                          const segPct = hrs / dayTotal;
                          return (
                            <View
                              key={catId}
                              style={{
                                width: '100%',
                                flex: segPct,
                                backgroundColor: cat?.color || COLORS.primary,
                                borderTopLeftRadius: idx === 0 ? 4 : 0,
                                borderTopRightRadius: idx === 0 ? 4 : 0,
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <Text style={[
                      styles.barLabel,
                      day === getLocalDateString(new Date()) && { color: COLORS.primary, fontWeight: '800' }
                    ]}>
                      {shortDay(day)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{selectedDay ? 'Daily Distribution' : 'Category Distribution'}</Text>
            {categoryChartData.length === 0 ? (
              <Text style={styles.emptyText}>No activities logged yet</Text>
            ) : (
              <View style={styles.categoryList}>
                {/* Donut-style color blocks + legend */}
                <View style={styles.donutContainer}>
                  {categoryChartData.map(({ id, label, hours, color }) => {
                    const pct = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                    return (
                      <View key={id} style={[styles.donutSegment, { flex: pct / 100, backgroundColor: color, minWidth: pct > 2 ? 4 : 0 }]} />
                    );
                  })}
                </View>

                {categoryChartData.map(({ id, label, hours, color }) => {
                  const pct = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                  return (
                    <View key={id} style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <Text style={styles.categoryLabel}>{label}</Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <View style={styles.categoryBarTrack}>
                          <View style={[styles.categoryBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                        </View>
                        <Text style={styles.categoryHours}>{hours.toFixed(1)}h</Text>
                        <Text style={styles.categoryPct}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Executive Summary */}
          {topCategory && (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: topCategory.color }]}>
              <Text style={styles.cardTitle}>Top Performance Area</Text>
              <Text style={[styles.topCategoryText, { color: topCategory.color }]}>
                {topCategory.label}
              </Text>
              <Text style={styles.topCategorySubtext}>
                {topCategory.hours.toFixed(1)}h logged this week · Leading your growth 🚀
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', marginTop: 1 },
  dateNav: { flexDirection: 'row', gap: 8 },
  navBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  scroll: { flex: 1, padding: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },

  // Stacked Bar Chart
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: '70%', justifyContent: 'flex-end' },
  barFillContainer: { width: '100%', overflow: 'hidden', borderRadius: 4 },
  barLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  // Category Distribution
  categoryList: { gap: 12 },
  donutContainer: {
    flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden',
    backgroundColor: COLORS.border, marginBottom: 16,
  },
  donutSegment: { height: '100%' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 90 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  categoryLabel: { fontSize: 14, fontWeight: '400', color: COLORS.textMain },
  categoryRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBarTrack: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 4 },
  categoryHours: { fontSize: 14, fontWeight: '600', color: COLORS.textMain, width: 32, textAlign: 'right' },
  categoryPct: { fontSize: 12, color: COLORS.textMuted, width: 30, textAlign: 'right' },

  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Top Category Card
  topCategoryText: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  topCategorySubtext: { fontSize: 14, fontWeight: '400', color: COLORS.textMuted, lineHeight: 18 },
});

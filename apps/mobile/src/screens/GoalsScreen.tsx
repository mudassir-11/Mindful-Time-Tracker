import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { Goal, UserProfile, Category } from '../types';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#6366f1',
  background: '#f8f9fb',
  surface: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

interface Props {
  user: User;
  profile: UserProfile | null;
}

export default function GoalsScreen({ user, profile }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<Record<string, number>>({});
  const [dailyLogs, setDailyLogs] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [targetHours, setTargetHours] = useState('1');
  const [objectives, setObjectives] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const categories: Category[] = profile?.categories || [];
  const isFocused = useIsFocused();

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToGoals(user.id, (g) => {
      setGoals(g.filter(g => g.isActive));
      setLoading(false);
    });
    return unsubscribe;
  }, [user.id]);

  useEffect(() => {
    if (isFocused) {
      fetchLogs();
    }
  }, [user.id, goals, isFocused, viewMode, dayOffset, weekOffset]);

  const fetchLogs = async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    
    if (viewMode === 'daily') {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - dayOffset);
      const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
      
      const logs = await databaseService.getLogsForRange(user.id, dateStr, dateStr);
      const byCategoryDaily: Record<string, number> = {};
      logs.forEach(l => {
        byCategoryDaily[l.categoryId] = (byCategoryDaily[l.categoryId] || 0) + (l.durationMinutes / 60);
      });
      setDailyLogs(byCategoryDaily);
    } else {
      const today = new Date();
      today.setDate(today.getDate() - (weekOffset * 7));
      const dayOfWeek = today.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      
      const start = new Date(today);
      start.setDate(today.getDate() - distanceToMonday);
      
      const end = new Date(start);
      end.setDate(start.getDate() + (weekOffset > 0 ? 6 : distanceToMonday));

      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

      const logs = await databaseService.getLogsForRange(user.id, startStr, endStr);
      const byCategoryWeekly: Record<string, number> = {};
      logs.forEach(l => {
        byCategoryWeekly[l.categoryId] = (byCategoryWeekly[l.categoryId] || 0) + (l.durationMinutes / 60);
      });
      setWeeklyLogs(byCategoryWeekly);
    }
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const handleAddGoal = async () => {
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }
    setSaving(true);
    try {
      await databaseService.saveGoal({
        userId: user.id,
        categoryId: selectedCategoryId,
        targetHoursPerDay: parseFloat(targetHours) || 1,
        specificObjectives: objectives.trim(),
        isActive: true,
      });
      const updatedGoals = await databaseService.getGoals(user.id);
      setGoals(updatedGoals.filter(g => g.isActive));
      setModalVisible(false);
      setObjectives('');
      setTargetHours('1');
    } catch (e) {
      Alert.alert('Error', 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goalId: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await databaseService.deleteGoal(goalId);
        const updatedGoals = await databaseService.getGoals(user.id);
        setGoals(updatedGoals.filter(g => g.isActive));
      }},
    ]);
  };

  const openAddModal = () => {
    setSelectedCategoryId(categories[0]?.id || '');
    setTargetHours('1');
    setObjectives('');
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Intentions</Text>
          <Text style={styles.headerSubtitle}>
            {viewMode === 'daily' 
              ? (dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Yesterday' : `${dayOffset} days ago`) 
              : (weekOffset === 0 ? 'This Week' : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`)}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity 
              onPress={() => viewMode === 'daily' ? setDayOffset(prev => prev + 1) : setWeekOffset(prev => prev + 1)} 
              style={{ padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' }}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => viewMode === 'daily' ? setDayOffset(prev => Math.max(0, prev - 1)) : setWeekOffset(prev => Math.max(0, prev - 1))} 
              style={[{ padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' }, (viewMode === 'daily' ? dayOffset === 0 : weekOffset === 0) && { opacity: 0.3 }]} 
              disabled={viewMode === 'daily' ? dayOffset === 0 : weekOffset === 0}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3, marginHorizontal: 16, marginTop: 16 }}>
        <TouchableOpacity 
          style={{ flex: 1, padding: 8, backgroundColor: viewMode === 'daily' ? '#fff' : 'transparent', borderRadius: 6 }} 
          onPress={() => setViewMode('daily')}
        >
          <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '600', color: viewMode === 'daily' ? COLORS.primary : COLORS.textMuted }}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, padding: 8, backgroundColor: viewMode === 'weekly' ? '#fff' : 'transparent', borderRadius: 6 }} 
          onPress={() => setViewMode('weekly')}
        >
          <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '600', color: viewMode === 'weekly' ? COLORS.primary : COLORS.textMuted }}>Weekly</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
        ) : goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No intentions yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to set your first goal</Text>
          </View>
        ) : (
          goals.map(goal => {
            const category = getCategoryById(goal.categoryId);
            const isDaily = viewMode === 'daily';
            const logged = isDaily ? (dailyLogs[goal.categoryId] || 0) : (weeklyLogs[goal.categoryId] || 0);
            
            let daysPassed = 7;
            if (weekOffset === 0) {
              const dayOfWeek = new Date().getDay();
              daysPassed = (dayOfWeek + 6) % 7 + 1; // 1 for Monday, 7 for Sunday
            }
            
            const target = isDaily ? goal.targetHoursPerDay : goal.targetHoursPerDay * daysPassed;
            const percent = target > 0 ? Math.min(100, (logged / target) * 100) : 0;

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalCardHeader}>
                  <View style={styles.goalCategoryBadge}>
                    {category && (
                      <View style={[styles.dot, { backgroundColor: category.color }]} />
                    )}
                    <Text style={styles.goalCategoryText}>{category?.label || goal.categoryId}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(goal.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.targetText}>{isDaily ? `${goal.targetHoursPerDay}h daily target` : `${goal.targetHoursPerDay * daysPassed}h weekly target${weekOffset === 0 ? ' (so far)' : ''}`}</Text>
                {goal.specificObjectives ? (
                  <Text style={styles.objectiveText}>{goal.specificObjectives}</Text>
                ) : null}

                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: category?.color || COLORS.primary }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {logged.toFixed(1)}h / {target}h {isDaily ? (dayOffset === 0 ? 'today' : dayOffset === 1 ? 'yesterday' : 'logged') : (weekOffset === 0 ? 'this week' : 'logged')}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Intention</Text>

            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    { borderColor: cat.color },
                    selectedCategoryId === cat.id && { backgroundColor: cat.color },
                  ]}
                >
                  <Text style={[styles.categoryChipText, selectedCategoryId === cat.id && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Daily Target (hours)</Text>
            <TextInput
              style={styles.textInput}
              value={targetHours}
              onChangeText={setTargetHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.sectionLabel}>Specific Objectives (optional)</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={objectives}
              onChangeText={setObjectives}
              placeholder="What do you want to achieve?"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <TouchableOpacity
              onPress={handleAddGoal}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Intention</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  emptySubtitle: { fontSize: 14, fontWeight: '400', color: '#94a3b8' },
  goalCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCategoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  goalCategoryText: { fontSize: 16, fontWeight: '600', color: COLORS.textMain },
  targetText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400' },
  objectiveText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', lineHeight: 18 },
  deleteBtn: { padding: 4 },
  progressSection: { gap: 6 },
  progressBar: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryRow: { flexGrow: 0 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, marginRight: 8, backgroundColor: COLORS.surface },
  categoryChipText: { fontSize: 14, fontWeight: '400', color: COLORS.textMain },
  textInput: {
    backgroundColor: '#f8f9fb', borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.textMain,
  },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

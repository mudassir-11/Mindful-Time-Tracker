import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { ActivityLog, UserProfile, Category, Reminder } from '../types';
import { COLORS } from '../theme';
import RemindersModal from '../components/RemindersModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateKey(date: Date): string {
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const da = String(date.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

function totalMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function durationLabel(startH: number, startM: number, endH: number, endM: number): string {
  const diff = totalMinutes(endH, endM) - totalMinutes(startH, startM);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;

// ─── Drum Scroll Picker ───────────────────────────────────────────────────────

interface DrumPickerProps {
  items: number[];
  selected: number;
  onChange: (val: number) => void;
  renderLabel: (val: number) => string;
}

function DrumPicker({ items, selected, onChange, renderLabel }: DrumPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = items.indexOf(selected);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, []);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onChange(items[clamped]);
  }, [items, onChange]);

  return (
    <View style={drumStyles.container}>
      {/* Selection highlight */}
      <View style={drumStyles.selectionHighlight} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        style={drumStyles.scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 1 }}
      >
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <View key={item} style={drumStyles.item}>
              <Text style={[drumStyles.itemText, isSelected && drumStyles.itemTextSelected]}>
                {renderLabel(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Fade top/bottom */}
      <View style={drumStyles.fadeTop} pointerEvents="none" />
      <View style={drumStyles.fadeBottom} pointerEvents="none" />
    </View>
  );
}

const drumStyles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 1,
    left: 0, right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: COLORS.primary + '12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    zIndex: 1,
  },
  scroll: { flex: 1 },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  itemTextSelected: {
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: '600',
  },
  fadeTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: ITEM_HEIGHT * 1,
    backgroundColor: COLORS.surface,
    opacity: 0.8,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: ITEM_HEIGHT * 1,
    backgroundColor: COLORS.surface,
    opacity: 0.8,
    zIndex: 2,
  },
});

// ─── Time Picker (hour + minute drum) ────────────────────────────────────────

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}

function TimePicker({ label, hour, minute, onChangeHour, onChangeMinute }: TimePickerProps) {
  return (
    <View style={timePickerStyles.container}>
      <Text style={timePickerStyles.label}>{label}</Text>
      <View style={timePickerStyles.pickers}>
        <View style={timePickerStyles.pickerWrapper}>
          <DrumPicker
            items={HOURS_24}
            selected={hour}
            onChange={onChangeHour}
            renderLabel={(h) => {
              const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
              const ampm = h < 12 ? 'AM' : 'PM';
              return `${display} ${ampm}`;
            }}
          />
        </View>
        <Text style={timePickerStyles.colon}>:</Text>
        <View style={timePickerStyles.pickerWrapper}>
          <DrumPicker
            items={MINUTES}
            selected={minute}
            onChange={onChangeMinute}
            renderLabel={(m) => m.toString().padStart(2, '0')}
          />
        </View>
      </View>
    </View>
  );
}

const timePickerStyles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontSize: 14, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  pickers: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, overflow: 'hidden',
  },
  pickerWrapper: { flex: 1 },
  colon: {
    fontSize: 24, fontWeight: '700', color: COLORS.textMain,
    paddingHorizontal: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  user: User;
  profile: UserProfile | null;
  onOpenSettings: () => void;
}

export default function TimelineScreen({ user, profile, onOpenSettings }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersModalVisible, setRemindersModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const refreshReminders = useCallback(() => {
    databaseService.getReminders(user.id).then(setReminders);
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToReminders(user.id, setReminders);
    return unsubscribe;
  }, [user.id]);

  // Range modal (FAB)
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [startHour, setStartHour] = useState(0);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(8);
  const [endMinute, setEndMinute] = useState(0);
  const [rangeActivity, setRangeActivity] = useState('');
  const [rangeCategoryId, setRangeCategoryId] = useState('');
  const [savingRange, setSavingRange] = useState(false);

  // Single edit modal (slot tap)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editHour, setEditHour] = useState<number | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(60);
  const [maxEditDuration, setMaxEditDuration] = useState<number>(60);
  const [editActivity, setEditActivity] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const dateStr = formatDateKey(selectedDate);
  const categories: Category[] = profile?.categories || [];

  const currentHour = new Date().getHours();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  useEffect(() => {
    const unsubscribe = databaseService.subscribeToLogs(user.id, dateStr, setLogs);
    return unsubscribe;
  }, [user.id, dateStr]);

  // Auto-scroll to current hour on load or date change
  useEffect(() => {
    if (isToday) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, currentHour * 75 - 100), animated: true });
      }, 500);
    }
  }, [isToday, currentHour]);

  const getLogsForHour = (hour: number) => logs.filter(l => l.hour === hour);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const startTotal = totalMinutes(startHour, startMinute);
  const endTotal = totalMinutes(endHour, endMinute);
  const isValidRange = endTotal > startTotal;
  const duration = isValidRange ? durationLabel(startHour, startMinute, endHour, endMinute) : '';

  // ── FAB: open range modal ──────────────────────────────────────────────
  const openRangeModal = () => {
    const now = new Date();
    setStartHour(0);
    setStartMinute(0);
    setEndHour(now.getHours());
    setEndMinute(0);
    setRangeActivity('');
    setRangeCategoryId(categories[0]?.id || '');
    setRangeModalVisible(true);
  };

  const handleSaveRange = async () => {
    if (!isValidRange) {
      Alert.alert('Invalid time', 'End time must be after start time.');
      return;
    }

    setSavingRange(true);
    try {
      const catId = rangeCategoryId || categories[0]?.id || 'work';
      const saves: Promise<void>[] = [];

      // Loop through each hour slot touched by the range
      const startH = startHour;
      const endH = endMinute === 0 ? endHour - 1 : endHour;

      for (let h = startH; h <= endH; h++) {
        let dur = 60;
        if (h === startH && startMinute > 0) {
          dur = 60 - startMinute; // partial first hour
        }
        if (h === endHour && endMinute > 0 && endMinute < 60) {
          dur = endMinute; // partial last hour
        }
        if (dur <= 0) continue;

        const finalActivity = rangeActivity.trim() || getCategoryById(catId)?.label || 'Logged Activity';
        saves.push(databaseService.saveLog({
          userId: user.id,
          date: dateStr,
          hour: h,
          activity: finalActivity,
          categoryId: catId,
          durationMinutes: dur,
        }));
      }

      await Promise.all(saves);
      const updated = await databaseService.getLogsForRange(user.id, dateStr, dateStr);
      setLogs(updated);
      setRangeModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save activity range.');
    } finally {
      setSavingRange(false);
    }
  };

  // ── Slot tap: single hour edit ─────────────────────────────────────────
  const openEditModal = (hour: number, log?: ActivityLog, defaultDuration: number = 60) => {
    const hourLogs = getLogsForHour(hour);
    const totalDuration = hourLogs.reduce((sum, l) => sum + (l.durationMinutes || 60), 0);
    const maxAvailable = log ? 60 - totalDuration + (log.durationMinutes || 60) : 60 - totalDuration;
    
    setEditHour(hour);
    setEditLogId(log ? log.id : null);
    setEditActivity(log?.activity || '');
    setEditCategoryId(log?.categoryId || categories[0]?.id || '');
    setEditDuration(Math.min(log?.durationMinutes || defaultDuration, maxAvailable));
    setMaxEditDuration(maxAvailable);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (editHour === null) return;
    setSavingEdit(true);
    try {
      const catId = editCategoryId || categories[0]?.id || 'work';
      const finalActivity = editActivity.trim() || getCategoryById(catId)?.label || 'Logged Activity';
      await databaseService.saveLog({
        id: editLogId || undefined,
        userId: user.id, date: dateStr, hour: editHour,
        activity: finalActivity,
        categoryId: catId,
        durationMinutes: editDuration,
      });
      const updated = await databaseService.getLogsForRange(user.id, dateStr, dateStr);
      setLogs(updated);
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save activity.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEdit = async () => {
    if (!editLogId) return;
    await databaseService.deleteLog(editLogId);
    const updated = await databaseService.getLogsForRange(user.id, dateStr, dateStr);
    setLogs(updated);
    setEditModalVisible(false);
  };

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={COLORS.surface} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity onPress={nextDay} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setRemindersModalVisible(true)} style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textMuted} />
            {reminders.filter(r => !r.isCompleted).length > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenSettings} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineContainer}>
          {HOURS_24.map(hour => {
            const hourLogs = getLogsForHour(hour);
            const totalDuration = hourLogs.reduce((sum, l) => sum + (l.durationMinutes || 60), 0);
            const remainingDuration = Math.max(0, 60 - totalDuration);
            const isCurrentHour = isToday && hour === currentHour;

            return (
              <View key={hour} style={styles.hourRowWrapper}>
                <View style={styles.hourRow}>
                  <View style={styles.hourLabelContainer}>
                    <Text style={[styles.hourLabel, isCurrentHour && styles.hourLabelCurrent]}>
                      {formatHour(hour)}
                    </Text>
                  </View>
                  <View style={styles.hourSlotContainer}>
                    {hourLogs.map((log) => {
                      const category = getCategoryById(log.categoryId);
                      return (
                        <TouchableOpacity
                          key={log.id}
                          style={[
                            styles.hourSegment,
                            { 
                              flex: log.durationMinutes || 60,
                              backgroundColor: category ? category.color + '20' : '#f0f0ff',
                              borderLeftColor: category?.color || '#ccc',
                              borderLeftWidth: 4,
                            }
                          ]}
                          onPress={() => openEditModal(hour, log)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.activityText}>{log.activity}</Text>
                          <Text style={styles.durationMinText}>{log.durationMinutes}m</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {remainingDuration > 0 && (
                      <TouchableOpacity
                        style={[styles.hourSegmentEmpty, { flex: remainingDuration }]}
                        onPress={() => openEditModal(hour, undefined, remainingDuration)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emptyText}>+{remainingDuration}m</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openRangeModal} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── RANGE LOG MODAL ──────────────────────────────────────────── */}
      <Modal visible={rangeModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setRangeModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Title + duration badge */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity</Text>
              {duration ? (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={13} color="#fff" />
                  <Text style={styles.durationText}>{duration}</Text>
                </View>
              ) : null}
            </View>

            {/* Time range display */}
            {isValidRange && (
              <View style={styles.timeRangeDisplay}>
                <Text style={styles.timeRangeText}>
                  {formatTime(startHour, startMinute)} → {formatTime(endHour, endMinute)}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Activity name */}
              <TextInput
                style={styles.textInput}
                placeholder="What were you doing?"
                placeholderTextColor={COLORS.textMuted}
                value={rangeActivity}
                onChangeText={setRangeActivity}
              />

              {/* Time pickers */}
              <View style={styles.timePickersRow}>
                <View style={{ flex: 1 }}>
                  <TimePicker
                    label="Start Time"
                    hour={startHour}
                    minute={startMinute}
                    onChangeHour={setStartHour}
                    onChangeMinute={setStartMinute}
                  />
                </View>
                <View style={styles.arrowBetween}>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <TimePicker
                    label="End Time"
                    hour={endHour}
                    minute={endMinute}
                    onChangeHour={setEndHour}
                    onChangeMinute={setEndMinute}
                  />
                </View>
              </View>

              {!isValidRange && (
                <Text style={styles.validationText}>⚠ End time must be after start time</Text>
              )}

              {/* Category */}
              <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setRangeCategoryId(cat.id)}
                    style={[
                      styles.categoryChip,
                      { borderColor: cat.color },
                      rangeCategoryId === cat.id && { backgroundColor: cat.color },
                    ]}
                  >
                    <Text style={[styles.categoryChipText, rangeCategoryId === cat.id && { color: '#fff' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                onPress={handleSaveRange}
                style={[styles.saveBtn, (!isValidRange || savingRange) && styles.saveBtnDisabled]}
                disabled={!isValidRange || savingRange}
              >
                {savingRange ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {duration ? `Log ${duration}` : 'Log Activity'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── SINGLE HOUR EDIT MODAL ────────────────────────────────────── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editHour !== null ? `${formatHour(editHour)} - ${formatHour((editHour + 1) % 24)}` : ''}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="What were you doing?"
              placeholderTextColor={COLORS.textMuted}
              value={editActivity}
              onChangeText={setEditActivity}
              multiline
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <Text style={styles.sectionLabel}>Duration (m):</Text>
                <TextInput
                  style={[styles.textInput, { width: 80, marginBottom: 0, paddingVertical: 8, textAlign: 'center' }]}
                  keyboardType="numeric"
                  value={editDuration.toString()}
                  onChangeText={(val) => {
                    let num = parseInt(val) || 0;
                    if (num > maxEditDuration) num = maxEditDuration;
                    setEditDuration(num);
                  }}
                />
            </View>

            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 4 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setEditCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    { borderColor: cat.color },
                    editCategoryId === cat.id && { backgroundColor: cat.color },
                  ]}
                >
                  <Text style={[styles.categoryChipText, editCategoryId === cat.id && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              {editLogId && (
                <TouchableOpacity onPress={handleDeleteEdit} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.saveBtn, styles.saveBtnSmall, savingEdit && styles.saveBtnDisabled]}
                disabled={savingEdit}
              >
                {savingEdit ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <RemindersModal 
        visible={remindersModalVisible}
        onClose={() => setRemindersModalVisible(false)}
        user={user}
        reminders={reminders}
        onUpdate={refreshReminders}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2, zIndex: 10
  },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f8fafc' },
  dateText: { fontSize: 24, fontWeight: '700', color: COLORS.textMain, minWidth: 140, textAlign: 'center', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { padding: 10, borderRadius: 12, backgroundColor: '#f8fafc', position: 'relative' },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#f8fafc' },
  
  scroll: { flex: 1 },
  timelineContainer: { paddingTop: 12, paddingHorizontal: 16 },
  hourRowWrapper: { position: 'relative' },
  currentTimeLine: { position: 'absolute', top: 32, left: 60, right: 0, height: 2, backgroundColor: '#ef4444', zIndex: -1, borderRadius: 1, opacity: 0.4 },
  hourRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  hourLabelContainer: { width: 56, alignItems: 'flex-start' },
  hourLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  hourLabelCurrent: { color: '#ef4444', fontWeight: '700' },
  hourSlotContainer: {
    flex: 1, flexDirection: 'row', minHeight: 56,
    borderRadius: 16, overflow: 'hidden', gap: 2,
  },
  hourSegment: {
    justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6,
  },
  hourSegmentEmpty: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed',
    borderRadius: 8,
  },
  categoryIndicator: { width: 4, height: '90%', borderRadius: 2, marginRight: 2 },
  activityText: { fontSize: 14, color: COLORS.textMain, fontWeight: '600' },
  durationMinText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#cbd5e1', fontWeight: '600' },
  
  fab: {
    position: 'absolute', bottom: 28, right: 28,
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  durationText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timeRangeDisplay: {
    backgroundColor: COLORS.primary + '10', borderRadius: 10, padding: 10,
    marginBottom: 12, alignItems: 'center',
  },
  timeRangeText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  textInput: {
    backgroundColor: '#f8f9fb', borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.textMain, marginBottom: 14,
  },
  timePickersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  arrowBetween: { paddingTop: 22, paddingHorizontal: 4 },
  validationText: { fontSize: 14, color: '#ef4444', fontWeight: '500', marginBottom: 8 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, marginRight: 8, backgroundColor: COLORS.surface,
  },
  categoryChipText: { fontSize: 14, fontWeight: '400', color: COLORS.textMain },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnSmall: { paddingHorizontal: 28, paddingVertical: 12, marginTop: 0 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 10 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});

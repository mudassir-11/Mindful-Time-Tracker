import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, ActivityIndicator, Switch, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { UserProfile, Category } from '../types';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#6366f1',
  background: '#f8f9fb',
  surface: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

const PRESET_COLORS = [
  '#6366f1', '#8884d8', '#e83e8c', '#f59e0b',
  '#10b981', '#ff8042', '#0088fe', '#ffc658',
  '#82ca9d', '#ef4444', '#64748b', '#a855f7',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  user: User;
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function SettingsModal({ visible, onClose, user, profile, onProfileUpdate }: Props) {
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
  const [showPicker, setShowPicker] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const categories: Category[] = profile?.categories || [];

  useEffect(() => {
    if (visible) {
      notificationService.isReminderEnabled().then(setReminderEnabled);
      notificationService.getReminderTime().then(({hour, minute}) => {
        const d = new Date();
        d.setHours(hour, minute, 0, 0);
        setReminderTime(d);
      });
    }
  }, [visible]);

  const toggleReminder = async (value: boolean) => {
    if (value) {
      await notificationService.scheduleDailyReminder(reminderTime.getHours(), reminderTime.getMinutes());
      const enabled = await notificationService.isReminderEnabled();
      setReminderEnabled(enabled);
      if (!enabled) {
        Alert.alert('Permission Denied', 'Please enable notifications in your phone settings.');
      }
    } else {
      await notificationService.cancelAllReminders();
      setReminderEnabled(false);
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setReminderTime(selectedDate);
      if (reminderEnabled) {
        await notificationService.scheduleDailyReminder(selectedDate.getHours(), selectedDate.getMinutes());
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }
    const newCat: Category = {
      id: newCategoryName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: newCategoryName.trim(),
      color: newCategoryColor,
    };
    const updated = [...categories, newCat];
    setSaving(true);
    try {
      await databaseService.updateUserCategories(user.id, updated);
      const newProfile = { ...profile!, categories: updated };
      onProfileUpdate(newProfile);
      setNewCategoryName('');
      setNewCategoryColor(PRESET_COLORS[0]);
      setAddingCategory(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (catId: string) => {
    Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = categories.filter(c => c.id !== catId);
          await databaseService.updateUserCategories(user.id, updated);
          const newProfile = { ...profile!, categories: updated };
          onProfileUpdate(newProfile);
        }
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notifications</Text>
            <View style={[styles.settingRow, reminderEnabled && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
              <View style={styles.settingIconBox}>
                <Ionicons name="notifications" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Daily Reminder</Text>
                <Text style={styles.settingSub}>Prompt to log your day</Text>
              </View>
              <Switch 
                value={reminderEnabled} 
                onValueChange={toggleReminder}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>
            
            {reminderEnabled && (
              <View style={[styles.settingRow, { marginTop: -1, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, justifyContent: 'space-between' }]}>
                <Text style={styles.settingTitle}>Notification Time</Text>
                
                {Platform.OS === 'android' ? (
                  <>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => setShowPicker(true)}>
                      <Text style={styles.timeBtnText}>
                        {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                    {showPicker && (
                      <DateTimePicker
                        value={reminderTime}
                        mode="time"
                        display="default"
                        onChange={handleTimeChange}
                      />
                    )}
                  </>
                ) : (
                  <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                    style={{ width: 100 }}
                  />
                )}
              </View>
            )}
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => setShowCategories(!showCategories)}>
                <Text style={styles.sectionLabel}>Categories</Text>
                <Ionicons name={showCategories ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAddingCategory(!addingCategory)}
                style={styles.addCatBtn}
              >
                <Ionicons name={addingCategory ? 'close' : 'add'} size={18} color={COLORS.primary} />
                <Text style={styles.addCatBtnText}>{addingCategory ? 'Cancel' : 'Add'}</Text>
              </TouchableOpacity>
            </View>

            {/* Add Category Form */}
            {addingCategory && (
              <View style={styles.addCategoryForm}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Category name"
                  placeholderTextColor={COLORS.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <Text style={styles.colorLabel}>Choose color</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setNewCategoryColor(color)}
                      style={[styles.colorSwatch, { backgroundColor: color }, newCategoryColor === color && styles.colorSwatchSelected]}
                    >
                      {newCategoryColor === color && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={handleAddCategory}
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Add Category</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Category List */}
            {showCategories && categories.map(cat => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                <Text style={styles.categoryName}>{cat.label}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(cat.id)}
                  style={styles.deleteCatBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Sign Out */}
          <View style={styles.section}>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  scroll: { flex: 1 },
  section: { padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  settingIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  settingSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  timeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  timeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  userSub: { fontSize: 12, color: COLORS.textMuted },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addCatBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  addCategoryForm: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, gap: 12,
  },
  textInput: {
    backgroundColor: '#f8f9fb', borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.textMain,
  },
  colorLabel: { fontSize: 14, fontWeight: '400', color: COLORS.textMuted },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '400', color: COLORS.textMain },
  deleteCatBtn: { padding: 4 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fef2f2', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#fee2e2',
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});

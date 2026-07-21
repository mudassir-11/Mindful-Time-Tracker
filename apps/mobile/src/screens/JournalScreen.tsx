import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { JournalEntry } from '../types';

const COLORS = {
  primary: '#6366f1',
  background: '#f8f9fb',
  surface: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

const MOODS = ['Peaceful', 'Productive', 'Challenging', 'Restful'];

function getLocalDateString(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface Props {
  user: User;
}

export default function JournalScreen({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'write' | 'archive'>('write');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [archiveEntries, setArchiveEntries] = useState<JournalEntry[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const dateStr = getLocalDateString(selectedDate);

  useEffect(() => {
    loadEntry();
  }, [dateStr]);

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchive();
    }
  }, [activeTab, user.id]);

  const loadEntry = async () => {
    setLoading(true);
    setSaveStatus('idle');
    const data = await databaseService.getJournalEntry(user.id, dateStr);
    setEntry(data);
    setContent(data?.content || '');
    setMood(data?.mood || '');
    setLoading(false);
  };

  const loadArchive = async () => {
    setLoadingArchive(true);
    const entries = await databaseService.getAllJournalEntries(user.id);
    setArchiveEntries(entries);
    setLoadingArchive(false);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await databaseService.saveJournalEntry({
        userId: user.id,
        date: dateStr,
        content: content.trim(),
        mood,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('Failed to save journal:', e);
      setSaveStatus('error');
    }
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
    setSaveStatus('idle');
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    setSaveStatus('idle');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Prism Reflection</Text>
            <Text style={styles.headerSubtitle}>Document your mental state and progress.</Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('write')}
            style={[styles.tabBtn, activeTab === 'write' && styles.tabBtnActive]}
          >
            <Ionicons name="pencil" size={16} color={activeTab === 'write' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === 'write' && styles.tabTextActive]}>Write</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('archive')}
            style={[styles.tabBtn, activeTab === 'archive' && styles.tabBtnActive]}
          >
            <Ionicons name="time" size={16} color={activeTab === 'archive' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === 'archive' && styles.tabTextActive]}>Archive</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'write' ? (
        loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.card}>
                
                {/* Date Navigation */}
                <View style={styles.dateNavRow}>
                  <View style={styles.dateDisplay}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.dateText}>{formatDisplayDate(dateStr)}</Text>
                  </View>
                  <View style={styles.dateArrows}>
                    <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
                      <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextDay} style={styles.navBtn}>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mood Selector */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Current Vibe</Text>
                  <View style={styles.moodRow}>
                    {MOODS.map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setMood(m)}
                        style={[styles.moodBtn, mood === m && styles.moodBtnActive]}
                      >
                        <Text style={[styles.moodLabel, mood === m && styles.moodLabelActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Journal Text */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Daily Log</Text>
                  <TextInput
                    style={styles.journalInput}
                    value={content}
                    onChangeText={(txt) => { setContent(txt); setSaveStatus('idle'); }}
                    placeholder="Write your thoughts, victories, or lessons learned today..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.stickySaveBar}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saveStatus === 'saving'}
                style={[
                  styles.saveBtn,
                  saveStatus === 'saved' ? { backgroundColor: '#10b981' } : {},
                  saveStatus === 'saving' && { opacity: 0.6 }
                ]}
              >
                <Ionicons name={saveStatus === 'saved' ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Journal'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )
      ) : (
        /* Archive Tab */
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {loadingArchive ? (
            <Text style={styles.emptyText}>Fetching archives...</Text>
          ) : archiveEntries.length === 0 ? (
            <Text style={styles.emptyText}>No journal entries found. Time to write your first!</Text>
          ) : (
            archiveEntries.map(entry => (
              <View key={entry.id} style={styles.archiveCard}>
                <View style={styles.archiveHeader}>
                  <View style={styles.dateDisplay}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.archiveDateText}>{formatDisplayDate(entry.date)}</Text>
                  </View>
                  {entry.mood ? (
                    <View style={styles.archiveMoodBadge}>
                      <Text style={styles.archiveMoodText}>{entry.mood}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.archiveContentText}>{entry.content}</Text>
              </View>
            ))
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
    backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', marginTop: 2 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  
  scroll: { flex: 1, padding: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  dateNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16 },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  dateArrows: { flexDirection: 'row', gap: 6 },
  navBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#f8f9fb', borderWidth: 1, borderColor: COLORS.border,
  },
  moodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  moodLabel: { fontSize: 14, fontWeight: '400', color: COLORS.textMuted },
  moodLabelActive: { color: '#fff' },
  
  journalInput: {
    backgroundColor: '#f8f9fb', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, fontSize: 14, color: COLORS.textMain, lineHeight: 22,
    minHeight: 200, fontWeight: '400'
  },
  
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  stickySaveBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 40, fontStyle: 'italic', fontWeight: '400' },
  archiveCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  archiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  archiveDateText: { fontSize: 16, fontWeight: '600', color: COLORS.textMain },
  archiveMoodBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  archiveMoodText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  archiveContentText: { fontSize: 14, color: COLORS.textMain, lineHeight: 22, fontWeight: '400' },
});

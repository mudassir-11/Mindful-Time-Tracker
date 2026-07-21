import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { databaseService } from '../services/databaseService';
import { Reminder } from '../types';

const COLORS = {
  primary: '#6366f1',
  background: '#f8f9fb',
  surface: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  user: User;
  reminders: Reminder[];
  onUpdate: () => void;
}

export default function RemindersModal({ visible, onClose, user, reminders, onUpdate }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const activeReminders = reminders.filter(r => !r.isCompleted);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await databaseService.addReminder(user.id, newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      console.error('Failed to add reminder', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await databaseService.deleteReminder(id);
      onUpdate();
    } catch (e) {
      console.error('Failed to delete reminder', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior="padding"
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Active Reminders</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={activeReminders}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            style={{ flex: 1, marginBottom: 12 }}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No active reminders.</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.reminderRow}>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.checkBtn}>
                  <Ionicons name="square-outline" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
                <Text style={styles.reminderTitle}>{item.title}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          />

          {isAdding ? (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="What to remind?"
                placeholderTextColor={COLORS.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity onPress={handleAdd} style={styles.saveBtn}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.cancelBtn}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTrigger} onPress={() => setIsAdding(true)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addTriggerText}>Add Reminder</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
    maxHeight: '80%', minHeight: '40%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, textTransform: 'uppercase', letterSpacing: 0.5 },
  closeBtn: { padding: 4, borderRadius: 8, backgroundColor: '#f1f5f9' },
  
  addForm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#f8f9fb', borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.textMain,
  },
  saveBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  
  addTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, alignSelf: 'flex-start' },
  addTriggerText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  
  list: { gap: 12 },
  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic' },
  
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 12
  },
  checkBtn: { padding: 2 },
  reminderTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.textMain },
  deleteBtn: { padding: 4, opacity: 0.7 },
});

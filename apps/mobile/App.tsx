import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { databaseService } from './src/services/databaseService';
import './src/services/notificationService'; // Initialize notifications
import { UserProfile } from './src/types';

import TimelineScreen from './src/screens/TimelineScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import JournalScreen from './src/screens/JournalScreen';
import SettingsModal from './src/screens/SettingsModal';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#6366f1',
  background: '#f8f9fb',
  surface: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={authStyles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={authStyles.logoContainer}>
            <View style={authStyles.logoBox}>
              <Image source={require('./assets/favicon.png')} style={{ width: 72, height: 72, borderRadius: 20 }} />
            </View>
            <Text style={authStyles.logoTitle}>Prism</Text>
            <Text style={authStyles.logoSubtitle}>
              See the full spectrum of your day. Break down your time into distinct, colorful moments of focus.
            </Text>
          </View>

          {/* Form */}
          <View style={authStyles.form}>
            <TextInput
              style={authStyles.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={authStyles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'password'}
            />

            {error && (
              <View style={authStyles.errorBox}>
                <Text style={authStyles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[authStyles.button, loading && authStyles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={authStyles.buttonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(null); }}>
              <Text style={authStyles.switchText}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (authUser: User | null) => {
    setUser(authUser);
    if (authUser) {
      try {
        let userProfile = await databaseService.getUserProfile(authUser.id);
        if (!userProfile) {
          await databaseService.createUserProfile(authUser.id);
          userProfile = await databaseService.getUserProfile(authUser.id);
        }
        setProfile(userProfile);
      } catch (err) {
        console.error('Error loading profile:', err);
        setProfile({ userId: authUser.id, categories: [], onboardingComplete: true });
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={appStyles.loadingContainer}>
          <View style={appStyles.loadingLogo}>
            <Image source={require('./assets/favicon.png')} style={{ width: 80, height: 80, borderRadius: 24 }} />
          </View>
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 24 }} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const icons: Record<string, { active: any; inactive: any }> = {
                Timeline: { active: 'time', inactive: 'time-outline' },
                Goals: { active: 'flag', inactive: 'flag-outline' },
                Reports: { active: 'bar-chart', inactive: 'bar-chart-outline' },
                Journal: { active: 'book', inactive: 'book-outline' },
              };
              const icon = icons[route.name];
              return <Ionicons name={focused ? icon?.active : icon?.inactive} size={size} color={color} />;
            },
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: 4,
              paddingTop: 4,
              height: 60,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          })}
        >
          <Tab.Screen name="Timeline">
            {() => (
              <>
                <TimelineScreen
                  user={user}
                  profile={profile}
                  onOpenSettings={() => setSettingsVisible(true)}
                />
                <SettingsModal
                  visible={settingsVisible}
                  onClose={() => setSettingsVisible(false)}
                  user={user}
                  profile={profile}
                  onProfileUpdate={setProfile}
                />
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="Goals">
            {() => <GoalsScreen user={user} profile={profile} />}
          </Tab.Screen>
          <Tab.Screen name="Reports">
            {() => <ReportsScreen user={user} profile={profile} />}
          </Tab.Screen>
          <Tab.Screen name="Journal">
            {() => <JournalScreen user={user} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 32 },
  logoContainer: { alignItems: 'center', gap: 12 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoTitle: { fontSize: 32, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.5 },
  logoSubtitle: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  form: { gap: 14 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 14, fontSize: 16, color: COLORS.textMain,
  },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fee2e2' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 14, fontWeight: '500', paddingVertical: 4 },
});

const appStyles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  loadingLogo: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
});

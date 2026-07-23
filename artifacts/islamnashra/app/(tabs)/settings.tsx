import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGetPreferences, useUpsertPreferences } from '@workspace/api-client-react';
import { useLanguage, LANGUAGE_OPTIONS } from '@/contexts/LanguageContext';
import {
  registerForPushNotificationsAsync,
} from '@/hooks/usePushNotifications';

const CATEGORIES = ['World', 'Palestine', 'South Asia', 'Scholars', 'Community'];
const DEVICE_ID_KEY = 'deviceId';
const PUSH_TOKEN_KEY = 'pushToken';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const init = async () => {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      setDeviceId(id);

      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      setPushToken(token);
    };
    init();
  }, []);

  const { data: preferences } = useGetPreferences(deviceId!, {
    query: { enabled: !!deviceId },
  });

  const upsertMutation = useUpsertPreferences();

  /** Toggle notifications on/off. Also triggers token registration if enabling. */
  const handleToggleNotifications = useCallback(
    async (enabled: boolean) => {
      if (!deviceId) return;

      const currentFollowed = preferences?.followedCategories || [];

      // If enabling push, make sure we have a token first.
      let token = pushToken;
      if (enabled && !token) {
        setRegistering(true);
        try {
          token = await registerForPushNotificationsAsync();
          if (token) {
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
            setPushToken(token);
          } else {
            Alert.alert(
              'Notifications unavailable',
              'Could not register this device for push notifications. ' +
                'Make sure you are on a physical device and have granted notification permissions.',
            );
            setRegistering(false);
            return; // Don't save enabled:true if token is null
          }
        } catch {
          setRegistering(false);
          return;
        }
        setRegistering(false);
      }

      upsertMutation.mutate({
        data: {
          deviceId,
          notificationsEnabled: enabled,
          followedCategories: currentFollowed,
          ...(token ? { pushToken: token } : {}),
        },
      });
    },
    [deviceId, preferences, pushToken, upsertMutation],
  );

  const handleToggleCategory = useCallback(
    (category: string) => {
      if (!deviceId) return;
      const currentFollowed = preferences?.followedCategories || [];
      const isFollowed = currentFollowed.includes(category);

      const newFollowed = isFollowed
        ? currentFollowed.filter((c) => c !== category)
        : [...currentFollowed, category];

      upsertMutation.mutate({
        data: {
          deviceId,
          notificationsEnabled: preferences?.notificationsEnabled ?? false,
          followedCategories: newFollowed,
        },
      });
    },
    [deviceId, preferences, upsertMutation],
  );

  const { language, setLanguage } = useLanguage();
  const isNotificationsEnabled = preferences?.notificationsEnabled ?? false;
  const followedCategories = preferences?.followedCategories || [];

  // Token registration status label
  const tokenStatus = pushToken
    ? `Registered (${pushToken.substring(0, 30)}…)`
    : 'Not registered';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: 100 },
      ]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerUrdu, { color: colors.primaryForeground }]}>اسلام نشرہ</Text>
        <Text style={[styles.headerEnglish, { color: colors.accent }]}>IslamNashra</Text>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Language</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Choose the language for news content
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANGUAGE_OPTIONS.map((opt, index) => {
            const isActive = language === opt.code;
            return (
              <Pressable
                key={opt.code}
                style={[
                  styles.row,
                  index < LANGUAGE_OPTIONS.length - 1 && [
                    styles.rowBorder,
                    { borderBottomColor: colors.border },
                  ],
                ]}
                onPress={() => setLanguage(opt.code)}
              >
                <Text style={[styles.rowText, { color: colors.cardForeground }]}>
                  {opt.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Receive alerts for breaking Islamic news
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.cardForeground }]}>
              Push Notifications
            </Text>
            {registering ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={isNotificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.card}
              />
            )}
          </View>

          {/* Token status row */}
          <View
            style={[
              styles.row,
              styles.rowBorder,
              { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text style={[styles.tokenLabel, { color: colors.mutedForeground }]}>
              Device token
            </Text>
            <Text
              style={[
                styles.tokenValue,
                { color: pushToken ? colors.primary : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {pushToken ? '✓ Registered' : 'Not yet registered'}
            </Text>
          </View>
        </View>

        {!pushToken && (
          <Text style={[styles.tokenHint, { color: colors.mutedForeground }]}>
            Enable push notifications to register this device. Requires a physical device and an
            EXPO_PUBLIC_EAS_PROJECT_ID environment variable set to your expo.dev project ID.
          </Text>
        )}
      </View>

      {/* Category Alerts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Alerts</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Receive breaking news for specific categories
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {CATEGORIES.map((cat, index) => {
            const isFollowed = followedCategories.includes(cat);
            return (
              <Pressable
                key={cat}
                style={[
                  styles.row,
                  index < CATEGORIES.length - 1 && [
                    styles.rowBorder,
                    { borderBottomColor: colors.border },
                  ],
                ]}
                onPress={() => handleToggleCategory(cat)}
              >
                <Text style={[styles.rowText, { color: colors.cardForeground }]}>{cat}</Text>
                <Switch
                  value={isFollowed}
                  onValueChange={() => handleToggleCategory(cat)}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            IslamNashra uses AI to compile and summarize publicly available information about global
            Islamic affairs. Content is for general informational purposes and should be verified
            against primary news sources for critical decisions.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Version 1.0.0</Text>
        {__DEV__ && pushToken && (
          <Text
            selectable
            style={[styles.devToken, { color: colors.mutedForeground }]}
          >
            DEV token: {pushToken}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  headerUrdu: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  headerEnglish: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  tokenLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  tokenValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    maxWidth: '60%',
  },
  tokenHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    lineHeight: 18,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    padding: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  devToken: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGetPreferences, useUpsertPreferences } from '@workspace/api-client-react';

const CATEGORIES = ['World', 'Palestine', 'South Asia', 'Scholars', 'Community'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const initDeviceId = async () => {
      let id = await AsyncStorage.getItem('deviceId');
      if (!id) {
        id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('deviceId', id);
      }
      setDeviceId(id);
    };
    initDeviceId();
  }, []);

  const { data: preferences } = useGetPreferences(deviceId!, {
    query: {
      enabled: !!deviceId,
    },
  });

  const upsertMutation = useUpsertPreferences();

  const handleToggleNotifications = (enabled: boolean) => {
    if (!deviceId) return;
    const currentFollowed = preferences?.followedCategories || [];
    upsertMutation.mutate({
      data: {
        deviceId,
        notificationsEnabled: enabled,
        followedCategories: currentFollowed,
      },
    });
  };

  const handleToggleCategory = (category: string) => {
    if (!deviceId) return;
    const currentFollowed = preferences?.followedCategories || [];
    const isFollowed = currentFollowed.includes(category);
    
    let newFollowed;
    if (isFollowed) {
      newFollowed = currentFollowed.filter((c) => c !== category);
    } else {
      newFollowed = [...currentFollowed, category];
    }

    upsertMutation.mutate({
      data: {
        deviceId,
        notificationsEnabled: preferences?.notificationsEnabled ?? false,
        followedCategories: newFollowed,
      },
    });
  };

  const isNotificationsEnabled = preferences?.notificationsEnabled ?? false;
  const followedCategories = preferences?.followedCategories || [];

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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.cardForeground }]}>
              Push Notifications
            </Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        </View>
      </View>

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
                <Text style={[styles.rowText, { color: colors.cardForeground }]}>
                  {cat}
                </Text>
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            IslamNashra uses AI to compile and summarize publicly available information about global Islamic affairs. Content is for general informational purposes and should be verified against primary news sources for critical decisions.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    // padding applied dynamically
  },
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
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});

import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications, type StoredNotification } from '@/contexts/NotificationsContext';

const STRINGS = {
  ur: {
    title: 'اطلاعات',
    markRead: 'سب پڑھا',
    clear: 'صاف کریں',
    empty: 'ابھی تک کوئی اطلاع نہیں',
    emptySub: 'بریکنگ نیوز پر اطلاعات یہاں آئیں گی',
    ago: (mins: number) =>
      mins < 60
        ? `${mins} منٹ پہلے`
        : mins < 1440
        ? `${Math.floor(mins / 60)} گھنٹے پہلے`
        : `${Math.floor(mins / 1440)} دن پہلے`,
  },
  ar: {
    title: 'الإشعارات',
    markRead: 'تحديد الكل كمقروء',
    clear: 'مسح',
    empty: 'لا توجد إشعارات بعد',
    emptySub: 'ستظهر إشعارات الأخبار العاجلة هنا',
    ago: (mins: number) =>
      mins < 60
        ? `منذ ${mins} دقيقة`
        : mins < 1440
        ? `منذ ${Math.floor(mins / 60)} ساعة`
        : `منذ ${Math.floor(mins / 1440)} يوم`,
  },
  en: {
    title: 'Notifications',
    markRead: 'Mark all read',
    clear: 'Clear',
    empty: 'No notifications yet',
    emptySub: 'Breaking news alerts will appear here',
    ago: (mins: number) =>
      mins < 60
        ? `${mins}m ago`
        : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : `${Math.floor(mins / 1440)}d ago`,
  },
} as const;

function timeAgoMins(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

interface NotifItemProps {
  item: StoredNotification;
  s: (typeof STRINGS)['en'];
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
  isRTL: boolean;
  onPress: () => void;
}

function NotifItem({ item, s, colors, isRTL, onPress }: NotifItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: item.read ? colors.card : colors.primary + '12',
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.itemInner, isRTL && styles.itemInnerRTL]}>
        {/* Unread dot */}
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="notifications" size={22} color={colors.primary} />
        </View>
        <View style={[styles.textBlock, isRTL && { alignItems: 'flex-end' }]}>
          <Text
            style={[styles.notifTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!!item.body && (
            <Text
              style={[styles.notifBody, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          )}
          <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
            {s.ago(timeAgoMins(item.receivedAt))}
          </Text>
        </View>
        {item.postId && (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={colors.mutedForeground}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language } = useLanguage();
  const s = STRINGS[language];
  const isRTL = language === 'ur' || language === 'ar';
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  // Mark all as read when user views this screen
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) markAllRead();
    }, [unreadCount, markAllRead]),
  );

  const handlePress = (notif: StoredNotification) => {
    if (notif.postId) {
      router.push(`/post/${notif.postId}` as never);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>{s.title}</Text>
        {notifications.length > 0 && (
          <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
            <Pressable onPress={clearAll} style={styles.headerBtn} hitSlop={8}>
              <Text style={[styles.headerBtnText, { color: 'rgba(255,255,255,0.8)' }]}>{s.clear}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{s.empty}</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{s.emptySub}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              s={s}
              colors={colors}
              isRTL={isRTL}
              onPress={() => handlePress(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerActionsRTL: {
    justifyContent: 'flex-start',
  },
  headerBtn: {
    paddingVertical: 4,
  },
  headerBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  list: {
    paddingTop: 8,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemInnerRTL: {
    flexDirection: 'row-reverse',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  notifBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGetPost } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { timeAgo, expiresIn } from '@/components/NewsCard';
import { useLanguage, getLocalizedContent } from '@/contexts/LanguageContext';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const { data: post, isLoading, isError } = useGetPost(id, {
    query: {
      enabled: !!id,
    },
  });

  const localized = post ? getLocalizedContent(post, language) : null;
  const isRtl = language === 'ur' || language === 'ar';

  const handleShare = async () => {
    if (!post || !localized) return;
    try {
      await Share.share({
        message: `${localized.title}\n\n${localized.body}\n\nRead more on IslamNashra`,
        title: localized.title,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading || !post) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="warning" size={48} color={colors.destructive} />
        <Text style={{ color: colors.foreground, marginTop: 16 }}>Failed to load article</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderHeader = () => {
    if (post.hasImage && post.imageUrl) {
      return (
        <View style={styles.imageHero}>
          <Image source={{ uri: post.imageUrl }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={[styles.backButtonImg, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.solidHeader, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
        <Pressable style={styles.backButtonSolid} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.primaryForeground} />
        </Pressable>
        <Ionicons name="newspaper" size={64} color="rgba(255,255,255,0.1)" style={styles.headerIconBg} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {renderHeader()}

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
                  {post.category}
                </Text>
              </View>
              {post.isBreaking && (
                <View style={[styles.breakingBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.breakingText, { color: colors.destructiveForeground }]}>
                    BREAKING
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.aiLabel, { color: colors.mutedForeground }]}>
              AI-Generated Summary
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.foreground },
              isRtl && styles.rtlText,
            ]}
          >
            {localized!.title}
          </Text>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              Published {timeAgo(post.publishedAt)} • {expiresIn(post.expiresAt)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text
            style={[
              styles.body,
              { color: colors.foreground },
              isRtl && styles.rtlText,
            ]}
          >
            {localized!.body}
          </Text>

          {post.sourceNote && (
            <Text style={[styles.sourceNote, { color: colors.mutedForeground }]}>
              Source: {post.sourceNote}
            </Text>
          )}

          <View style={[styles.disclaimerBox, { backgroundColor: colors.muted }]}>
            <Ionicons name="information-circle" size={20} color={colors.mutedForeground} />
            <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
              IslamNashra uses AI to compile and summarize publicly available information about global Islamic affairs. Content is for general informational purposes and should be verified against primary news sources for critical decisions.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.shareButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleShare}
        >
          <Ionicons name="share-social-outline" size={24} color={colors.primary} />
          <Text style={[styles.shareText, { color: colors.primary }]}>Share Article</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHero: {
    width: '100%',
    height: 260,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButtonImg: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidHeader: {
    width: '100%',
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  backButtonSolid: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    zIndex: 10,
  },
  headerIconBg: {
    position: 'absolute',
    right: 20,
    bottom: -10,
  },
  content: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  breakingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  breakingText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  aiLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 32,
    marginBottom: 12,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  timeText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  body: {
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    lineHeight: 28,
    marginBottom: 24,
  },
  sourceNote: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginBottom: 32,
  },
  disclaimerBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 100,
    backgroundColor: 'rgba(15, 92, 63, 0.1)',
  },
  shareText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});

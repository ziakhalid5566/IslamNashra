import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Post } from '@workspace/api-client-react/src/generated/api.schemas';

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  return Math.floor(mins / 1440) + 'd ago';
};

export const expiresIn = (iso: string) => {
  const hrs = Math.round((new Date(iso).getTime() - Date.now()) / 3600000);
  if (hrs <= 0) return 'Expiring';
  if (hrs < 24) return 'Expires in ' + hrs + 'h';
  return 'Expires in ' + Math.floor(hrs / 24) + 'd';
};

interface NewsCardProps {
  post: Post;
}

export function NewsCard({ post }: NewsCardProps) {
  const colors = useColors();

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Link href={`/post/${post.id}`} asChild>
      <Pressable onPressIn={handlePressIn}>
        {({ pressed }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {post.hasImage && post.imageUrl ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageGradient}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.noImageContainer,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="newspaper" size={48} color="rgba(255,255,255,0.2)" />
              </View>
            )}

            <View style={styles.contentContainer}>
              <View style={styles.headerRow}>
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
                    {post.category}
                  </Text>
                </View>
                <Text style={[styles.aiLabel, { color: colors.mutedForeground }]}>
                  AI-Generated Summary
                </Text>
              </View>

              <Text
                style={[styles.title, { color: colors.cardForeground }]}
                numberOfLines={3}
              >
                {post.title}
              </Text>
              <Text
                style={[styles.excerpt, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {post.body}
              </Text>

              <View style={styles.footerRow}>
                <View style={styles.footerLeft}>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    {timeAgo(post.publishedAt)}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    •
                  </Text>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    {expiresIn(post.expiresAt)}
                  </Text>
                </View>
                {post.isBreaking && (
                  <View
                    style={[styles.breakingBadge, { backgroundColor: colors.destructive }]}
                  >
                    <Text
                      style={[styles.breakingText, { color: colors.destructiveForeground }]}
                    >
                      BREAKING
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  noImageContainer: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  aiLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    lineHeight: 22,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  breakingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  breakingText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
});

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  SectionList,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useListPosts } from '@workspace/api-client-react';
import { SkeletonCard } from '@/components/SkeletonCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedContent } from '@/contexts/LanguageContext';
import { timeAgo, formatCount } from '@/components/NewsCard';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { Post } from '@workspace/api-client-react/src/generated/api.schemas';

// ─── Bilingual strings ───────────────────────────────────────────────────────
const STRINGS = {
  ur: {
    title: 'تلاش',
    placeholder: 'خبریں تلاش کریں...',
    noResults: 'کوئی نتیجہ نہیں ملا',
    noResultsSub: 'دوسرے الفاظ آزمائیں',
    cancel: 'منسوخ',
    breaking: '🔴 بریکنگ نیوز',
    trending: '🔥 ٹرینڈنگ',
    resultsFor: 'نتائج:',
    hint: 'اوپر لکھ کر خبریں تلاش کریں',
  },
  ar: {
    title: 'بحث',
    placeholder: 'ابحث عن الأخبار...',
    noResults: 'لم يتم العثور على نتائج',
    noResultsSub: 'جرّب كلمات أخرى',
    cancel: 'إلغاء',
    breaking: '🔴 عاجل',
    trending: '🔥 الأكثر تداولاً',
    resultsFor: 'نتائج:',
    hint: 'اكتب فوق للبحث',
  },
  en: {
    title: 'Search',
    placeholder: 'Search articles...',
    noResults: 'No results found',
    noResultsSub: 'Try different keywords',
    cancel: 'Cancel',
    breaking: '🔴 Breaking News',
    trending: '🔥 Trending',
    resultsFor: 'Results:',
    hint: 'Type above to search articles',
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalize(str: string) {
  return str.toLowerCase().trim();
}

function postMatchesQuery(post: Post, q: string): boolean {
  const n = normalize(q);
  return [
    post.titleEn, post.titleUr, post.titleAr,
    post.bodyEn?.slice(0, 200), post.bodyUr?.slice(0, 200), post.bodyAr?.slice(0, 200),
    post.title, post.body?.slice(0, 200), post.category,
  ]
    .filter(Boolean)
    .some((field) => normalize(field as string).includes(n));
}

/** Returns match score: how relevant is the post to the query */
function matchScore(post: Post, q: string): number {
  const n = normalize(q);
  let score = 0;
  // Title match = higher score
  if ([post.titleEn, post.titleUr, post.titleAr, post.title].some(f => f && normalize(f).includes(n))) score += 10;
  // Body match = lower score
  if ([post.bodyEn, post.bodyUr, post.bodyAr, post.body].some(f => f && normalize(f).includes(n))) score += 2;
  // Bonus for breaking or high engagement
  if (post.isBreaking) score += 3;
  score += Math.min((post.viewsCount ?? 0) + (post.likesCount ?? 0), 20);
  return score;
}

// ─── HighlightText ───────────────────────────────────────────────────────────
function HighlightText({
  text,
  query,
  style,
  highlightColor,
  numberOfLines,
  rtl,
}: {
  text: string;
  query: string;
  style?: object;
  highlightColor: string;
  numberOfLines?: number;
  rtl?: boolean;
}) {
  if (!query.trim()) {
    return <Text style={[style, rtl && styles.rtl]} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) {
    return <Text style={[style, rtl && styles.rtl]} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <Text style={[style, rtl && styles.rtl]} numberOfLines={numberOfLines}>
      {before}
      <Text style={[style, { backgroundColor: highlightColor, fontFamily: 'Inter_700Bold' }]}>{match}</Text>
      {after}
    </Text>
  );
}

// ─── Compact result row ───────────────────────────────────────────────────────
function SearchResultRow({
  post,
  query,
  language,
  colors,
}: {
  post: Post;
  query: string;
  language: string;
  colors: ReturnType<typeof useColors>;
}) {
  const { title, body } = getLocalizedContent(post as any, language as any);
  const isRTL = language === 'ur' || language === 'ar';

  return (
    <Link href={`/post/${post.id}`} asChild>
      <Pressable
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        style={({ pressed }) => [
          styles.resultRow,
          {
            backgroundColor: pressed ? colors.muted : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Thumbnail */}
        {post.hasImage && post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.primary }]}>
            <Ionicons name="newspaper" size={22} color="rgba(255,255,255,0.35)" />
          </View>
        )}

        {/* Content */}
        <View style={styles.resultContent}>
          {/* Category + breaking */}
          <View style={[styles.resultMeta, isRTL && styles.rowReverse]}>
            <View style={[styles.catBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.catText, { color: colors.accentForeground }]}>{post.category}</Text>
            </View>
            {post.isBreaking && (
              <View style={[styles.breakBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[styles.breakText, { color: colors.destructiveForeground }]}>BREAKING</Text>
              </View>
            )}
            <Text style={[styles.timeSmall, { color: colors.mutedForeground, marginLeft: 'auto' }]}>
              {timeAgo(post.publishedAt)}
            </Text>
          </View>

          {/* Title with highlight */}
          <HighlightText
            text={title}
            query={query}
            style={[styles.resultTitle, { color: colors.cardForeground }]}
            highlightColor={colors.primary + '44'}
            numberOfLines={2}
            rtl={isRTL}
          />

          {/* Body snippet with highlight */}
          {body ? (
            <HighlightText
              text={body}
              query={query}
              style={[styles.resultSnippet, { color: colors.mutedForeground }]}
              highlightColor={colors.primary + '33'}
              numberOfLines={1}
              rtl={isRTL}
            />
          ) : null}

          {/* Engagement */}
          <View style={[styles.resultFooter, isRTL && styles.rowReverse]}>
            <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(post.viewsCount ?? 0)}</Text>
            <Ionicons name="heart-outline" size={12} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
            <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(post.likesCount ?? 0)}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ─── Mini card for breaking/trending strips ───────────────────────────────────
function PinnedCard({
  post,
  language,
  colors,
}: {
  post: Post;
  language: string;
  colors: ReturnType<typeof useColors>;
}) {
  const { title } = getLocalizedContent(post as any, language as any);
  const isRTL = language === 'ur' || language === 'ar';

  return (
    <Link href={`/post/${post.id}`} asChild>
      <Pressable
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        style={({ pressed }) => [
          styles.pinnedCard,
          { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border },
        ]}
      >
        {post.hasImage && post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={styles.pinnedImage} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.pinnedImage, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="newspaper" size={28} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <View style={[styles.pinnedBottom, { backgroundColor: colors.card }]}>
          <View style={[styles.catBadge, { backgroundColor: colors.accent, marginBottom: 4 }]}>
            <Text style={[styles.catText, { color: colors.accentForeground }]}>{post.category}</Text>
          </View>
          <Text
            style={[styles.pinnedTitle, { color: colors.cardForeground }, isRTL && styles.rtl]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={[styles.resultFooter, { marginTop: 4 }]}>
            <Ionicons name="eye-outline" size={11} color={colors.mutedForeground} />
            <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(post.viewsCount ?? 0)}</Text>
            <Ionicons name="heart-outline" size={11} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
            <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(post.likesCount ?? 0)}</Text>
            <Text style={[styles.engText, { color: colors.mutedForeground, marginLeft: 'auto' }]}>{timeAgo(post.publishedAt)}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language } = useLanguage();
  const s = STRINGS[language];
  const isRTL = language === 'ur' || language === 'ar';

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Load all posts once
  const { data, isLoading } = useListPosts({ limit: 100 });
  const allPosts: Post[] = data?.posts ?? [];

  // Breaking posts (isBreaking flag)
  const breakingPosts = useMemo(
    () => allPosts.filter((p) => p.isBreaking).slice(0, 5),
    [allPosts],
  );

  // Trending posts (highest views + likes, exclude already shown breaking)
  const trendingPosts = useMemo(() => {
    const breakingIds = new Set(breakingPosts.map((p) => p.id));
    return [...allPosts]
      .filter((p) => !breakingIds.has(p.id))
      .sort((a, b) => (b.viewsCount + b.likesCount) - (a.viewsCount + a.likesCount))
      .slice(0, 8);
  }, [allPosts, breakingPosts]);

  // Search results — filtered + ranked, NO debounce (instant)
  const results = useMemo<Post[]>(() => {
    const q = query.trim();
    if (!q || !allPosts.length) return [];
    return allPosts
      .filter((p) => postMatchesQuery(p, q))
      .sort((a, b) => matchScore(b, q) - matchScore(a, q));
  }, [query, allPosts]);

  const hasQuery = query.trim().length > 0;

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleCancel = useCallback(() => {
    setQuery('');
    inputRef.current?.blur();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header / Search bar ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>{s.title}</Text>

        <View style={[styles.searchRow, { paddingBottom: 14 }]}>
          <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons
              name={hasQuery ? 'search' : 'search-outline'}
              size={18}
              color={colors.primaryForeground}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.searchInput,
                {
                  color: colors.primaryForeground,
                  fontFamily: 'Inter_400Regular',
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={s.placeholder}
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={query}
              onChangeText={setQuery}     // no debounce — instant
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
            />
            {query.length > 0 && Platform.OS !== 'ios' && (
              <Pressable onPress={handleClear} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
          {query.length > 0 && (
            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.primaryForeground }]}>{s.cancel}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : hasQuery ? (
        /* ── Search Results ──────────────────────────────────────────────── */
        results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{s.noResults}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{s.noResultsSub}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.resultsLabel, { color: colors.mutedForeground }]}>
                {s.resultsFor} <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{query}</Text>
                {'  '}
                <Text style={{ color: colors.primary }}>({results.length})</Text>
              </Text>
            </View>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SearchResultRow post={item} query={query} language={language} colors={colors} />
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            />
          </>
        )
      ) : (
        /* ── No query: Breaking + Trending ──────────────────────────────── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          keyboardDismissMode="on-drag"
        >
          {/* Breaking News */}
          {breakingPosts.length > 0 && (
            <>
              <SectionHeader title={s.breaking} colors={colors} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {breakingPosts.map((p) => (
                  <PinnedCard key={p.id} post={p} language={language} colors={colors} />
                ))}
              </ScrollView>
            </>
          )}

          {/* Trending */}
          {trendingPosts.length > 0 && (
            <>
              <SectionHeader title={s.trending} colors={colors} />
              {trendingPosts.map((p, i) => (
                <Link key={p.id} href={`/post/${p.id}`} asChild>
                  <Pressable
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={({ pressed }) => [
                      styles.trendingRow,
                      {
                        backgroundColor: pressed ? colors.muted : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Rank number */}
                    <Text style={[styles.rankNum, { color: i < 3 ? colors.primary : colors.mutedForeground }]}>
                      {String(i + 1).padStart(2, '0')}
                    </Text>
                    <View style={styles.trendingContent}>
                      <View style={[styles.resultMeta, isRTL && styles.rowReverse]}>
                        <View style={[styles.catBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.catText, { color: colors.accentForeground }]}>{p.category}</Text>
                        </View>
                        {p.isBreaking && (
                          <View style={[styles.breakBadge, { backgroundColor: colors.destructive }]}>
                            <Text style={[styles.breakText, { color: colors.destructiveForeground }]}>BREAKING</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.trendingTitle, { color: colors.cardForeground }, isRTL && styles.rtl]}
                        numberOfLines={2}
                      >
                        {getLocalizedContent(p as any, language as any).title}
                      </Text>
                      <View style={styles.resultFooter}>
                        <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(p.viewsCount ?? 0)}</Text>
                        <Ionicons name="heart-outline" size={12} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
                        <Text style={[styles.engText, { color: colors.mutedForeground }]}>{formatCount(p.likesCount ?? 0)}</Text>
                        <Text style={[styles.engText, { color: colors.mutedForeground, marginLeft: 'auto' }]}>
                          {timeAgo(p.publishedAt)}
                        </Text>
                      </View>
                    </View>
                    {p.hasImage && p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.trendingThumb} contentFit="cover" transition={150} />
                    ) : (
                      <View style={[styles.trendingThumb, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="newspaper" size={18} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                  </Pressable>
                </Link>
              ))}
            </>
          )}

          {/* Hint if no data at all */}
          {breakingPosts.length === 0 && trendingPosts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{s.hint}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16 },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    alignSelf: 'center',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  cancelBtn: { paddingVertical: 6 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },

  // Results header
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  // Search result row
  resultRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumb: { width: 80, height: 90 },
  thumbPlaceholder: {
    width: 80,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: { flex: 1, padding: 10, gap: 3 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  rowReverse: { flexDirection: 'row-reverse' },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  catText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  breakBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  breakText: { fontSize: 9, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  timeSmall: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  resultTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  resultSnippet: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  resultFooter: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  engText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },

  // Horizontal pinned cards (breaking)
  horizontalList: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  pinnedCard: {
    width: 200,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pinnedImage: { width: '100%', height: 110 },
  pinnedBottom: { padding: 10 },
  pinnedTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 18 },

  // Trending list
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 10,
    overflow: 'hidden',
  },
  rankNum: { fontSize: 22, fontFamily: 'Inter_700Bold', width: 34, textAlign: 'center' },
  trendingContent: { flex: 1, gap: 3 },
  trendingTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  trendingThumb: { width: 64, height: 64, borderRadius: 8 },

  // Empty / hint
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  // RTL
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});

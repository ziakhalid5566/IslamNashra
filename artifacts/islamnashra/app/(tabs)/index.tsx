import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useListPosts } from '@workspace/api-client-react';
import { NewsCard } from '@/components/NewsCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '@workspace/api-client-react/src/generated/api.schemas';
import { useLanguage, LANGUAGE_OPTIONS, type Language } from '@/contexts/LanguageContext';

const CATEGORIES = ['All', 'World', 'Palestine', 'South Asia', 'Scholars', 'Community'];

const LANG_META: Record<Language, { flag: string; short: string }> = {
  en: { flag: '🇬🇧', short: 'EN' },
  ur: { flag: '🇵🇰', short: 'اردو' },
  ar: { flag: '🇸🇦', short: 'عربي' },
};

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, setLanguage } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch, isError } = useListPosts(
    {
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      limit: 20,
    },
    {
      query: {
        queryKey: ['posts', selectedCategory],
      },
    }
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: colors.primary }]}>
      {/* Brand row */}
      <View style={styles.brandRow}>
        {/* Logo mark */}
        <View style={[styles.logoMark, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.logoEmoji}>☪️</Text>
        </View>

        {/* Title stack */}
        <View style={styles.titleStack}>
          <Text style={[styles.titleMain, { color: colors.primaryForeground }]}>
            IslamNashra
          </Text>
          <Text style={[styles.titleSub, { color: 'rgba(255,255,255,0.6)' }]}>
            اسلامی خبریں • Global Islamic News
          </Text>
        </View>
      </View>

      {/* Language switcher — pill style */}
      <View style={[styles.langPill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const active = language === opt.code;
          const meta = LANG_META[opt.code];
          return (
            <Pressable
              key={opt.code}
              onPress={() => setLanguage(opt.code)}
              style={[
                styles.langSegment,
                active && { backgroundColor: colors.primaryForeground },
              ]}
            >
              <Text style={styles.langFlag}>{meta.flag}</Text>
              <Text
                style={[
                  styles.langLabel,
                  { color: active ? colors.primary : 'rgba(255,255,255,0.75)' },
                ]}
              >
                {meta.short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Slim divider */}
      <View style={[styles.headerDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
    </View>
  );

  const renderCategories = () => (
    <View style={[styles.categoriesWrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: isSelected ? colors.primaryForeground : colors.foreground,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item, index }: { item: Post; index: number }) => {
    const isAd = index > 0 && index % 8 === 0;
    return (
      <>
        {isAd && (
          <View
            style={[
              styles.adPlaceholder,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.adText, { color: colors.mutedForeground }]}>Sponsored</Text>
          </View>
        )}
        <NewsCard post={item} language={language} />
      </>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.listContent}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.destructive} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>Failed to load news.</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Fetching latest news…</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderCategories()}
      <FlatList
        data={data?.posts || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Header ── */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 24 },
  titleStack: { flex: 1 },
  titleMain: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  titleSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  headerDivider: { height: 1, marginTop: 2 },

  /* Language pill */
  langPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: 100,
    padding: 3,
    gap: 2,
  },
  langSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  langFlag: { fontSize: 14 },
  langLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  /* ── Category strip ── */
  categoriesWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 13 },

  /* ── List ── */
  listContent: { paddingVertical: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, fontFamily: 'Inter_400Regular' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  adPlaceholder: {
    marginHorizontal: 16, marginVertical: 8,
    height: 80, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  adText: { fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'uppercase' },
});

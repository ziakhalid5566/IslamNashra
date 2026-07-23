import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useListPosts } from '@workspace/api-client-react';
import { NewsCard } from '@/components/NewsCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Post } from '@workspace/api-client-react/src/generated/api.schemas';

// Bilingual UI strings
const STRINGS = {
  ur: {
    title: 'تلاش',
    placeholder: 'خبریں تلاش کریں...',
    hint: 'اسلامی خبریں تلاش کریں',
    hintSub: 'عنوان یا مواد لکھیں',
    noResults: 'کوئی نتیجہ نہیں ملا',
    noResultsSub: 'دوسرے الفاظ آزمائیں',
    cancel: 'منسوخ',
  },
  ar: {
    title: 'بحث',
    placeholder: 'ابحث عن الأخبار...',
    hint: 'ابحث عن الأخبار الإسلامية',
    hintSub: 'اكتب العنوان أو المحتوى',
    noResults: 'لم يتم العثور على نتائج',
    noResultsSub: 'جرّب كلمات أخرى',
    cancel: 'إلغاء',
  },
  en: {
    title: 'Search',
    placeholder: 'Search articles...',
    hint: 'Search Islamic news',
    hintSub: 'Type a title or keyword',
    noResults: 'No results found',
    noResultsSub: 'Try different keywords',
    cancel: 'Cancel',
  },
} as const;

function normalize(str: string) {
  return str.toLowerCase().trim();
}

function postMatchesQuery(post: Post, q: string): boolean {
  const n = normalize(q);
  return [
    post.titleEn, post.titleUr, post.titleAr,
    post.bodyEn, post.bodyUr, post.bodyAr,
    post.title, post.body, post.category,
  ]
    .filter(Boolean)
    .some((field) => normalize(field as string).includes(n));
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language } = useLanguage();
  const s = STRINGS[language];
  const isRTL = language === 'ur' || language === 'ar';

  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Debounce 250 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Load all recent posts once — 72h rolling window is small (~100-200 posts max)
  const { data, isLoading } = useListPosts({ limit: 100 });

  const results = useMemo<Post[]>(() => {
    const q = debouncedQuery.trim();
    if (!q || !data?.posts) return [];
    return data.posts.filter((p) => postMatchesQuery(p, q));
  }, [debouncedQuery, data?.posts]);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>{s.title}</Text>

        {/* Search bar */}
        <View style={[styles.searchRow, { paddingBottom: 14 }]}>
          <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="search" size={18} color={colors.primaryForeground} style={styles.searchIcon} />
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
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={rawQuery}
              onChangeText={setRawQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
            />
            {rawQuery.length > 0 && Platform.OS !== 'ios' && (
              <Pressable onPress={() => setRawQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
          {rawQuery.length > 0 && (
            <Pressable onPress={() => { setRawQuery(''); inputRef.current?.blur(); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.primaryForeground }]}>{s.cancel}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Body */}
      {!hasQuery ? (
        <View style={styles.hintContainer}>
          <Ionicons name="search-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>{s.hint}</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>{s.hintSub}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.hintContainer}>
          <Ionicons name="document-text-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>{s.noResults}</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>{s.noResultsSub}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard post={item} language={language} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    alignSelf: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  cancelBtn: {
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  hintContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  hintTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  hintSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 8,
  },
});

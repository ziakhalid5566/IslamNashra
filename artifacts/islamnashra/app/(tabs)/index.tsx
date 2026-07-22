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

const CATEGORIES = ['All', 'World', 'Palestine', 'South Asia', 'Scholars', 'Community'];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.primary }]}>
      <Text style={[styles.headerUrdu, { color: colors.primaryForeground }]}>اسلام نشرہ</Text>
      <Text style={[styles.headerEnglish, { color: colors.accent }]}>IslamNashra</Text>
    </View>
  );

  const renderCategories = () => (
    <View style={[styles.categoriesWrapper, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.adText, { color: colors.mutedForeground }]}>
              Sponsored
            </Text>
          </View>
        )}
        <NewsCard post={item} />
      </>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.destructive} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>
            Failed to load news.
          </Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.primaryForeground }}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Fetching latest news…
        </Text>
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
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  headerUrdu: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginTop: 8,
  },
  headerEnglish: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },
  categoriesWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  adPlaceholder: {
    marginHorizontal: 16,
    marginVertical: 8,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
  },
});

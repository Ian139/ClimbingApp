import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  Share,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nanoid } from 'nanoid/non-secure';
import {
  HOLD_COLORS,
  type Route,
  type Hold,
} from '@climbset/shared';
import { calculateDisplayGrade } from '@climbset/shared';
import { useRoutesStore } from '../../lib/stores/routes-store';
import { useWallsStore } from '../../lib/stores/walls-store';
import { useUserStore } from '../../lib/stores/user-store';
import { supabase } from '../../lib/supabase';

function HoldDots({ holds }: { holds: Hold[] }) {
  const typeCounts: Record<string, number> = {};
  holds.forEach((h) => { typeCounts[h.type] = (typeCounts[h.type] || 0) + 1; });
  return (
    <View className="flex-row items-center gap-1.5">
      {Object.entries(typeCounts).map(([type, count]) => (
        <View key={type} className="flex-row items-center gap-0.5">
          <View style={{ backgroundColor: HOLD_COLORS[type as keyof typeof HOLD_COLORS], width: 6, height: 6, borderRadius: 3 }} />
          <Text style={{ fontSize: 10, color: '#8b7668' }}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

function RouteRow({
  route,
  isLast,
  wallName,
  onPress,
}: {
  route: Route;
  isLast: boolean;
  wallName?: string;
  onPress: () => void;
}) {
  const displayGrade = calculateDisplayGrade(route.grade_v, route.ascents);
  const sendCount = route.ascents?.length || 0;
  const timeAgo = getTimeAgo(route.created_at);

  return (
    <Pressable
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(230, 221, 208, 0.3)',
      }}
      className="active:opacity-60"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        {displayGrade && (
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#3d2817', width: 48 }}>
            {displayGrade}
          </Text>
        )}
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#3d2817' }} numberOfLines={1}>
            {route.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            {route.user_name && (
              <Text style={{ fontSize: 13, color: '#8b7668' }}>{route.user_name}</Text>
            )}
            {wallName && (
              <Text style={{ fontSize: 12, color: '#8b7668' }}>• {wallName}</Text>
            )}
            <HoldDots holds={route.holds} />
          </View>
        </View>
        <View className="items-end ml-3">
          <Text style={{ fontSize: 12, color: '#8b7668' }}>♥ {route.like_count || 0}</Text>
          {sendCount > 0 && (
            <Text style={{ fontSize: 11, color: '#8b766880', marginTop: 2 }}>
              {sendCount} {sendCount === 1 ? 'send' : 'sends'}
            </Text>
          )}
          <Text style={{ fontSize: 10, color: '#8b766850', marginTop: 2 }}>{timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const {
    routes,
    isLoading,
    fetchRoutes,
    toggleLike,
    addAscent,
    updateRoute,
    addComment,
    updateComment,
    deleteComment,
    refreshRouteComments,
  } = useRoutesStore();
  const { fetchWalls, getWallById, walls, selectedWall, setSelectedWall } = useWallsStore();
  const { user, profile } = useUserStore();
  const [sortBy, setSortBy] = useState<'newest' | 'most-liked' | 'most-climbed'>('newest');
  const [showWallPicker, setShowWallPicker] = useState(false);
  const [routeToViewId, setRouteToViewId] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRating, setLogRating] = useState<number | null>(null);
  const [logFlashed, setLogFlashed] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentIsBeta, setCommentIsBeta] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingIsBeta, setEditingIsBeta] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchWalls();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    await fetchWalls();
    setRefreshing(false);
  };

  const activeWallId = selectedWall?.id || 'all-walls';
  const scopedRoutes = useMemo(() => {
    if (activeWallId === 'all-walls') return routes;
    return routes.filter((r) => r.wall_id === activeWallId);
  }, [routes, activeWallId]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return scopedRoutes;
    const q = searchQuery.toLowerCase();
    return scopedRoutes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.grade_v?.toLowerCase().includes(q) || r.user_name?.toLowerCase().includes(q)
    );
  }, [scopedRoutes, searchQuery]);

  const sortedRoutes = useMemo(() => {
    const next = [...filteredRoutes];
    next.sort((a, b) => {
      if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
      if (sortBy === 'most-climbed') return (b.ascents?.length || 0) - (a.ascents?.length || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return next;
  }, [filteredRoutes, sortBy]);

  const routeToView = useMemo(
    () => (routeToViewId ? routes.find((r) => r.id === routeToViewId) || null : null),
    [routes, routeToViewId]
  );

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const handleShare = async (route: Route) => {
    let token = route.share_token;
    if (!token) {
      token = nanoid(10);
      await updateRoute(route.id, { share_token: token });
      try {
        await supabase.from('routes').update({ share_token: token }).eq('id', route.id);
      } catch {
        // ignore
      }
    }
    const base = process.env.EXPO_PUBLIC_APP_URL || process.env.EXPO_PUBLIC_WEB_URL;
    const url = base ? `${base.replace(/\/$/, '')}/share/${token}` : token;
    try {
      await Share.share({ message: url, url });
    } catch {
      // ignore
    }
  };

  const handleLogSend = async () => {
    if (!routeToViewId) return;
    await addAscent(routeToViewId, {
      id: nanoid(),
      route_id: routeToViewId,
      user_id: user?.id || 'local-user',
      user_name: profile?.full_name || user?.displayName || 'Climber',
      grade_v: routeToView?.grade_v,
      rating: logRating || undefined,
      notes: logNote || undefined,
      flashed: logFlashed,
      created_at: new Date().toISOString(),
    });
    setShowLogModal(false);
    setLogRating(null);
    setLogFlashed(false);
    setLogNote('');
  };

  const handleAddComment = async () => {
    if (!routeToView || !commentText.trim()) return;
    await addComment(routeToView.id, {
      id: nanoid(),
      route_id: routeToView.id,
      user_id: user?.id || 'local-user',
      user_name: profile?.full_name || user?.displayName || 'Climber',
      content: commentText.trim(),
      is_beta: commentIsBeta,
      created_at: new Date().toISOString(),
    });
    setCommentText('');
    setCommentIsBeta(false);
  };

  const startEditComment = (commentId: string, content: string, isBeta: boolean) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
    setEditingIsBeta(isBeta);
  };

  const handleSaveEdit = async () => {
    if (!routeToView || !editingCommentId || !editingContent.trim()) return;
    await updateComment(routeToView.id, editingCommentId, editingContent.trim(), editingIsBeta);
    setEditingCommentId(null);
    setEditingContent('');
    setEditingIsBeta(false);
  };

  const renderStars = (value: number) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={{ color: n <= value ? '#f59e0b' : '#e6ddd0', fontSize: 16 }}>★</Text>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Frosted search bar */}
      <BlurView intensity={80} tint="systemChromeMaterialLight" style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{
          backgroundColor: 'rgba(255,251,247,0.6)',
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#8b7668', marginRight: 8, fontSize: 14 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 14, color: '#3d2817' }}
            placeholder="Search routes, setters..."
            placeholderTextColor="#8b766880"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#8b7668', fontSize: 14 }}>✕</Text>
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, color: '#8b7668' }}>
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => {
                setSortBy((prev) => (prev === 'newest' ? 'most-liked' : prev === 'most-liked' ? 'most-climbed' : 'newest'));
              }}
            >
              <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '500' }}>
                Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'most-liked' ? 'Most Liked' : 'Most Climbed'} ▾
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowWallPicker(true)}>
              <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '500' }}>
                {selectedWall?.name || 'All Walls'} ▾
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Route List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b6f47" />
          <Text style={{ fontSize: 14, color: '#8b7668', marginTop: 12 }}>Loading routes...</Text>
        </View>
      ) : sortedRoutes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          {searchQuery ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3d2817', marginBottom: 4 }}>No routes found</Text>
              <Text style={{ fontSize: 14, color: '#8b7668', textAlign: 'center' }}>Try adjusting your search</Text>
            </>
          ) : (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(74,124,89,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 32 }}>🧗</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3d2817', marginBottom: 4 }}>Create your first route</Text>
              <Text style={{ fontSize: 14, color: '#8b7668', textAlign: 'center', marginBottom: 24 }}>
                Tap holds on your wall to build climbing routes
              </Text>
              <Pressable
                style={{ backgroundColor: '#8b6f47', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                onPress={() => router.push('/(tabs)/editor')}
              >
                <Text style={{ color: '#fffbf7', fontWeight: '600' }}>Create Route</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(230,221,208,0.4)' }}>
                {Object.entries(HOLD_COLORS).map(([type, color]) => (
                  <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ backgroundColor: color, width: 10, height: 10, borderRadius: 5 }} />
                    <Text style={{ fontSize: 12, color: '#8b7668', textTransform: 'capitalize' }}>{type}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={sortedRoutes}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <RouteRow
              route={item}
              isLast={index === sortedRoutes.length - 1}
              wallName={getWallById(item.wall_id)?.name}
              onPress={() => setRouteToViewId(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b6f47" />
          }
        />
      )}

      {/* FAB — frosted glass */}
      {filteredRoutes.length > 0 && (
        <Pressable
          style={{
            position: 'absolute', bottom: 24, right: 20,
            width: 56, height: 56, borderRadius: 28,
            overflow: 'hidden',
            shadowColor: '#8b6f47', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
          }}
          onPress={() => router.push('/(tabs)/editor')}
          className="active:opacity-80"
        >
          <BlurView intensity={90} tint="systemChromeMaterialLight" style={{
            flex: 1, alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(139,111,71,0.85)',
          }}>
            <Text style={{ color: '#fffbf7', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
          </BlurView>
        </Pressable>
      )}

      <Modal visible={showWallPicker} animationType="slide" onRequestClose={() => setShowWallPicker(false)}>
        <View className="flex-1 bg-background">
          <View className="px-5 pt-6 pb-4 border-b border-border">
            <Text className="text-lg font-semibold text-foreground">Select Wall</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Pressable
              style={{
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: activeWallId === 'all-walls' ? '#8b6f47' : '#e6ddd0',
                backgroundColor: activeWallId === 'all-walls' ? 'rgba(139,111,71,0.08)' : '#fffbf7',
                marginBottom: 10,
              }}
              onPress={() => {
                setSelectedWall({
                  id: 'all-walls',
                  user_id: 'system',
                  name: 'All Walls',
                  image_url: '',
                  image_width: 0,
                  image_height: 0,
                  is_public: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                setShowWallPicker(false);
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#3d2817' }}>All Walls</Text>
              <Text style={{ fontSize: 12, color: '#8b7668', marginTop: 4 }}>
                {routes.length} routes
              </Text>
            </Pressable>

            {walls.map((wall) => (
              <Pressable
                key={wall.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: activeWallId === wall.id ? '#8b6f47' : '#e6ddd0',
                  backgroundColor: activeWallId === wall.id ? 'rgba(139,111,71,0.08)' : '#fffbf7',
                  marginBottom: 10,
                }}
                onPress={() => {
                  setSelectedWall(wall);
                  setShowWallPicker(false);
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#3d2817' }} numberOfLines={1}>
                  {wall.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#8b7668', marginTop: 4 }}>
                  {routes.filter((r) => r.wall_id === wall.id).length} routes
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!routeToView} animationType="slide" onRequestClose={() => setRouteToViewId(null)}>
        {routeToView && (
          <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View
              className="px-5 pb-4 border-b border-border flex-row items-center justify-between"
              style={{ paddingTop: 8 }}
            >
              <Text className="text-lg font-semibold text-foreground">Route</Text>
              <Pressable onPress={() => setRouteToViewId(null)}>
                <Text className="text-primary font-medium">Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              <View className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
                {(() => {
                  const wall = getWallById(routeToView.wall_id);
                  const imageUrl = routeToView.wall_image_url || wall?.image_url;
                  return imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: '100%', height: 200 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ede5d8' }}>
                      <Text style={{ color: '#8b7668' }}>No wall image</Text>
                    </View>
                  );
                })()}
              </View>

              <Text style={{ fontSize: 20, fontWeight: '700', color: '#3d2817' }}>{routeToView.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                {routeToView.grade_v ? (
                  <Text style={{ fontSize: 14, color: '#8b6f47', fontWeight: '600' }}>{routeToView.grade_v}</Text>
                ) : null}
                <Text style={{ fontSize: 12, color: '#8b7668' }}>
                  {getWallById(routeToView.wall_id)?.name || 'Unknown wall'}
                </Text>
              </View>

              {routeToView.user_name && (
                <Text style={{ fontSize: 13, color: '#8b7668', marginTop: 6 }}>
                  Set by {routeToView.user_name}
                </Text>
              )}

              <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e6ddd0', padding: 12, backgroundColor: '#fffbf7' }}>
                <Text style={{ fontSize: 12, color: '#8b7668', marginBottom: 6 }}>Stats</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#3d2817' }}>{routeToView.holds.length}</Text>
                    <Text style={{ fontSize: 11, color: '#8b7668' }}>Holds</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#3d2817' }}>{routeToView.like_count || 0}</Text>
                    <Text style={{ fontSize: 11, color: '#8b7668' }}>Likes</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#3d2817' }}>{routeToView.ascents?.length || 0}</Text>
                    <Text style={{ fontSize: 11, color: '#8b7668' }}>Sends</Text>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  {(() => {
                    const ascents = routeToView.ascents || [];
                    const ratings = ascents.filter((a) => a.rating).map((a) => a.rating as number);
                    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {renderStars(Math.round(avg))}
                        <Text style={{ fontSize: 12, color: '#8b7668' }}>{avg > 0 ? avg.toFixed(1) : 'No ratings'}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e6ddd0', paddingVertical: 10, alignItems: 'center', backgroundColor: '#fffbf7' }}
                  onPress={() => toggleLike(routeToView.id)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#8b6f47' }}>
                    {routeToView.is_liked ? 'Liked' : 'Like'}
                  </Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e6ddd0', paddingVertical: 10, alignItems: 'center', backgroundColor: '#fffbf7' }}
                  onPress={() => setShowLogModal(true)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#8b6f47' }}>Log Send</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e6ddd0', paddingVertical: 10, alignItems: 'center', backgroundColor: '#fffbf7' }}
                  onPress={() => handleShare(routeToView)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#8b6f47' }}>Share</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8b7668' }}>Beta</Text>
                  <Pressable onPress={() => refreshRouteComments(routeToView.id)}>
                    <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '600' }}>Refresh</Text>
                  </Pressable>
                </View>
                {(routeToView.comments || []).filter((c) => c.is_beta).length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#8b7668' }}>No beta yet.</Text>
                ) : (
                  (routeToView.comments || []).filter((c) => c.is_beta).map((comment) => {
                    const isOwner = comment.user_id === (user?.id || 'local-user');
                    return (
                      <View key={comment.id} style={{ borderWidth: 1, borderColor: '#e6ddd0', borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: '#fffbf7' }}>
                        <Text style={{ fontSize: 13, color: '#3d2817' }}>{comment.content}</Text>
                        <Text style={{ fontSize: 11, color: '#8b7668', marginTop: 6 }}>
                          {comment.user_name || 'Anonymous'} • {formatTimeAgo(comment.created_at)}
                        </Text>
                        {isOwner && (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <Pressable onPress={() => startEditComment(comment.id, comment.content, true)}>
                              <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '600' }}>Edit</Text>
                            </Pressable>
                            <Pressable onPress={() => deleteComment(routeToView.id, comment.id)}>
                              <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>Delete</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8b7668', marginBottom: 8 }}>Comments</Text>
                {(routeToView.comments || []).filter((c) => !c.is_beta).length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#8b7668' }}>No comments yet.</Text>
                ) : (
                  (routeToView.comments || []).filter((c) => !c.is_beta).map((comment) => {
                    const isOwner = comment.user_id === (user?.id || 'local-user');
                    return (
                      <View key={comment.id} style={{ borderWidth: 1, borderColor: '#e6ddd0', borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: '#fffbf7' }}>
                        <Text style={{ fontSize: 13, color: '#3d2817' }}>{comment.content}</Text>
                        <Text style={{ fontSize: 11, color: '#8b7668', marginTop: 6 }}>
                          {comment.user_name || 'Anonymous'} • {formatTimeAgo(comment.created_at)}
                        </Text>
                        {isOwner && (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <Pressable onPress={() => startEditComment(comment.id, comment.content, false)}>
                              <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '600' }}>Edit</Text>
                            </Pressable>
                            <Pressable onPress={() => deleteComment(routeToView.id, comment.id)}>
                              <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>Delete</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e6ddd0', padding: 12, backgroundColor: '#fffbf7' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8b7668', marginBottom: 8 }}>Add a comment</Text>
                <TextInput
                  placeholder="Share beta or feedback"
                  placeholderTextColor="#8b7668"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  className="border border-border bg-card rounded-xl px-4 py-3 text-foreground"
                  style={{ minHeight: 80 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Pressable
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: commentIsBeta ? '#8b6f47' : '#e6ddd0',
                      backgroundColor: commentIsBeta ? 'rgba(139,111,71,0.1)' : '#fffbf7',
                    }}
                    onPress={() => setCommentIsBeta((v) => !v)}
                  >
                    <Text style={{ fontSize: 12, color: '#3d2817', fontWeight: '600' }}>
                      {commentIsBeta ? 'Beta' : 'Mark as Beta'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: '#8b6f47',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                    onPress={handleAddComment}
                  >
                    <Text style={{ color: '#fffbf7', fontWeight: '600' }}>Post</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      <Modal visible={showLogModal} animationType="slide" onRequestClose={() => setShowLogModal(false)}>
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          <View
            className="px-5 pb-4 border-b border-border flex-row items-center justify-between"
            style={{ paddingTop: 8 }}
          >
            <Text className="text-lg font-semibold text-foreground">Log Send</Text>
            <Pressable onPress={() => setShowLogModal(false)}>
              <Text className="text-primary font-medium">Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={{ fontSize: 12, color: '#8b7668', marginBottom: 8 }}>Rating</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((r) => (
                <Pressable key={r} onPress={() => setLogRating(r)}>
                  <Text style={{ color: (logRating || 0) >= r ? '#f59e0b' : '#e6ddd0', fontSize: 22 }}>★</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setLogRating(null)}>
                <Text style={{ color: '#8b7668', fontSize: 12, marginLeft: 6 }}>Clear</Text>
              </Pressable>
            </View>

            <Pressable
              style={{
                borderWidth: 1,
                borderColor: logFlashed ? '#8b6f47' : '#e6ddd0',
                backgroundColor: logFlashed ? 'rgba(139,111,71,0.1)' : '#fffbf7',
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 16,
              }}
              onPress={() => setLogFlashed((v) => !v)}
            >
              <Text style={{ color: '#3d2817', fontWeight: '600' }}>{logFlashed ? 'Flashed' : 'Mark as Flash'}</Text>
            </Pressable>

            <Text style={{ fontSize: 12, color: '#8b7668', marginBottom: 6 }}>Notes</Text>
            <TextInput
              placeholder="Optional notes"
              placeholderTextColor="#8b7668"
              value={logNote}
              onChangeText={setLogNote}
              multiline
              className="border border-border bg-card rounded-xl px-4 py-3 text-foreground"
              style={{ minHeight: 80 }}
            />

            <Pressable
              style={{ marginTop: 20, backgroundColor: '#8b6f47', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={handleLogSend}
            >
              <Text style={{ color: '#fffbf7', fontWeight: '600' }}>Save</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!editingCommentId} animationType="slide" onRequestClose={() => setEditingCommentId(null)}>
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          <View
            className="px-5 pb-4 border-b border-border flex-row items-center justify-between"
            style={{ paddingTop: 8 }}
          >
            <Text className="text-lg font-semibold text-foreground">Edit Comment</Text>
            <Pressable onPress={() => setEditingCommentId(null)}>
              <Text className="text-primary font-medium">Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <TextInput
              placeholder="Update your comment"
              placeholderTextColor="#8b7668"
              value={editingContent}
              onChangeText={setEditingContent}
              multiline
              className="border border-border bg-card rounded-xl px-4 py-3 text-foreground"
              style={{ minHeight: 100 }}
            />
            <Pressable
              style={{
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: editingIsBeta ? '#8b6f47' : '#e6ddd0',
                backgroundColor: editingIsBeta ? 'rgba(139,111,71,0.1)' : '#fffbf7',
                alignSelf: 'flex-start',
              }}
              onPress={() => setEditingIsBeta((v) => !v)}
            >
              <Text style={{ fontSize: 12, color: '#3d2817', fontWeight: '600' }}>
                {editingIsBeta ? 'Beta' : 'Mark as Beta'}
              </Text>
            </Pressable>
            <Pressable
              style={{ marginTop: 16, backgroundColor: '#8b6f47', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={handleSaveEdit}
            >
              <Text style={{ color: '#fffbf7', fontWeight: '600' }}>Save</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

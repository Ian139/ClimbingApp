import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
  HOLD_COLORS,
  type Route,
  type Hold,
} from '@climbset/shared';
import { calculateDisplayGrade } from '@climbset/shared';
import { useRoutesStore } from '../../lib/stores/routes-store';

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

function RouteRow({ route, isLast }: { route: Route; isLast: boolean }) {
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
  const { routes, isLoading, fetchRoutes } = useRoutesStore();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  };

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase();
    return routes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.grade_v?.toLowerCase().includes(q) || r.user_name?.toLowerCase().includes(q)
    );
  }, [routes, searchQuery]);

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
          <Pressable>
            <Text style={{ fontSize: 12, color: '#8b6f47', fontWeight: '500' }}>Home Wall ▾</Text>
          </Pressable>
        </View>
      </BlurView>

      {/* Route List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b6f47" />
          <Text style={{ fontSize: 14, color: '#8b7668', marginTop: 12 }}>Loading routes...</Text>
        </View>
      ) : filteredRoutes.length === 0 ? (
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
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <RouteRow route={item} isLast={index === filteredRoutes.length - 1} />
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
    </View>
  );
}

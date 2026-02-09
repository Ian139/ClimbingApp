import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  HOLD_COLORS,
  V_GRADES,
  type Route,
  type Hold,
} from '@climbset/shared';
import { calculateDisplayGrade } from '@climbset/shared';

// Mock routes for development — will be replaced by Supabase stores
const MOCK_ROUTES: Route[] = [
  {
    id: '1',
    user_id: 'local',
    user_name: 'You',
    wall_id: 'default-wall',
    name: 'Crimpy Corner',
    grade_v: 'V3',
    holds: [
      { id: 'h1', x: 30, y: 80, type: 'start', color: HOLD_COLORS.start, sequence: null, size: 'medium' },
      { id: 'h2', x: 40, y: 60, type: 'hand', color: HOLD_COLORS.hand, sequence: null, size: 'medium' },
      { id: 'h3', x: 35, y: 40, type: 'hand', color: HOLD_COLORS.hand, sequence: null, size: 'small' },
      { id: 'h4', x: 50, y: 50, type: 'foot', color: HOLD_COLORS.foot, sequence: null, size: 'small' },
      { id: 'h5', x: 45, y: 20, type: 'finish', color: HOLD_COLORS.finish, sequence: null, size: 'medium' },
    ],
    is_public: true,
    view_count: 12,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    like_count: 3,
    ascents: [{ id: 'a1', route_id: '1', user_id: 'u1', user_name: 'Alex', grade_v: 'V3', rating: 4, created_at: new Date().toISOString() }],
  },
  {
    id: '2',
    user_id: 'local',
    user_name: 'You',
    wall_id: 'default-wall',
    name: 'Dyno Dash',
    grade_v: 'V5',
    holds: [
      { id: 'h6', x: 20, y: 85, type: 'start', color: HOLD_COLORS.start, sequence: null, size: 'large' },
      { id: 'h7', x: 60, y: 50, type: 'hand', color: HOLD_COLORS.hand, sequence: null, size: 'medium' },
      { id: 'h8', x: 50, y: 15, type: 'finish', color: HOLD_COLORS.finish, sequence: null, size: 'large' },
    ],
    is_public: true,
    view_count: 8,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    like_count: 7,
  },
  {
    id: '3',
    user_id: 'local',
    user_name: 'You',
    wall_id: 'default-wall',
    name: 'Slab Master',
    grade_v: 'V1',
    holds: [
      { id: 'h9', x: 45, y: 90, type: 'start', color: HOLD_COLORS.start, sequence: null, size: 'medium' },
      { id: 'h10', x: 40, y: 70, type: 'foot', color: HOLD_COLORS.foot, sequence: null, size: 'small' },
      { id: 'h11', x: 50, y: 50, type: 'hand', color: HOLD_COLORS.hand, sequence: null, size: 'medium' },
      { id: 'h12', x: 48, y: 30, type: 'hand', color: HOLD_COLORS.hand, sequence: null, size: 'medium' },
      { id: 'h13', x: 55, y: 55, type: 'foot', color: HOLD_COLORS.foot, sequence: null, size: 'small' },
      { id: 'h14', x: 47, y: 10, type: 'finish', color: HOLD_COLORS.finish, sequence: null, size: 'medium' },
    ],
    is_public: true,
    view_count: 24,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 604800000).toISOString(),
    like_count: 5,
    ascents: [
      { id: 'a2', route_id: '3', user_id: 'u2', user_name: 'Sam', grade_v: 'V1', rating: 5, created_at: new Date().toISOString() },
      { id: 'a3', route_id: '3', user_id: 'u3', user_name: 'Jordan', grade_v: 'V2', rating: 4, created_at: new Date().toISOString() },
    ],
  },
];

function HoldDots({ holds }: { holds: Hold[] }) {
  const typeCounts: Record<string, number> = {};
  holds.forEach((h) => {
    typeCounts[h.type] = (typeCounts[h.type] || 0) + 1;
  });

  return (
    <View className="flex-row items-center gap-1">
      {Object.entries(typeCounts).map(([type, count]) => (
        <View key={type} className="flex-row items-center gap-0.5">
          <View
            style={{ backgroundColor: HOLD_COLORS[type as keyof typeof HOLD_COLORS] }}
            className="w-2 h-2 rounded-full"
          />
          <Text className="text-[10px] text-gray-400">{count}</Text>
        </View>
      ))}
    </View>
  );
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return null;

  const num = V_GRADES.indexOf(grade);
  let bg = 'bg-green-100';
  let text = 'text-green-700';
  if (num >= 10) { bg = 'bg-red-100'; text = 'text-red-700'; }
  else if (num >= 7) { bg = 'bg-orange-100'; text = 'text-orange-700'; }
  else if (num >= 4) { bg = 'bg-yellow-100'; text = 'text-yellow-700'; }
  else if (num >= 2) { bg = 'bg-blue-100'; text = 'text-blue-700'; }

  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-bold ${text}`}>{grade}</Text>
    </View>
  );
}

function RouteCard({ route }: { route: Route }) {
  const displayGrade = calculateDisplayGrade(route.grade_v, route.ascents);
  const sendCount = route.ascents?.length || 0;
  const timeAgo = getTimeAgo(route.created_at);

  return (
    <Pressable className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 active:bg-gray-50">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {route.name}
            </Text>
            <GradeBadge grade={displayGrade} />
          </View>

          <View className="flex-row items-center gap-3">
            <HoldDots holds={route.holds} />
            <Text className="text-xs text-gray-400">
              {route.holds.length} holds
            </Text>
            {sendCount > 0 && (
              <Text className="text-xs text-gray-400">
                {sendCount} {sendCount === 1 ? 'send' : 'sends'}
              </Text>
            )}
          </View>
        </View>

        <View className="items-end">
          <View className="flex-row items-center gap-1 mb-1">
            <Text className="text-xs text-gray-400">♥</Text>
            <Text className="text-xs text-gray-400">{route.like_count || 0}</Text>
          </View>
          <Text className="text-[10px] text-gray-300">{timeAgo}</Text>
        </View>
      </View>

      {route.user_name && (
        <Text className="text-xs text-gray-400 mt-1">
          Set by {route.user_name}
        </Text>
      )}
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
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  const routes = MOCK_ROUTES;

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase();
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.grade_v?.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q)
    );
  }, [routes, searchQuery]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="px-4 pt-2 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search routes, setters..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-gray-400 text-sm">✕</Text>
            </Pressable>
          )}
        </View>

        {/* Stats row */}
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-gray-400">
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
          </Text>
          <Pressable>
            <Text className="text-xs text-gray-400">Home Wall ▾</Text>
          </Pressable>
        </View>
      </View>

      {/* Route List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ef4444" />
          <Text className="text-sm text-gray-400 mt-3">Loading routes...</Text>
        </View>
      ) : filteredRoutes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          {searchQuery ? (
            <>
              <Text className="text-lg font-semibold text-gray-900 mb-1">No routes found</Text>
              <Text className="text-sm text-gray-400 text-center">
                Try adjusting your search
              </Text>
            </>
          ) : (
            <>
              <View className="w-20 h-20 rounded-2xl bg-red-50 items-center justify-center mb-4">
                <Text className="text-3xl">🧗</Text>
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-1">Create your first route</Text>
              <Text className="text-sm text-gray-400 text-center mb-6">
                Tap holds on your wall to build climbing routes
              </Text>
              <Pressable
                className="bg-red-500 rounded-xl px-6 py-3 active:bg-red-600"
                onPress={() => router.push('/(tabs)/editor')}
              >
                <Text className="text-white font-semibold">Create Route</Text>
              </Pressable>

              {/* Hold type legend */}
              <View className="flex-row gap-4 mt-8 pt-6 border-t border-gray-100">
                {Object.entries(HOLD_COLORS).map(([type, color]) => (
                  <View key={type} className="flex-row items-center gap-1.5">
                    <View style={{ backgroundColor: color }} className="w-2.5 h-2.5 rounded-full" />
                    <Text className="text-xs text-gray-400 capitalize">{type}</Text>
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
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => <RouteCard route={item} />}
        />
      )}

      {/* FAB — New Route */}
      {filteredRoutes.length > 0 && (
        <Pressable
          className="absolute bottom-6 right-5 w-14 h-14 bg-red-500 rounded-full items-center justify-center shadow-lg active:bg-red-600"
          style={{ elevation: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          onPress={() => router.push('/(tabs)/editor')}
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </Pressable>
      )}
    </View>
  );
}

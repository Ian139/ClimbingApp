import { useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { HOLD_COLORS, type HoldType } from '@climbset/shared';
import { useRoutesStore } from '../../lib/stores/routes-store';
import { useUserStore } from '../../lib/stores/user-store';

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={{
      flex: 1, borderRadius: 16, padding: 16, overflow: 'hidden',
      backgroundColor: 'rgba(255,251,247,0.6)',
    }}>
      <Text
        style={{
          fontSize: 24, fontWeight: '700', color: accent || '#3d2817',
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: '#8b7668', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function ProgressBar({ color, percentage }: { color: string; percentage: number }) {
  return (
    <View style={{ height: 6, backgroundColor: '#ede5d8', borderRadius: 3, overflow: 'hidden' }}>
      <View
        style={{ backgroundColor: color, width: `${percentage}%`, height: '100%', borderRadius: 3 }}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const routes = useRoutesStore((s) => s.routes);
  const { user, profile, isAuthenticated, syncProfile } = useUserStore();

  useEffect(() => {
    if (isAuthenticated) {
      syncProfile();
    }
  }, [isAuthenticated, syncProfile]);

  const stats = useMemo(() => {
    const allHolds = routes.flatMap(r => r.holds || []);
    const holdUsage: Record<string, number> = { start: 0, hand: 0, foot: 0, finish: 0 };
    allHolds.forEach(h => { holdUsage[h.type] = (holdUsage[h.type] || 0) + 1; });

    const grades = routes
      .map(r => r.grade_v)
      .filter(Boolean)
      .map(g => {
        const num = parseInt(g!.replace('V', ''), 10);
        return isNaN(num) ? null : num;
      })
      .filter((n): n is number => n !== null);

    const avgGrade = grades.length > 0 ? `V${Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)}` : '—';
    const hardestSend = grades.length > 0 ? `V${Math.max(...grades)}` : '—';
    const totalAscents = routes.reduce((sum, r) => sum + (r.ascents?.length || 0), 0);
    const totalLikes = routes.reduce((sum, r) => sum + (r.like_count || 0), 0);

    return {
      routesSet: routes.length,
      totalHolds: allHolds.length,
      avgGrade,
      hardestSend,
      totalAscents,
      totalLikes,
      holdUsage,
    };
  }, [routes]);

  const totalHoldCount = Object.values(stats.holdUsage).reduce((s, v) => s + v, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f1e8' }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Profile Header — frosted glass */}
      <BlurView intensity={60} tint="systemChromeMaterialLight" style={{
        paddingHorizontal: 16, paddingTop: 24, paddingBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(74,124,89,0.12)',
            overflow: 'hidden',
          }}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 64, height: 64 }} />
            ) : (
              <Text style={{ fontSize: 28 }}>🧗</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#3d2817' }}>
              {profile?.full_name || user?.displayName || 'Climber'}
            </Text>
            <Text style={{ fontSize: 14, color: '#8b7668', marginTop: 2 }}>
              {profile?.username ? `@${profile.username}` : 'Local setter'}
            </Text>
            {user?.email ? (
              <Text style={{ fontSize: 12, color: '#8b7668', marginTop: 2 }}>{user.email}</Text>
            ) : null}
          </View>
          <Pressable
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
              backgroundColor: 'rgba(240,232,223,0.7)',
            }}
            onPress={() => router.push('/settings')}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#3d2817' }}>Settings</Text>
          </Pressable>
        </View>
      </BlurView>

      {/* Stats Grid */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#8b7668', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Your Stats
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard label="Routes Set" value={stats.routesSet} accent="#8b6f47" />
          <StatCard label="Total Holds" value={stats.totalHolds} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard label="Avg Grade" value={stats.avgGrade} accent="#f59e0b" />
          <StatCard label="Hardest Send" value={stats.hardestSend} accent="#dc2626" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label="Ascents" value={stats.totalAscents} />
          <StatCard label="Likes Received" value={stats.totalLikes} accent="#4a7c59" />
        </View>
      </View>

      {/* Hold Usage Breakdown */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#8b7668', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Hold Usage
        </Text>
        <View style={{ backgroundColor: 'rgba(255,251,247,0.6)', borderRadius: 16, padding: 16 }}>
          {(Object.keys(stats.holdUsage) as HoldType[]).map((type, i) => {
            const count = stats.holdUsage[type];
            const pct = totalHoldCount > 0 ? Math.round((count / totalHoldCount) * 100) : 0;
            const color = HOLD_COLORS[type];
            const isLast = i === Object.keys(stats.holdUsage).length - 1;
            return (
              <View key={type} style={isLast ? undefined : { marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{ backgroundColor: color, width: 10, height: 10, borderRadius: 5 }}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#3d2817', textTransform: 'capitalize' }}>
                      {type}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#8b7668' }}>
                    {count} ({pct}%)
                  </Text>
                </View>
                <ProgressBar color={color} percentage={pct} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#8b7668', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Recent Activity
        </Text>
        <View style={{ backgroundColor: 'rgba(255,251,247,0.6)', borderRadius: 16, overflow: 'hidden' }}>
          {routes.slice(0, 5).map((route, i) => {
            const icon = '✏️';
            const grade = route.grade_v ? ` (${route.grade_v})` : '';
            const text = `Created "${route.name}"${grade}`;
            const time = getTimeAgo(route.created_at);
            return { icon, text, time };
          }).map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: i < Math.min(routes.length, 5) - 1 ? 1 : 0,
                borderBottomColor: 'rgba(230,221,208,0.3)',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: 'rgba(240,232,223,0.6)',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#3d2817' }}>{item.text}</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#8b7668' }}>{item.time}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#8b7668', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Quick Actions
        </Text>

        <Pressable
          style={{
            backgroundColor: 'rgba(255,251,247,0.6)', borderRadius: 16,
            padding: 16, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 8,
          }}
          onPress={() => router.push('/(tabs)/editor')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(139,111,71,0.08)',
            }}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#3d2817' }}>Create New Route</Text>
              <Text style={{ fontSize: 12, color: '#8b7668' }}>Place holds on your wall</Text>
            </View>
          </View>
          <Text style={{ color: '#8b7668', fontSize: 18 }}>›</Text>
        </Pressable>

        <Pressable
          style={{
            backgroundColor: 'rgba(255,251,247,0.6)', borderRadius: 16,
            padding: 16, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() => router.push('/settings')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: 'rgba(240,232,223,0.6)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#3d2817' }}>Settings</Text>
              <Text style={{ fontSize: 12, color: '#8b7668' }}>Account, walls, preferences</Text>
            </View>
          </View>
          <Text style={{ color: '#8b7668', fontSize: 18 }}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

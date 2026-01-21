'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useRoutesStore } from '@/lib/stores/routes-store';
import { V_GRADES } from '@/lib/types';
import { cn } from '@/lib/utils';

// Grade to numeric value for sorting
const gradeToNumber = (grade?: string): number => {
  if (!grade) return -1;
  const index = V_GRADES.indexOf(grade);
  return index >= 0 ? index : -1;
};

export default function ProfilePage() {
  const { user, displayName, userId, isAuthenticated } = useUserStore();
  const { routes, fetchRoutes } = useRoutesStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchRoutes();
  }, [fetchRoutes]);

  // Calculate user stats
  const stats = useMemo(() => {
    const currentUserId = userId || 'local-user';

    // Routes created by user
    const userRoutes = routes.filter(r => r.user_id === currentUserId);

    // All ascents by user across all routes
    const userAscents = routes.flatMap(r =>
      (r.ascents || []).filter(a => a.user_id === currentUserId)
    );

    // Flash count and rate
    const flashedAscents = userAscents.filter(a => a.flashed);
    const flashRate = userAscents.length > 0
      ? (flashedAscents.length / userAscents.length) * 100
      : 0;

    // Grade distribution (pyramid)
    const gradeDistribution: Record<string, number> = {};
    userAscents.forEach(a => {
      const grade = a.grade_v;
      if (grade) {
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      }
    });

    // Sort grades and get max count for scaling
    const sortedGrades = Object.entries(gradeDistribution)
      .sort((a, b) => gradeToNumber(a[0]) - gradeToNumber(b[0]));
    const maxCount = Math.max(...Object.values(gradeDistribution), 1);

    // Recent activity (last 10 ascents)
    const recentActivity = userAscents
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(ascent => {
        const route = routes.find(r => r.id === ascent.route_id);
        return {
          ...ascent,
          routeName: route?.name || 'Unknown Route',
          routeGrade: route?.grade_v,
        };
      });

    // Highest grade sent
    const highestGrade = userAscents
      .map(a => a.grade_v)
      .filter(Boolean)
      .sort((a, b) => gradeToNumber(b) - gradeToNumber(a))[0];

    return {
      totalSends: userAscents.length,
      flashCount: flashedAscents.length,
      flashRate,
      routesCreated: userRoutes.length,
      gradeDistribution: sortedGrades,
      maxCount,
      recentActivity,
      highestGrade,
    };
  }, [routes, userId]);

  if (!mounted) return null;

  return (
    <div className="min-h-dvh bg-background pb-28 md:pb-8">
      {/* Header */}
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Profile</h1>
          </div>

          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="px-4 md:px-8 space-y-6">
        {/* User Info Card */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? user?.email : 'Guest climber'}
              </p>
              {user?.createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalSends}</p>
            <p className="text-xs text-muted-foreground">Sends</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <p className="text-2xl font-bold text-secondary">
              {stats.flashRate > 0 ? `${Math.round(stats.flashRate)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Flash Rate</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <p className="text-2xl font-bold">{stats.routesCreated}</p>
            <p className="text-xs text-muted-foreground">Routes Set</p>
          </div>
        </div>

        {/* Highest Grade */}
        {stats.highestGrade && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Highest Grade</p>
                <p className="text-3xl font-bold text-primary">{stats.highestGrade}</p>
              </div>
              <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Grade Pyramid */}
        {stats.gradeDistribution.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <h3 className="font-semibold mb-4">Grade Pyramid</h3>
            <div className="space-y-2">
              {stats.gradeDistribution.map(([grade, count]) => (
                <div key={grade} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-muted-foreground">{grade}</span>
                  <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-lg transition-all duration-500"
                      style={{ width: `${(count / stats.maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-sm font-medium text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.recentActivity.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                >
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    activity.flashed ? "bg-yellow-500/20 text-yellow-500" : "bg-secondary/20 text-secondary"
                  )}>
                    {activity.flashed ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.routeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.flashed ? 'Flashed' : 'Sent'} • {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {activity.grade_v && (
                    <span className="text-sm font-bold text-primary shrink-0">{activity.grade_v}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalSends === 0 && stats.routesCreated === 0 && (
          <div className="text-center py-12">
            <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">No climbing activity yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start logging your sends to build your profile</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Browse Routes
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

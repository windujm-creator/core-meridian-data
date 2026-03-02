/**
 * useSantiment.ts — ZERØ MERIDIAN 2026 Phase 10
 * Santiment free tier — social volume, sentiment, trending topics.
 * Uses public Santiment GraphQL API (no API key for limited queries).
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialVolume {
  datetime: string;
  value:    number;
}

export interface SentimentScore {
  datetime:       string;
  sentimentScore: number;
}

export interface TrendingWord {
  word:  string;
  score: number;
}

export interface TrendingTopic {
  datetime:     string;
  topWords:     TrendingWord[];
}

export interface SantimentData {
  socialVolume:   SocialVolume[];
  sentiment:      SentimentScore[];
  trendingTopics: TrendingWord[];
  isLoading:      boolean;
  isError:        boolean;
  refetch:        () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SANTIMENT_GQL = 'https://api.santiment.net/graphql';

function buildSocialVolumeQuery(slug: string, from: string, to: string): string {
  return JSON.stringify({
    query: `{
      socialVolume(
        slug: "${slug}"
        from: "${from}"
        to: "${to}"
        interval: "1h"
        socialVolumeType: PROFESSIONAL_TRADERS_CHAT
      ) {
        datetime
        value: mentionsCount
      }
    }`,
  });
}

function buildTrendingWordsQuery(from: string, to: string): string {
  return JSON.stringify({
    query: `{
      getTrendingWords(
        from: "${from}"
        to: "${to}"
        interval: "6h"
      ) {
        datetime
        topWords {
          word
          score
        }
      }
    }`,
  });
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function getTimeRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to:   now.toISOString(),
  };
}

async function fetchSocialVolume(slug: string, signal: AbortSignal): Promise<SocialVolume[]> {
  try {
    const { from, to } = getTimeRange();
    const res = await fetch(SANTIMENT_GQL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    buildSocialVolumeQuery(slug, from, to),
      signal,
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: { socialVolume?: SocialVolume[] } };
    return json.data?.socialVolume ?? [];
  } catch {
    return [];
  }
}

async function fetchTrendingWords(signal: AbortSignal): Promise<TrendingWord[]> {
  try {
    const { from, to } = getTimeRange();
    const res = await fetch(SANTIMENT_GQL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    buildTrendingWordsQuery(from, to),
      signal,
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: { getTrendingWords?: TrendingTopic[] } };
    const items = json.data?.getTrendingWords ?? [];
    // Return latest snapshot top words
    if (items.length === 0) return [];
    return items[items.length - 1].topWords.slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSocialVolume(slug = 'bitcoin') {
  return useQuery({
    queryKey: ['santiment-social-volume', slug],
    queryFn: async ({ signal }) => {
      return fetchSocialVolume(slug, signal);
    },
    staleTime:       300_000,  // 5 min
    refetchInterval: 300_000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 20000),
  });
}

export function useTrendingWords() {
  return useQuery({
    queryKey: ['santiment-trending'],
    queryFn: async ({ signal }) => {
      return fetchTrendingWords(signal);
    },
    staleTime:       600_000,  // 10 min
    refetchInterval: 600_000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 20000),
  });
}

export function useSantiment(slug = 'bitcoin'): SantimentData {
  const svQ  = useSocialVolume(slug);
  const twQ  = useTrendingWords();

  const refetch = useMemo(() => () => {
    svQ.refetch();
    twQ.refetch();
  }, [svQ, twQ]);

  return useMemo(() => ({
    socialVolume:   svQ.data ?? [],
    sentiment:      [],  // Sentiment scoring requires paid tier — show empty
    trendingTopics: twQ.data ?? [],
    isLoading:      svQ.isLoading || twQ.isLoading,
    isError:        svQ.isError   && twQ.isError,
    refetch,
  }), [svQ.data, svQ.isLoading, svQ.isError, twQ.data, twQ.isLoading, twQ.isError, refetch]);
}

'use client';
import { useEffect } from 'react';
import { initAppAnalytics } from '@/lib/analytics';

export function AnalyticsInit() {
  useEffect(() => {
    initAppAnalytics();
  }, []);
  return null;
}

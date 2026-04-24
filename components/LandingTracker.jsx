'use client';
import { useEffect } from 'react';
import { track, EVENTS } from '@/lib/analytics';

/** Dispara landing_view una sola vez en mount. Server component wrapper-friendly. */
export default function LandingTracker() {
  useEffect(() => { track(EVENTS.LANDING_VIEW); }, []);
  return null;
}

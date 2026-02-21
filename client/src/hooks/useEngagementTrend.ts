import { useState, useEffect, useRef } from 'react';

export type EngagementState = 'up' | 'down' | 'stable' | 'calculating';

export interface UseEngagementTrendResult {
    trend: EngagementState;
    percentageChange: number;
}

export const useEngagementTrend = (
    currentViews: number,
    intervalMs: number = 60000,
    historyWindowMs: number = 300000
): UseEngagementTrendResult => {
    const [history, setHistory] = useState<{ timestamp: number; views: number }[]>([]);
    const latestViewsRef = useRef(currentViews);

    useEffect(() => {
        latestViewsRef.current = currentViews;
    }, [currentViews]);

    if (currentViews === 0 && history.length > 0) {
        setHistory([]);
    }

    useEffect(() => {
        setHistory(prev => {
            if (prev.length === 0 && latestViewsRef.current > 0) {
                return [{ timestamp: Date.now(), views: latestViewsRef.current }];
            }
            return prev;
        });

        const timerId = setInterval(() => {
            const now = Date.now();
            setHistory(prev => {
                const current = latestViewsRef.current;
                if (current === 0) return [];

                const windowStart = now - historyWindowMs;
                const newHistory = [...prev, { timestamp: now, views: current }];

                return newHistory.filter(sample => sample.timestamp >= windowStart);
            });
        }, intervalMs);

        return () => clearInterval(timerId);
    }, [intervalMs, historyWindowMs]);

    let trend: EngagementState = 'calculating';
    let percentageChange = 0;

    if (currentViews > 0 && history.length >= 2) {
        const sum = history.reduce((acc, curr) => acc + curr.views, 0);
        const average = sum / history.length;

        if (average === 0) {
            trend = 'up';
            percentageChange = 100;
        } else {
            const diff = currentViews - average;
            percentageChange = (diff / average) * 100;

            if (percentageChange >= 5) {
                trend = 'up';
            } else if (percentageChange <= -5) {
                trend = 'down';
            } else {
                trend = 'stable';
            }
        }
    }

    return { trend, percentageChange };
};
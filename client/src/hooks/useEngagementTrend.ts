import { useState, useEffect, useRef, useMemo } from 'react';

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

    const isHistoryEmpty = history.length === 0;

    useEffect(() => {
        const timerId = setTimeout(() => {
            if (currentViews === 0) {
                setHistory(prev => (prev.length > 0 ? [] : prev));
            } else if (isHistoryEmpty) {
                setHistory([{ timestamp: Date.now(), views: currentViews }]);
            }
        }, 0);

        return () => clearTimeout(timerId);
    }, [currentViews, isHistoryEmpty]);

    useEffect(() => {
        const timerId = setInterval(() => {
            const now = Date.now();
            const current = latestViewsRef.current;

            setHistory(prev => {
                if (current === 0) return prev.length > 0 ? [] : prev;

                const windowStart = now - historyWindowMs;
                const newHistory = [...prev, { timestamp: now, views: current }];

                return newHistory.filter(sample => sample.timestamp >= windowStart);
            });
        }, intervalMs);

        return () => clearInterval(timerId);
    }, [intervalMs, historyWindowMs]);

    const result = useMemo(() => {
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
    }, [currentViews, history]);

    return result;
};
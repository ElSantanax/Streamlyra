import React, { useState, useEffect } from 'react';

interface SimpleTimerProps {
    startTime: string;
    serverTime?: string;
}

export const SimpleTimer: React.FC<SimpleTimerProps> = ({ startTime, serverTime }) => {
    const [elapsed, setElapsed] = useState<string>('00:00:00');
    const driftRef = React.useRef<number>(0);

    // Actualizar el drift sin reiniciar el contador
    useEffect(() => {
        if (serverTime) {
            const srv = new Date(serverTime).getTime();
            const local = Date.now();
            if (!isNaN(srv)) {
                driftRef.current = srv - local;
            }
        }
    }, [serverTime]);

    useEffect(() => {
        const startMs = new Date(startTime).getTime();

        if (isNaN(startMs)) {
            return;
        }

        const update = () => {
            // El tiempo 'actual' sincronizado es Date.now() + drift
            const now = Date.now() + driftRef.current;
            const diff = now - startMs;

            if (diff <= 0) {
                setElapsed('00:00:00');
                return;
            }

            const totalSeconds = Math.floor(diff / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (num: number) => num.toString().padStart(2, '0');
            setElapsed(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return <>{elapsed}</>;
};

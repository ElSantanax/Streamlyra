import { Socket } from 'socket.io';
import { ActivityService } from '../../services/ActivityService';

export class ActivitySocketHandler {
    constructor(
        private activityService: ActivityService
    ) {}

    setupHandler(socket: Socket, authenticatedUserId: string) {
        socket.onAny(() => {
            if (authenticatedUserId) {
                this.activityService.recordActivity(authenticatedUserId);
            }
        });

        socket.on('heartbeat', () => {
            if (authenticatedUserId) {
                this.activityService.recordActivity(authenticatedUserId);
            }
        });
    }
}

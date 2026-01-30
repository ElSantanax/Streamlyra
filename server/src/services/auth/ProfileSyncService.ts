/** Servicio de sincronización de datos del perfil de plataforma con usuario local */

import { User } from '../../models/User.model';
import { PlatformProfile } from '../../types/index';
import { logger } from '../../utils/logger';
import { Transaction } from 'sequelize';

export class ProfileSyncService {
    async syncProfile(user: User, profile: PlatformProfile, transaction?: Transaction): Promise<void> {
        try {
            logger.info({ userId: user.id }, 'Syncing profile data');

            const updates: Partial<User> = {};

            if (profile.displayName && user.displayName !== profile.displayName) {
                updates.displayName = profile.displayName;
            }

            if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
                updates.avatarUrl = profile.avatarUrl;
            }

            if (profile.email && user.email !== profile.email) {
                updates.email = profile.email;
            }

            if (Object.keys(updates).length > 0) {
                await user.update(updates, { transaction });
                logger.info({ userId: user.id }, 'Profile synced');
            } else {
                logger.debug({ userId: user.id }, 'Profile already up to date');
            }
        } catch (error) {
            logger.error({ err: error }, 'Error syncing profile');
            throw error;
        }
    }
}

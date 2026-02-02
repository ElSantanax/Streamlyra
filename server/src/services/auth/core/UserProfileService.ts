/** Servicio de gestión de perfiles de usuario */

import { UserService } from '../../user/UserService';
import { UserProfileBuilder, UserProfileResponse } from '../UserProfileBuilder';

export class UserProfileService {
    constructor(
        private userService: UserService,
        private userProfileBuilder: UserProfileBuilder
    ) {}

    async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
        const user = await this.userService.getById(userId);
        if (!user) return null;

        return this.userProfileBuilder.buildUserProfile(user);
    }
}

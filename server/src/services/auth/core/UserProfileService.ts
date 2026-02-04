import { UserService } from '../../user/UserService';
import { AuthDTOBuilder, UserProfileResponse } from '../AuthDTOBuilder';

export class UserProfileService {
    constructor(
        private userService: UserService,
        private dtoBuilder: AuthDTOBuilder
    ) { }

    async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
        const user = await this.userService.getById(userId);
        if (!user) return null;

        return this.dtoBuilder.buildUserProfile(user);
    }
}

import { UserProfileService } from '../UserProfileService';
import { UserService } from '../../../user/UserService';
import { AuthDTOBuilder, UserProfileResponse } from '../../AuthDTOBuilder';
import { User } from '../../../../models/User.model';

jest.mock('../../../user/UserService');
jest.mock('../../AuthDTOBuilder');

describe('UserProfileService', () => {
    let service: UserProfileService;
    let mockUserService: jest.Mocked<UserService>;
    let mockDTOBuilder: jest.Mocked<AuthDTOBuilder>;

    beforeEach(() => {
        mockUserService = {
            getById: jest.fn()
        } as unknown as jest.Mocked<UserService>;

        mockDTOBuilder = {
            buildUserProfile: jest.fn()
        } as unknown as jest.Mocked<AuthDTOBuilder>;

        service = new UserProfileService(mockUserService, mockDTOBuilder);
    });

    it('debería retornar el perfil si el usuario existe', async () => {
        const mockUser = { id: 'u1' } as unknown as User;
        mockUserService.getById.mockResolvedValue(mockUser);
        mockDTOBuilder.buildUserProfile.mockReturnValue({ user: { id: 'u1' } } as unknown as UserProfileResponse);

        const result = await service.getUserProfile('u1');

        expect(result?.user.id).toBe('u1');
        expect(mockUserService.getById).toHaveBeenCalledWith('u1');
        expect(mockDTOBuilder.buildUserProfile).toHaveBeenCalledWith(mockUser);
    });

    it('debería retornar null si el usuario no existe', async () => {
        mockUserService.getById.mockResolvedValue(null);

        const result = await service.getUserProfile('u1');

        expect(result).toBeNull();
        expect(mockDTOBuilder.buildUserProfile).not.toHaveBeenCalled();
    });
});

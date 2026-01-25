import jwt from 'jsonwebtoken';
import { User } from '../../models/User.model';
import { config } from '../../config';

export class TokenService {
    static generateToken(user: User): string {
        return jwt.sign(
            { id: user.id, username: user.username },
            config.jwtSecret,
            { expiresIn: '7d' }
        );
    }
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function verifyToken(token?: string) {
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET) as Record<string, any>;
    } catch {
        return null;
    }
}

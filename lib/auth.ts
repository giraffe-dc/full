import jwt from 'jsonwebtoken';
import { type Role } from './roles';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function verifyToken(token?: string) {
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET) as Record<string, any>;
    } catch {
        return null;
    }
}

export function getRoleFromPayload(payload: Record<string, any>): Role {
    const role = payload.role as string;
    if (role === 'admin' || role === 'staff' || role === 'user' || role === 'client') {
        return role;
    }
    return 'user';
}

export function isAdmin(role: Role): boolean {
    return role === 'admin';
}

export function isStaff(role: Role): boolean {
    return role === 'staff' || role === 'user';
}

export function isClient(role: Role): boolean {
    return role === 'client';
}

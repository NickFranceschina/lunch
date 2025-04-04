// JWT Secret for token signing and verification
export const JWT_SECRET = process.env.JWT_SECRET || 'lunch-app-secret-key-dev-only';

// Token expiration time
export const JWT_EXPIRES_IN = '1d';

// Token issuer
export const JWT_ISSUER = 'lunch-app'; 
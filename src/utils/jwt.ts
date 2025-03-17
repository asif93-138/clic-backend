import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || "default_secret";
/**
 * Generate JWT Token
 * @param payload - The data to include in the token
 * @returns A signed JWT token
 */
export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions);
};

/**
 * Verify JWT Token
 * @param token - The token to verify
 * @returns The decoded token or null if invalid
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

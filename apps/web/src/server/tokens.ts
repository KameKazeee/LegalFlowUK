import { SignJWT, jwtVerify } from 'jose';

const alg = 'HS256';
function getKey() {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

export type AssignTokenPayload = {
  caseId: string;
  repId: string;
  action: 'accept';
};

export async function signAssignToken(payload: AssignTokenPayload, expiresIn = '2h') {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getKey());
}

export async function verifyAssignToken(token: string) {
  const { payload } = await jwtVerify(token, getKey(), { algorithms: [alg] });
  return payload as unknown as AssignTokenPayload & { exp?: number; iat?: number };
}

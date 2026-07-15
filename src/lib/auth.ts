import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcryptjs from "bcryptjs";
import * as OTPAuth from "otpauth";
import { isLocked, recordFailure, recordSuccess } from "./rate-limit";

// 존재하지 않는 계정으로 로그인 시도 시에도 항상 bcrypt.compare를 실행해 응답 시간으로
// 계정 존재 여부를 유추할 수 없도록 하기 위한 더미 해시 (모듈 로드 시 1회만 계산됨).
const DUMMY_PASSWORD_HASH = bcryptjs.hashSync('dummy-password-for-timing-safety', 12);

function parseDeviceName(ua: string | undefined): string {
  if (!ua) return '알 수 없는 기기';
  if (/mobile/i.test(ua)) return '모바일';
  if (/tablet|ipad/i.test(ua)) return '태블릿';
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const matched = browsers.find((b) => ua.includes(b));
  return matched ? `${matched} (데스크톱)` : '데스크톱';
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        slug: { label: "Org Slug", type: "text" },
        totp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const identifier = credentials.email.toLowerCase();
        const lockStatus = isLocked(identifier);
        if (lockStatus.locked) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: identifier },
          include: { organization: { select: { id: true, slug: true, isActive: true, plan: true, name: true, displayName: true, logoUrl: true } } },
        });

        const slug = credentials.slug?.trim() || '';

        // 계정 존재 여부와 무관하게 항상 bcrypt.compare를 실행(타이밍 사이드채널 방지) —
        // 이후 모든 조건을 한 번에 평가해 실패 사유별 응답 시간 차이를 없앤다.
        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        );

        const accountValid = !!user && user.isActive && (!user.organization || user.organization.isActive);
        const slugValid = !slug ? user?.role === 'SUPERADMIN' : user?.organization?.slug === slug;

        if (!user || !accountValid || !slugValid || !isPasswordValid) {
          recordFailure(identifier);
          return null;
        }

        // TOTP check
        if (user.totpEnabled && user.totpSecret) {
          const rawToken = (credentials.totp || '').replace(/\s/g, '');
          if (!rawToken) { recordFailure(identifier); return null; }
          const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(user.totpSecret),
          });
          const delta = totp.validate({ token: rawToken, window: 1 });
          if (delta === null) { recordFailure(identifier); return null; }
        }

        recordSuccess(identifier);

        const ip =
          (req as any)?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
          (req as any)?.headers?.['x-real-ip'] ||
          undefined;
        const ua = (req as any)?.headers?.['user-agent'];

        // persist session record + lastLoginAt
        await Promise.all([
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.userSession.create({
            data: {
              userId: user.id,
              deviceName: parseDeviceName(ua),
              ipAddress: ip,
            },
          }),
          prisma.auditLog.create({
            data: {
              organizationId: user.organizationId ?? null,
              userId: user.id,
              userEmail: user.email,
              action: 'USER_LOGIN',
              ipAddress: ip,
            },
          }),
        ]);

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId ?? undefined,
          organizationSlug: user.organization?.slug ?? undefined,
          organizationPlan: user.organization?.plan ?? undefined,
          organizationName: user.organization?.displayName || user.organization?.name || undefined,
          organizationLogo: user.organization?.logoUrl ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.organizationSlug = (user as any).organizationSlug;
        token.organizationPlan = (user as any).organizationPlan;
        token.organizationName = (user as any).organizationName;
        token.organizationLogo = (user as any).organizationLogo;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).organizationId = token.organizationId as number | undefined;
        (session.user as any).organizationSlug = token.organizationSlug as string | undefined;
        (session.user as any).organizationPlan = token.organizationPlan as string | undefined;
        (session.user as any).organizationName = token.organizationName as string | undefined;
        (session.user as any).organizationLogo = token.organizationLogo as string | undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
    updateAge: 30 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcryptjs from "bcryptjs";
import * as OTPAuth from "otpauth";

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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { organization: { select: { id: true, slug: true, isActive: true, plan: true } } },
        });

        if (!user || !user.isActive) {
          return null;
        }

        if (user.organization && !user.organization.isActive) {
          return null;
        }

        const slug = credentials.slug?.trim() || '';

        if (!slug) {
          if (user.role !== 'SUPERADMIN') return null;
        } else {
          if (user.organization?.slug !== slug) return null;
        }

        const isPasswordValid = await bcryptjs.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) return null;

        // TOTP check
        if (user.totpEnabled && user.totpSecret) {
          const rawToken = (credentials.totp || '').replace(/\s/g, '');
          if (!rawToken) return null;
          const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(user.totpSecret),
          });
          const delta = totp.validate({ token: rawToken, window: 1 });
          if (delta === null) return null;
        }

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

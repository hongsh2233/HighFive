import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcryptjs from "bcryptjs";

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { organization: { select: { id: true, slug: true, isActive: true } } },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // 조직이 비활성화된 경우 로그인 불가
        if (user.organization && !user.organization.isActive) {
          return null;
        }

        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId ?? undefined,
          organizationSlug: user.organization?.slug ?? undefined,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).organizationId = token.organizationId as number | undefined;
        (session.user as any).organizationSlug = token.organizationSlug as string | undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // 보안 정책: 로그인 후 활동 여부와 무관하게 30분 뒤 세션 절대 만료
    maxAge: 30 * 60,
    updateAge: 30 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

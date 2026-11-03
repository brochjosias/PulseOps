import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { randomInt } from 'node:crypto';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      // Quando o usuário logar com o Google, verificamos se ele já existe no Neon
      if (user.email) {
        const existing = await prisma.user.findFirst({ where: { email: user.email } });

        if (!existing) {
          const orgId = randomInt(1, 2_147_483_647);
          const userId = randomInt(1, 2_147_483_647);
          const slug = user.email.split('@')[0] + '-' + randomInt(1000, 9999);

          await prisma.organization.create({
            data: { id: orgId, name: `Org de ${user.name}`, slug },
          });
          await prisma.user.create({
            data: {
              id: userId,
              email: user.email,
              name: user.name || 'User',
              passwordHash: 'OAUTH_GOOGLE',
            },
          });
          await prisma.membership.create({
            data: { id: randomInt(1, 2_147_483_647), userId, organizationId: orgId, role: 'ADMIN' },
          });
        }
      }
      return true;
    },
  },
});

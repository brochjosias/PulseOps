import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { randomInt } from 'node:crypto';
import { generateOnboardingData } from '@/lib/onboarding'; // <-- IMPORT DO ONBOARDING

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user }) {
      try {
        if (user.email) {
          const existing = await prisma.user.findFirst({ where: { email: user.email } });

          if (!existing) {
            // 1. Cria a Organização
            const org = await prisma.organization.create({
              data: {
                id: randomInt(1, 2_147_483_647),
                name: `Org de ${user.name}`,
                slug: user.email.split('@')[0] + '-' + randomInt(1000, 9999),
              },
            });

            // 2. Cria o Usuário
            const newUser = await prisma.user.create({
              data: {
                id: randomInt(1, 2_147_483_647),
                email: user.email,
                name: user.name || 'User',
                passwordHash: 'OAUTH_GOOGLE',
              },
            });

            // 3. Cria o Vínculo (Membership)
            await prisma.membership.create({
              data: {
                id: randomInt(1, 2_147_483_647),
                userId: newUser.id,
                organizationId: org.id,
                role: 'ADMIN',
              },
            });

            // 4. Gera os dados iniciais (Produtos, Clientes, Pedidos)
            await generateOnboardingData(org.id);
          }
        }
        return true;
      } catch (error) {
        console.error('🔴 ERRO NO BANCO DURANTE LOGIN:', error);
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      // Força o redirecionamento para a nossa rota intermediária que gera os cookies
      return `${baseUrl}/api/auth/google-callback`;
    },
  },
};

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { message } = await req.json();

  // Buscamos um resumo dos dados do usuário para dar contexto à IA
  const totalPedidos = await prisma.order.count({
    where: { organizationId: session.organizationId },
  });

  const faturamento = await prisma.order.aggregate({
    where: { organizationId: session.organizationId, status: 'PAID' },
    _sum: { total: true },
  });

  const produtos = await prisma.product.count({
    where: { organizationId: session.organizationId },
  });

  const clientes = await prisma.customer.count({
    where: { organizationId: session.organizationId },
  });

  const contexto = `
    Você é o Agente PulseOps, um assistente inteligente dentro de um sistema de gestão.
    Responda de forma curta, direta, amigável e em português (Brasil).
    
    INFORMAÇÕES DO SISTEMA (Use isso se o usuário perguntar sobre a interface):
    - O sistema possui um menu lateral esquerdo (ou menu hambúrguer no celular).
    - As abas disponíveis são: Dashboard, Analytics, Pedidos, Produtos, Clientes e Configurações.
    - A lista de Clientes fica na aba "Clientes" no menu lateral.
    
    DADOS ATUAIS DA EMPRESA (Use isso para responder perguntas sobre números):
    - Total de pedidos: ${totalPedidos}
    - Faturamento total: R$ ${faturamento._sum.total || 0}
    - Total de produtos: ${produtos}
    - Total de clientes: ${clientes}
    
    Se o usuário perguntar algo que você não tem o dado exato, diga que ainda não tem acesso a essa métrica específica, mas tente ajudá-lo com o que você sabe do sistema.
  `;

  // Mantivemos a sua ordem de preferência
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

  let reply = 'Desculpe, estou com muita demanda agora. Tente novamente em alguns instantes.';

  for (const modelName of modelsToTry) {
    try {
      // Cria uma promessa que "explode" se demorar mais de 10 segundos
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000),
      );

      const fetchPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: contexto + '\n\nPergunta do usuário: ' + message }] },
        ],
        config: {
          maxOutputTokens: 150,
          temperature: 0.2,
        },
      });

      // Corrida: quem terminar primeiro (a resposta ou o timeout) vence
      const response: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (response?.text) {
        reply = response.text;
        break; // Se deu certo, para o loop e usa essa resposta
      }
    } catch (error: any) {
      // Se der erro (inclusive o erro de Timeout), cai no catch e tenta o próximo modelo
      console.error(`Erro/Timeout no modelo ${modelName}:`, error?.message || error);
    }
  }

  return NextResponse.json({ reply });
}

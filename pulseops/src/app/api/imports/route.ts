import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import Papa from 'papaparse';
import { requireRole } from '@/lib/rbac-guard';
import { withSession } from '@/lib/http';
import { createJob, importQueue, updateJob, listJobs } from '@/lib/queue';
import { prisma } from '@/lib/prisma';
import { safeAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { session, error } = await requireRole('MANAGER');
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const entity = formData.get('entity') as 'products' | 'customers';

  if (!file || !entity)
    return NextResponse.json({ message: 'Arquivo ou tipo ausente' }, { status: 400 });

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0)
    return NextResponse.json({ message: 'Erro ao ler o CSV' }, { status: 400 });

  const job = createJob({
    id: randomUUID(),
    organizationId: session.organizationId,
    userId: session.userId,
    filename: file.name,
    entity,
  });

  importQueue.add(async () => {
    updateJob(job.id, { status: 'processing' });

    const rows = parsed.data as Record<string, string>[];
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (entity === 'products') {
          if (!row.name || !row.sku || !row.price) throw new Error('Campos obrigatórios ausentes');

          const exists = await prisma.product.findFirst({
            where: { organizationId: session.organizationId, sku: row.sku },
          });

          if (exists) {
            skipped++;
          } else {
            await prisma.product.create({
              data: {
                organizationId: session.organizationId,
                name: row.name,
                sku: row.sku,
                price: Number(row.price),
                active: 1,
              } as any,
            });
            inserted++;
          }
        } else {
          if (!row.name) throw new Error('Nome é obrigatório');
          await prisma.customer.create({
            data: {
              organizationId: session.organizationId,
              name: row.name,
              email: row.email || null,
              document: row.document || null,
            } as any, // <-- ADICIONE ISSO
          });
          inserted++;
        }
      } catch (err) {
        errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'Erro'}`);
      }

      if (i % 10 === 0 || i === rows.length - 1) {
        updateJob(job.id, { processed: i + 1, inserted, skipped, errors });
      }
    }

    updateJob(job.id, { status: 'done', finishedAt: Date.now() });

    await safeAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: `import.${entity}`,
      entity,
      metadata: { filename: file.name, inserted, skipped, errors: errors.length },
    });
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;
  return NextResponse.json(listJobs(session.organizationId));
}

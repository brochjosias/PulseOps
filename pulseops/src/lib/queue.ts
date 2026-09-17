import PQueue from 'p-queue';

export const importQueue = new PQueue({
  concurrency: 2,
});

export type ImportJob = {
  id: string;
  organizationId: number;
  userId: number;
  filename: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  processed: number;
  inserted: number;
  skipped: number;
  errors: string[];
  createdAt: number;
  finishedAt?: number;
};

const jobs = new Map<string, ImportJob>();

export function createJob(
  partial: Omit<
    ImportJob,
    'status' | 'processed' | 'inserted' | 'skipped' | 'errors' | 'createdAt'
  >,
) {
  const job: ImportJob = {
    ...partial,
    status: 'queued',
    processed: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
    createdAt: Date.now(),
  };

  jobs.set(job.id, job);

  return job;
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function listJobs(organizationId: number) {
  return [...jobs.values()]
    .filter((job) => job.organizationId === organizationId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function updateJob(id: string, patch: Partial<ImportJob>) {
  const job = jobs.get(id);

  if (!job) {
    return;
  }

  Object.assign(job, patch);

  return job;
}

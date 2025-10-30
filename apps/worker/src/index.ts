import 'dotenv/config';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // BullMQ requires this to be null for blocking commands
  maxRetriesPerRequest: null,
});

export const pdfQueue = new Queue('pdf', { connection });
export const emailQueue = new Queue('email', { connection });

new Worker(
  'pdf',
  async job => {
    console.log('PDF job received', job.id, job.name);
    // TODO: implement PDF generation
  },
  { connection }
);

new Worker(
  'email',
  async job => {
    console.log('Email job received', job.id, job.name);
    // TODO: implement email dispatch
  },
  { connection }
);

new QueueEvents('pdf', { connection }).on('completed', ({ jobId }) =>
  console.log('PDF completed', jobId)
);
new QueueEvents('email', { connection }).on('completed', ({ jobId }) =>
  console.log('Email completed', jobId)
);

console.log('Worker started');

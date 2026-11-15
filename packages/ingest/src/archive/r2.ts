import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { DocumentStore } from './store.ts';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Cloudflare R2 through its S3-compatible API. Objects are private; nothing is served publicly from the bucket. */
export function createR2Store(cfg: R2Config): DocumentStore {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return res.Body ? await res.Body.transformToByteArray() : null;
      } catch (e) {
        if (e instanceof NoSuchKey) return null;
        throw e;
      }
    },
  };
}

/** Where archived originals live: local disk in development, Cloudflare R2 in production. */
export interface DocumentStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** null when the key does not exist. */
  get(key: string): Promise<Uint8Array | null>;
}

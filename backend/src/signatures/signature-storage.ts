import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export abstract class SignatureStorage {
  abstract save(buffer: Buffer, extension: 'png' | 'jpg' | 'webp'): Promise<string>;
  abstract getAbsolutePath(key: string): string;
  abstract remove(key: string): Promise<void>;
}

@Injectable()
export class LocalSignatureStorage extends SignatureStorage {
  private readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = resolve(
      config.get<string>('SIGNATURE_STORAGE_PATH', join(process.cwd(), 'storage', 'signatures')),
    );
  }

  async save(buffer: Buffer, extension: 'png' | 'jpg' | 'webp') {
    await mkdir(this.root, { recursive: true });
    const key = `${randomUUID()}.${extension}`;
    await writeFile(join(this.root, key), buffer, { flag: 'wx' });
    return key;
  }

  getAbsolutePath(key: string) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) {
      throw new Error('Invalid signature storage key');
    }
    return join(this.root, key);
  }

  async remove(key: string) {
    try {
      await unlink(this.getAbsolutePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
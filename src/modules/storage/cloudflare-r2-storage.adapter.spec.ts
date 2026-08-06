import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { CloudflareR2StorageAdapter } from './cloudflare-r2-storage.adapter';

describe('CloudflareR2StorageAdapter', () => {
  it('uploads to the configured bucket and versions the public URL', async () => {
    const values: Record<string, string> = {
      'storage.bucket': 'vekko-staging',
      'storage.publicBaseUrl': 'https://files-staging.vekko.test/',
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    const send = jest.fn().mockResolvedValue({});
    const adapter = new CloudflareR2StorageAdapter(configService);
    (
      adapter as unknown as {
        client: Pick<S3Client, 'send'>;
      }
    ).client = { send } as Pick<S3Client, 'send'>;
    jest.spyOn(Date, 'now').mockReturnValue(1_786_000_000_000);

    await expect(
      adapter.upload({
        body: Buffer.from('photo'),
        cacheControl: 'public, max-age=31536000, immutable',
        contentType: 'image/webp',
        key: 'staging/partners/partner-id/logo',
      }),
    ).resolves.toEqual({
      url: 'https://files-staging.vekko.test/staging/partners/partner-id/logo?v=1786000000000',
    });

    const sendCalls: unknown = send.mock.calls;
    expect(sendCalls).toMatchObject([
      [
        {
          input: {
            Bucket: 'vekko-staging',
            ContentType: 'image/webp',
            Key: 'staging/partners/partner-id/logo',
          },
        },
      ],
    ]);
  });
});

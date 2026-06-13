import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type CoverImageBucket = 'field-covers' | 'map-covers';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validate a multipart cover image upload.
   * Throws BadRequestException(400) with a clear message on failure.
   */
  validateCoverImage(file: Express.Multer.File | undefined): string {
    if (!file) {
      throw new BadRequestException('Missing file (field name "file")');
    }

    const ext = ALLOWED_MIME_TYPES[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed types: image/jpeg, image/png, image/webp`,
      );
    }

    if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large: ${file.size} bytes. Max allowed size is ${MAX_COVER_IMAGE_SIZE_BYTES} bytes (5MB)`,
      );
    }

    return ext;
  }

  /**
   * Upload a cover image to Supabase Storage using the service_role key.
   * Uses a deterministic object key + x-upsert so re-uploads overwrite the previous file.
   * Returns the public URL of the uploaded file.
   *
   * Throws InternalServerErrorException(500) if the Supabase upload fails — caller must
   * NOT update the DB record in that case.
   */
  async uploadCoverImage(
    bucket: CoverImageBucket,
    objectKey: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY config');
      throw new InternalServerErrorException('Storage is not configured');
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectKey}`;

    let res: Response;
    try {
      res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'x-upsert': 'true',
          'Content-Type': file.mimetype,
        },
        body: new Uint8Array(file.buffer),
      });
    } catch (err: unknown) {
      this.logger.error(`Supabase upload request failed: ${String(err)}`);
      throw new InternalServerErrorException('Failed to upload cover image');
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      this.logger.error(`Supabase upload failed (${res.status}): ${errText}`);
      throw new InternalServerErrorException('Failed to upload cover image');
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectKey}`;
  }
}

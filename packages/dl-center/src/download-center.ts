import fetch from 'node-fetch';
import Ajv from 'ajv';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  type ObjectCannedACL,
  type S3ClientConfig,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import downloadCenterSchema from './download-center-config.schema.json';
import type { DownloadCenterConfig, Link } from './download-center-config';

export type S3BucketConfig = S3ClientConfig & { bucket: string };

export type UploadAssetOptions = {
  contentType?: string;
  acl?: ObjectCannedACL;
};

type ProbeResponse = {
  ok: boolean;
  status: number;
};

const CONFIG_JSON_SCHEMA = Object.freeze(downloadCenterSchema);
const ACL_PUBLIC_READ = 'public-read';

/**
 * Probes the download_link for a configuration platform.
 * Returns the response of the probe.
 *
 * @static
 * @param {{ download_link: string }} link
 * @return {Promise<ProbeResponse>}
 * @memberof DownloadCenter
 */
export async function probePlatformDownloadLink({
  download_link,
}: {
  download_link: string;
}): Promise<ProbeResponse> {
  return await fetch(download_link, { method: 'HEAD' });
}

/**
 * Validates a download center configuration object against a json schema.
 * Throws an error if the configuration is invalid.
 *
 * @static
 * @param {DownloadCenterConfig} config -
 *  the download center product configuration document.
 * @memberof DownloadCenter
 */
export function validateConfigSchema(config: DownloadCenterConfig): void {
  const ajv = new Ajv();
  const validate = ajv.compile(CONFIG_JSON_SCHEMA);
  const valid = validate(config);
  if (!valid) {
    throw new Error(
      `Invalid configuration: ${ajv.errorsText(validate.errors)}`,
    );
  }
}

/**
 * Validates all the asset links referenced in a configuration object.
 * Makes an HEAD http call for each asset link and throws an error in case
 * an asset is not reachable.
 *
 * @static
 * @param {DownloadCenterConfig} config -
 *  the download center product configuration document.
 * @return {Promise<void>}
 * @memberof DownloadCenter
 */
export async function validateDownloadLinks(
  config: DownloadCenterConfig,
): Promise<void> {
  const errors: Record<string, number> = Object.create(null);
  const links: Link[] = [];

  for (const version of config.versions) {
    for (const platform of version.platform) {
      if ('download_link' in platform) {
        const singlePlatform = platform;
        links.push(singlePlatform);
      } else {
        const platformWithPackages = platform;
        links.push(...platformWithPackages.packages.links);
      }
    }
  }

  const probes = links.map(async (link) => {
    const probe = await probePlatformDownloadLink(link);
    if (!probe.ok) {
      errors[link.download_link] = probe.status;
    }
  });

  await Promise.all(probes);

  if (Object.keys(errors).length) {
    const errorMsg = Object.entries(errors)
      .map(([url, status]) => `- ${url} -> ${status}`)
      .sort()
      .join('\n');

    throw new Error(`Download center urls broken:\n${errorMsg}`);
  }
}

/**
 * Validates a download center config object.
 * Throws an error if the object has an incorrect format or if any of the
 * assets link is not reachable.
 *
 * @static
 * @param {DownloadCenterConfig} config -
 *  the download center product configuration document.
 * @return {Promise<void>}
 * @memberof DownloadCenter
 */
export async function validateConfig(
  config: DownloadCenterConfig,
): Promise<void> {
  validateConfigSchema(config);
  await validateDownloadLinks(config);
}

export class DownloadCenter {
  private s3: S3Client;
  private s3BucketName: string;

  constructor(bucketConfig: S3BucketConfig) {
    const { bucket, ...config } = bucketConfig;
    this.s3 = new S3Client({ region: 'us-east-1', ...config });
    this.s3BucketName = bucket;
  }

  /**
   * Downloads an asset from the download center. This is equivalent to a
   * get object from the download center s3 bucket.
   *
   * @param {string} s3ObjectKey -
   *  the s3 object key of the asset that has to be downloaded,
   *  ie. `my-project/asset.zip`.
   * @return {(Promise<Content | undefined>)}
   * @memberof DownloadCenter
   */
  async downloadAsset(
    s3ObjectKey: string,
  ): Promise<GetObjectCommandOutput['Body']> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    const command = new GetObjectCommand({
      Key: s3ObjectKey,
      Bucket: this.s3BucketName,
    });
    const object = await this.s3.send(command);

    return object.Body;
  }

  /**
   * Uploads an asset to the download center. This is equivalent to an
   * upload to the download center s3 bucket.
   *
   * @param {string} s3ObjectKey -
   *  the s3 object key of the asset that has to be uploaded,
   *  ie. `my-project/asset.zip`.
   * @param {Content} content -
   *  a string, Buffer, Uint8Array, Blob or Readable containing the data of
   *  the asset to be uploaded.
   * @param {UploadAssetOptions} [options={}] -
   *  metadata for the upload.
   * @param {string} [options.contentType=undefined] -
   *  an optional content type of the asset. If not specified
   *  will be detected by s3.
   * @return {Promise<void>}
   * @memberof DownloadCenter
   */
  async uploadAsset(
    s3ObjectKey: string,
    content: PutObjectCommandInput['Body'],
    options: UploadAssetOptions = {},
  ): Promise<void> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    const acl = options.acl ?? ACL_PUBLIC_READ;

    const command = new PutObjectCommand({
      ACL: acl,
      Bucket: this.s3BucketName,
      Key: s3ObjectKey,
      Body: content,
      ContentType: options.contentType,
    });

    await this.s3.send(command);
  }

  /**
   * Downloads a product configuration from the download center bucket.
   *
   * @param {string} s3ObjectKey  -
   *  the s3 object key of the configuration that has to be downloaded,
   *  ie. `products/compass.json`.
   * @return {(Promise<DownloadCenterConfig | undefined>)} -
   *  the download center product configuration document.
   * @memberof DownloadCenter
   */
  async downloadConfig(
    s3ObjectKey: string,
  ): Promise<DownloadCenterConfig | undefined> {
    const body = await this.downloadAsset(s3ObjectKey);

    if (!body) {
      return;
    }

    return JSON.parse(await body.transformToString());
  }

  /**
   * Validates and uploads a product configuration document
   * to the download center s3 bucket.
   *
   * @param {string} s3ObjectKey  -
   *  the s3 object key of the configuration that has to be uploaded,
   *  ie. `products/compass.json`.
   * @param {DownloadCenterConfig} config -
   *  the download center product configuration document.
   *
   * @return {Promise<void>}
   * @memberof DownloadCenter
   */
  async uploadConfig(
    s3ObjectKey: string,
    config: DownloadCenterConfig,
  ): Promise<void> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    await validateConfig(config);
    await this.uploadAsset(s3ObjectKey, JSON.stringify(config));
  }
}

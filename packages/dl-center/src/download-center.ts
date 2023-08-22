import util from 'util';
import fetch from 'node-fetch';
import Ajv from 'ajv';
import type { Body as Content } from 'aws-sdk/clients/s3';
import S3 from 'aws-sdk/clients/s3';

import downloadCenterSchema from './download-center-config.schema.json';
import type { DownloadCenterConfig, Link } from './download-center-config';

export type S3BucketConfig = {
  /**
   * The bucket name.
   */
  bucket: string;

  /**
   * The AWS access key id.
   */
  accessKeyId: string;

  /**
   * The AWS secret access key.
   */
  secretAccessKey: string;

  /**
   * S3 service endpoint. Set this to connect to a local test server.
   */
  endpoint?: string;

  /**
   * Whether to force path style URLs for S3 objects..
   *
   * The default is false. Set this to `true`
   * to connect to a local test server using an arbitrary endpoint.
   */
  s3ForcePathStyle?: boolean;

  /**
   * Whether or not TLS should be enabled.
   *
   * The default is `true`. Set this to `false`
   * to connect to a local test server.
   */
  sslEnabled?: boolean;
};

export type UploadAssetOptions = {
  contentType?: string;
};

type S3UploadFunc = (
  req: S3.PutObjectRequest
) => Promise<S3.ManagedUpload.SendData>;
type S3GetObjectFunc = (
  params: S3.GetObjectRequest
) => Promise<S3.GetObjectOutput>;

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
 * Vaidates a download center configuration object against a json schema.
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
      `Invalid configuration: ${ajv.errorsText(validate.errors)}`
    );
  }
}

/**
 * Validates all the asset links referenced in a configuration object.
 * Makes an HEAD http call for each asset link and throws an error in case
 * an asset is not reacheable.
 *
 * @static
 * @param {DownloadCenterConfig} config -
 *  the download center product configuration document.
 * @return {Promise<void>}
 * @memberof DownloadCenter
 */
export async function validateDownloadLinks(
  config: DownloadCenterConfig
): Promise<void> {
  const errors: Record<string, number> = {};
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

  const probes = links.map((link) => {
    return probePlatformDownloadLink(link).then((probe) => {
      if (!probe.ok) {
        errors[link.download_link] = probe.status;
      }
    });
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
  config: DownloadCenterConfig
): Promise<void> {
  validateConfigSchema(config);
  await validateDownloadLinks(config);
}

export class DownloadCenter {
  private s3Upload: S3UploadFunc;
  private s3GetObject: S3GetObjectFunc;
  private s3BucketName: string;

  constructor(bucketConfig: S3BucketConfig) {
    const s3 = new S3(bucketConfig);
    this.s3GetObject = util.promisify(s3.getObject.bind(s3));
    this.s3Upload = util.promisify(s3.upload.bind(s3));
    this.s3BucketName = bucketConfig.bucket;
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
  async downloadAsset(s3ObjectKey: string): Promise<Content | undefined> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    const object = await this.s3GetObject({
      Key: s3ObjectKey,
      Bucket: this.s3BucketName,
    });

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
    content: Content,
    options: UploadAssetOptions = {}
  ): Promise<void> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    const uploadParams: S3.PutObjectRequest = {
      ACL: ACL_PUBLIC_READ,
      Bucket: this.s3BucketName,
      Key: s3ObjectKey,
      Body: content,
      ContentType: options.contentType,
    };

    await this.s3Upload(uploadParams);
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
    s3ObjectKey: string
  ): Promise<DownloadCenterConfig | undefined> {
    const body = await this.downloadAsset(s3ObjectKey);

    if (!body) {
      return;
    }

    return JSON.parse(body.toString());
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
    config: DownloadCenterConfig
  ): Promise<void> {
    if (!s3ObjectKey) {
      throw new Error('s3ObjectKey is required');
    }

    await validateConfig(config);
    await this.uploadAsset(s3ObjectKey, JSON.stringify(config));
  }
}

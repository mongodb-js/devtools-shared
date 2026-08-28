/** An Amazon ECR registry that SLS container images are pulled from. */
export interface EcrRegistry {
  /** Registry host, e.g. `664315256653.dkr.ecr.us-east-1.amazonaws.com`. */
  registry: string;
  /** AWS account ID owning the registry. */
  registryId: string;
  /** AWS region the registry lives in. */
  region: string;
}

const ECR_HOST_RE =
  /^(?<registryId>\d{12})\.dkr\.ecr\.(?<region>[a-z0-9-]+)\.amazonaws\.com$/;

/**
 * Identify the ECR registry a docker image repository refers to, or
 * `undefined` if the repository is not hosted on ECR.
 */
export function parseEcrRegistry(imageRepo: string): EcrRegistry | undefined {
  const [host] = imageRepo.split('/', 1);
  const match = ECR_HOST_RE.exec(host);
  if (!match?.groups) return undefined;
  const { registryId, region } = match.groups;
  return { registry: host, registryId, region };
}

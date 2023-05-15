import { promises as fs } from 'fs';
import _ from 'lodash';

export async function loadDependencyFiles<
  T extends { name: string; version: string }
>(files: string[]): Promise<T[]> {
  const data = (
    await Promise.all(
      files.map(async (fileName) =>
        JSON.parse(await fs.readFile(fileName, 'utf-8'))
      )
    )
  ).flat();

  const uniqueData = _.uniqBy(
    data,
    ({ name, version }) => `${name as string}@${version as string}`
  );

  return _.sortBy(
    uniqueData,
    ({ name, version }) => `${name as string}@${version as string}`
  );
}

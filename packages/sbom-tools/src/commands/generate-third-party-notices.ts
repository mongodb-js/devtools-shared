import { loadBundleInfo } from '../load-bundle-info';

type BundleInfoEntry = {
  name: string;
  version: string;
  license: string;
  author: string;
  repository: string;
  licenseText: string;
};

type Options = {
  bundleInfoFiles: string[];
};

export async function generate3rdPartyNotices({ bundleInfoFiles }: Options) {
  const bundleInfo = await loadBundleInfo<BundleInfoEntry>(bundleInfoFiles);

  const entryAnchor = (entry: BundleInfoEntry) =>
    `${entry.name.replace(/ /g, '-')}-${entry.version.replace(/ /g, '-')}`;

  let markdown = '# Third-Party Notices\n\n';

  markdown +=
    'The following third-party software is used by and included in **MongoDB Compass**.\n';
  markdown += `This document was automatically generated on ${new Date().toDateString()}.\n\n`;

  markdown += '## List of dependencies\n\n';
  markdown += '| Name | Version | License |\n';
  markdown += '| --- | --- | --- |\n';

  bundleInfo.forEach((entry: BundleInfoEntry) => {
    markdown += `| [${entry.name}](#${entryAnchor(entry)}) | ${
      entry.version
    } | ${entry.license} |\n`;
  });

  markdown += '\n## Details\n\n';

  bundleInfo.forEach((entry: BundleInfoEntry) => {
    markdown += `<a id="${entryAnchor(entry)}"></a>\n`;
    markdown += `### ${entry.name} ${entry.version}\n\n`;
    markdown += `**License**: ${entry.license}\n\n`;
    if (entry.author) {
      markdown += `**Author**: ${entry.author}\n\n`;
    }
    if (entry.repository) {
      markdown += `**Repository**: ${entry.repository}\n\n`;
    }
    if (entry.licenseText) {
      markdown += `**License Text**:\n\n\`\`\`\n${entry.licenseText}\n\`\`\`\n\n`;
    }
  });

  console.info(markdown);
}

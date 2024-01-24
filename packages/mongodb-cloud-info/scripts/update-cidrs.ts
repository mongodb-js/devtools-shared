#!/usr/bin/env node
import path from 'path';
import util from 'util';
import fs from 'fs';
import ipaddr from 'ipaddr.js';
import fetch from 'cross-fetch';
import gceIps from 'gce-ips';
import { load as loadHtml } from 'cheerio';
import type { RawCIDR, RawCloudProviderCIDRs } from '../src';

const AWS_IP_RANGES_URL = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
const SERVICE_TAG_LINK_HTML_PAGE_URL =
  'https://www.microsoft.com/en-us/download/details.aspx?id=56519';

function serializeV4CIDR(cidr): RawCIDR {
  // cidr is a two-element array. The first element is the address, the second
  // element is the part after /.
  // We can reconstruct the address with new ipaddr.IPv4(cidr[0].octets)
  return [cidr[0].octets, cidr[1]];
}

function serializeV6CIDR(cidr): RawCIDR {
  // cidr is a two-element array. The first element is the address, the second
  // element is the part after /.
  // We can reconstruct the address with new ipaddr.IPv6(cidr[0].parts).
  return [cidr[0].parts, cidr[1]];
}

async function getSplitGCPIpRanges() {
  const gceIpsInstance = gceIps();
  const lookup = util.promisify(gceIpsInstance.lookup.bind(gceIpsInstance));

  const prefixes = (await lookup()).sort();

  const v4: RawCIDR[] = [];
  const v6: RawCIDR[] = [];

  for (const prefix of prefixes) {
    const cidr = ipaddr.parseCIDR(prefix);
    if (cidr[0].kind() === 'ipv4') {
      v4.push(serializeV4CIDR(cidr));
    } else {
      v6.push(serializeV6CIDR(cidr));
    }
  }

  return {
    v4,
    v6,
  };
}

async function getSplitAWSIpRanges() {
  const result = await fetch(AWS_IP_RANGES_URL).then((res) => res.json());

  return {
    v4: result.prefixes.map((range) =>
      serializeV4CIDR(ipaddr.parseCIDR(range.ip_prefix))
    ),
    v6: result.ipv6_prefixes.map((range) =>
      serializeV6CIDR(ipaddr.parseCIDR(range.ipv6_prefix))
    ),
  };
}

async function findServiceTagsPublicJsonUrl() {
  const url = SERVICE_TAG_LINK_HTML_PAGE_URL;

  const response = await fetch(url);
  const body = await response.text();
  const $ = loadHtml(body);
  const link = $('a')
    .filter((i, element) => {
      return Boolean(
        $(element)
          ?.attr('href')
          ?.match(/ServiceTags_Public_[\d]+\.json$/)
      );
    })
    .first()
    .attr('href');

  if (link) {
    return link;
  }

  throw new Error('Service tags link not found');
}

async function getSplitAzureIpRanges() {
  const azureIpRangesUrl = await findServiceTagsPublicJsonUrl();

  const { values } = await fetch(azureIpRangesUrl).then((res) => res.json());

  const v4: RawCIDR[] = [];
  const v6: RawCIDR[] = [];

  for (const value of values) {
    for (const addressPrefix of value.properties.addressPrefixes) {
      const cidr = ipaddr.parseCIDR(addressPrefix);
      if (cidr[0].kind() === 'ipv4') {
        v4.push(serializeV4CIDR(cidr));
      } else {
        v6.push(serializeV6CIDR(cidr));
      }
    }
  }

  return { v4, v6 };
}

async function writeAllIpRanges() {
  const [gcp, aws, azure] = await Promise.all([
    getSplitGCPIpRanges(),
    getSplitAWSIpRanges(),
    getSplitAzureIpRanges(),
  ]);

  const doc: RawCloudProviderCIDRs = {
    aws,
    azure,
    gcp,
  };

  const filename = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'resources',
    'cidrs.json'
  );

  await fs.promises.mkdir(path.dirname(filename), { recursive: true });
  await fs.promises.writeFile(filename, JSON.stringify(doc), 'utf8');
}

writeAllIpRanges().catch((err) => {
  throw err;
});

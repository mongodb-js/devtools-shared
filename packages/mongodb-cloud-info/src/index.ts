import util from 'util';
import dns from 'dns';
import ipaddr from 'ipaddr.js';
import fetch from 'cross-fetch';

const CIDRS_URL =
  'https://raw.githubusercontent.com/mongodb-js/devtools-shared/main/resources/cidrs.json';

export type RawCIDR = [number[], number];
type IPv4CIDR = [ipaddr.IPv4, number];
type IPv6CIDR = [ipaddr.IPv6, number];

export type RawCIDRs = { v4: RawCIDR[]; v6: RawCIDR[] };
type ParsedCIDRs = { v4: IPv4CIDR[]; v6: IPv6CIDR[] };

export type RawCloudProviderCIDRs = {
  aws: RawCIDRs;
  azure: RawCIDRs;
  gcp: RawCIDRs;
};

let unparsedCIDRsPromise: Promise<RawCloudProviderCIDRs> | undefined;

const dnsLookup = util.promisify(dns.lookup.bind(dns));

function rangesContainsIP(
  ipRanges: ParsedCIDRs,
  ip: ipaddr.IPv4 | ipaddr.IPv6
) {
  if (ip.kind() === 'ipv4') {
    return !!ipRanges.v4.find((cidr) => ip.match(cidr));
  }

  return !!ipRanges.v6.find((cidr) => ip.match(cidr));
}

function parseCIDRs(rawCidrs: RawCIDRs): ParsedCIDRs {
  return {
    v4: rawCidrs.v4.map((cidr) => [new ipaddr.IPv4(cidr[0]), cidr[1]]),
    v6: rawCidrs.v6.map((cidr) => [new ipaddr.IPv6(cidr[0]), cidr[1]]),
  };
}

export async function getCloudInfo(host?: string) {
  if (!host) {
    return {
      isAws: false,
      isGcp: false,
      isAzure: false,
    };
  }

  // note: @types/node here are not correct
  const address: string = (await dnsLookup(host)) as unknown as string;
  const ip = ipaddr.parse(address);

  if (!unparsedCIDRsPromise) {
    unparsedCIDRsPromise = fetch(CIDRS_URL).then((res) => {
      return res.json();
    });
  }
  let unparsedCIDRs: RawCloudProviderCIDRs | undefined;
  try {
    unparsedCIDRs = await unparsedCIDRsPromise;
  } catch (err) {
    // If we failed to fetch, clean up the cached promise so that the next call
    // can try again
    unparsedCIDRsPromise = undefined;
    throw err;
  }

  return {
    isAws: rangesContainsIP(parseCIDRs(unparsedCIDRs.aws), ip),
    isGcp: rangesContainsIP(parseCIDRs(unparsedCIDRs.gcp), ip),
    isAzure: rangesContainsIP(parseCIDRs(unparsedCIDRs.azure), ip),
  };
}

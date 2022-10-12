/**
 * Constants for various environments MongoDB can run in.
 */
const ATLAS = 'atlas';
const ADL = 'adl';
const ON_PREM = 'on-prem';

const ENVS = [ATLAS, ADL, ON_PREM] as const;

export { ATLAS, ADL, ON_PREM, ENVS };

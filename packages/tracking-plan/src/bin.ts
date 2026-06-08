import path from 'path';
import { parseArgs } from 'node:util';
import { generateTrackingPlan } from './index';
import type { GenerateTrackingPlanConfig } from './index';

function parseConfig(): GenerateTrackingPlanConfig {
  const { values } = parseArgs({
    options: {
      'events-file': { type: 'string' },
      'app-name': { type: 'string' },
    },
    strict: true,
  });

  if (!values['events-file'])
    throw new Error('Missing required argument: --events-file');
  return {
    eventsFile: path.resolve(process.cwd(), values['events-file']),
    appName: values['app-name'],
  };
}

const config = parseConfig();
process.stdout.write(generateTrackingPlan(config) + '\n');

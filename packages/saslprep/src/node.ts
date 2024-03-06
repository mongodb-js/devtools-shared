import _saslprep from './index';
import { createMemoryCodePoints } from './memory-code-points';
import data from './code-points-data';

const codePoints = createMemoryCodePoints(data);

function saslprep(input: string, opts?: { allowUnassigned?: boolean }): string {
  return _saslprep(codePoints, input, opts);
}

saslprep.saslprep = saslprep;
saslprep.default = saslprep;

export = saslprep;

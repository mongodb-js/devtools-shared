import _saslprep from './index';
import { createMemoryCodePoints } from './memory-code-points';
import data from './code-points-data-browser';

const codePoints = createMemoryCodePoints(data);

const saslprep = _saslprep.bind(null, codePoints);

Object.assign(saslprep, { saslprep, default: saslprep });

export = saslprep;

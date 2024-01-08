/**
 * TODO: lucas: this is now used in several modules (import-export, query-parser, probably others). Refactor into 1 shared place. bson?
 */
import type {
  Binary,
  BSONValue,
  Code,
  DBRef,
  Decimal128,
  Double,
  Int32,
  Long,
  ObjectId,
  Timestamp,
} from 'bson';
import { stringify as toJavascriptString } from 'javascript-stringify';

/**
 * [`Object.prototype.toString.call(value)`, `string type name`]
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString#Using_toString_to_detect_object_class
 */
const TYPE_FOR_TO_STRING = new Map([
  ['[object Array]', 'Array'],
  ['[object Object]', 'Object'],
  ['[object String]', 'String'],
  ['[object Date]', 'Date'],
  ['[object Number]', 'Number'],
  ['[object Function]', 'Function'],
  ['[object RegExp]', 'RegExp'],
  ['[object Boolean]', 'Boolean'],
  ['[object Null]', 'Null'],
  ['[object Undefined]', 'Undefined'],
]);

function detectType(value: BSONValue) {
  return TYPE_FOR_TO_STRING.get(Object.prototype.toString.call(value));
}

function getTypeDescriptorForValue(value: BSONValue) {
  const t = detectType(value);
  const _bsontype = t === 'Object' && value._bsontype;
  return {
    type: _bsontype || t,
    isBSON: !!_bsontype,
  };
}

const BSON_TO_JS_STRING = {
  Code: function (v: Code) {
    if (v.scope) {
      return `Code('${v.code}',${JSON.stringify(v.scope)})`;
    }
    return `Code('${v.code}')`;
  },
  ObjectID: function (v: ObjectId) {
    return `ObjectId('${v.toString('hex')}')`;
  },
  ObjectId: function (v: ObjectId) {
    return `ObjectId('${v.toString('hex')}')`;
  },
  Binary: function (v: Binary) {
    const subType = v.sub_type;
    if (subType === 4 && v.buffer.length === 16) {
      let uuidHex = '';
      try {
        // Try to get the pretty hex version of the UUID
        uuidHex = v.toUUID().toString();
      } catch {
        // If uuid is not following the uuid format converting it to UUID will
        // fail, we don't want the UI to fail rendering it and instead will
        // just display "unformatted" hex value of the binary whatever it is
        uuidHex = v.toString('hex');
      }
      return `UUID('${uuidHex}')`;
    }
    // The `Binary.buffer.toString` type says it doesn't accept
    // arguments. However it does, and a test will fail without it.
    return `BinData(${subType.toString(16)}, '${v.toString('base64')}')`;
  },
  DBRef: function (v: DBRef) {
    if (v.db) {
      return `DBRef('${v.collection}', '${v.oid.toString()}', '${v.db}')`;
    }

    return `DBRef('${v.collection}', '${v.oid.toString()}')`;
  },
  Timestamp: function (v: Timestamp) {
    return `Timestamp({ t: ${v.high}, i: ${v.low} })`;
  },
  Long: function (v: Long) {
    return `NumberLong(${v.toString()})`;
  },
  Decimal128: function (v: Decimal128) {
    return `NumberDecimal('${v.toString()}')`;
  },
  Double: function (v: Double) {
    return `Double('${v.toString()}')`;
  },
  Int32: function (v: Int32) {
    return `NumberInt('${v.toString()}')`;
  },
  MaxKey: function () {
    return 'MaxKey()';
  },
  MinKey: function () {
    return 'MinKey()';
  },
  Date: function (v: Date) {
    return BSON_TO_JS_STRING.ISODate(v);
  },
  ISODate: function (v: Date) {
    try {
      return `ISODate('${v.toISOString()}')`;
    } catch (ex) {
      return `ISODate('${v.toString()}')`;
    }
  },
  RegExp: function (v: RegExp) {
    let o = '';
    let hasOptions = false;

    if (v.global) {
      hasOptions = true;
      o += 'g';
    }
    if (v.ignoreCase) {
      hasOptions = true;
      o += 'i';
    }
    if (v.multiline) {
      hasOptions = true;
      o += 'm';
    }

    return `RegExp(${JSON.stringify(v.source)}${hasOptions ? `, '${o}'` : ''})`;
  },
};

/** @public */
export function toJSString(
  obj: unknown,
  ind?: Parameters<typeof JSON.stringify>[2]
): string | undefined {
  return toJavascriptString(
    obj,
    function (value, indent, stringify) {
      const t = getTypeDescriptorForValue(value);
      const toJs = BSON_TO_JS_STRING[t.type as keyof typeof BSON_TO_JS_STRING];
      if (!toJs) {
        return stringify(value);
      }
      return toJs(value);
    },
    ind || ' '
  );
}

/** @public */
export function stringify(obj: unknown): string | undefined {
  return toJSString(obj)
    ?.replace(/ ?\n ? ?/g, '')
    .replace(/ {2,}/g, ' ');
}

export enum ParseMode {
  Strict = 'strict',
  Extended = 'extended',
  Loose = 'loose',
}

const StrictOptions = {
  allowMethods: false, // Allow function calls, ie Date.now(), Math.Max(), (new Date()).getFullYear()
  allowComments: false, // Allow comments (// and /* */)
};

type OptionFlags = typeof StrictOptions;

const ExtendedOptions: Partial<OptionFlags> = {
  allowMethods: true,
};

const LooseOptions: OptionFlags = {
  allowMethods: true,
  allowComments: true,
};

function getModeOptions(mode: ParseMode): Partial<OptionFlags> {
  switch (mode) {
    case ParseMode.Strict:
      return StrictOptions;
    case ParseMode.Extended:
      return ExtendedOptions;
    case ParseMode.Loose:
      return LooseOptions;
  }
}

export type Options = {
  mode: ParseMode;
} & OptionFlags;

const DefaultOptions: Options = {
  mode: ParseMode.Strict,
  ...StrictOptions,
};

export function buildOptions(options?: Partial<Options>): Options {
  return {
    ...DefaultOptions,
    ...getModeOptions((options && options.mode) || ParseMode.Strict),
    ...options,
  };
}

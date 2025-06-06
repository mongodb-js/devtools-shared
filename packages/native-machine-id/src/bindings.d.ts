declare module 'bindings' {
  function bindings(filename: 'native_machine_id'): {
    getMachineIdSync: () => string | undefined;
    getMachineIdAsync: (
      callback: (err: Error | null, id: string | undefined) => void,
    ) => void;
  };
  export = bindings;
}

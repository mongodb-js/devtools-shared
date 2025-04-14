declare module 'bindings' {
  function bindings(filename: string): {
    getMachineId: () => string | undefined;
  };
  export = bindings;
}

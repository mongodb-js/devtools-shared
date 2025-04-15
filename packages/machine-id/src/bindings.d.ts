declare module 'bindings' {
  function bindings(filename: 'machine_id'): {
    getMachineId: () => string | undefined;
  };
  export = bindings;
}

export function createFetch(
  proxyOptions: DevtoolsProxyOptions
): (url: string, fetchOptions: FetchOptions) => Promise<FetchResponse> {}

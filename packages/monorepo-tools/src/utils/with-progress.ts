import ora from 'ora';

export async function withProgress<
  Fn extends (this: ora.Ora, ...args: any[]) => any
>(text: string, fn: Fn, ...args: Parameters<Fn>): Promise<ReturnType<Fn>> {
  const spinner = ora(text).start();
  try {
    const result = await fn.call(spinner, ...args);
    spinner.succeed();
    return result;
  } catch (e) {
    if (spinner.isSpinning) {
      spinner.fail();
    }
    throw e;
  }
}

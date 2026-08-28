import { expect } from 'chai';
import { dockerLoginToEcr, parseEcrRegistry } from './ecr';

describe('ecr', function () {
  describe('parseEcrRegistry', function () {
    it('parses the default SLS image repository', function () {
      expect(
        parseEcrRegistry(
          '664315256653.dkr.ecr.us-east-1.amazonaws.com/disagg-storage/',
        ),
        'default SLS repo should be recognized as ECR',
      ).to.deep.equal({
        registry: '664315256653.dkr.ecr.us-east-1.amazonaws.com',
        registryId: '664315256653',
        region: 'us-east-1',
      });
    });

    it('parses a registry host with no repository path', function () {
      expect(
        parseEcrRegistry('123456789012.dkr.ecr.eu-west-2.amazonaws.com'),
        'bare registry host should parse',
      ).to.deep.equal({
        registry: '123456789012.dkr.ecr.eu-west-2.amazonaws.com',
        registryId: '123456789012',
        region: 'eu-west-2',
      });
    });

    it('returns undefined for a non-ECR repository', function () {
      expect(
        parseEcrRegistry('docker.io/library/'),
        'docker.io is not ECR and must not trigger a login',
      ).to.equal(undefined);
    });

    it('returns undefined for a lookalike host', function () {
      expect(
        parseEcrRegistry('evil.amazonaws.com.attacker.test/x/'),
        'host must actually end in .amazonaws.com to count as ECR',
      ).to.equal(undefined);
    });

    it('returns undefined when the account ID is not 12 digits', function () {
      expect(
        parseEcrRegistry('12345.dkr.ecr.us-east-1.amazonaws.com/x/'),
        'AWS account IDs are always 12 digits, so a shorter one is not a registry',
      ).to.equal(undefined);
    });
  });

  describe('dockerLoginToEcr', function () {
    const registry = {
      registry: '664315256653.dkr.ecr.us-east-1.amazonaws.com',
      registryId: '664315256653',
      region: 'us-east-1',
    };

    // Builds a fake execFile matching the real callback-style signature,
    // recording invocations and anything written to the child's stdin.
    function fakeExecFile(
      respond: (cmd: string) => { stdout?: string; error?: Error },
    ) {
      const calls: { cmd: string; args: string[] }[] = [];
      let stdinData = '';
      const impl = (cmd: string, args: string[], opts: any, cb?: any) => {
        const callback = typeof opts === 'function' ? opts : cb;
        calls.push({ cmd, args });
        const { stdout = '', error } = respond(cmd);
        if (error) callback(error);
        else callback(null, stdout, '');
        return {
          stdin: {
            write(chunk: string) {
              stdinData += chunk;
            },
            end() {
              /* no-op */
            },
          },
        } as any;
      };
      return { impl, calls, stdin: () => stdinData };
    }

    it('requests a token scoped to the target registry id', async function () {
      const token = Buffer.from('AWS:pa:ss:word').toString('base64');
      const { impl, calls } = fakeExecFile((cmd) =>
        cmd === 'aws'
          ? { stdout: `${token}\n` }
          : { stdout: 'Login Succeeded' },
      );

      await dockerLoginToEcr(registry, { execFile: impl as any });

      const awsCall = calls.find((c) => c.cmd === 'aws');
      expect(awsCall, 'aws CLI should have been invoked').to.not.equal(
        undefined,
      );
      expect(
        awsCall!.args,
        'must scope the token to the target account, not the callers own',
      ).to.include.members(['--registry-ids', '664315256653']);
      expect(
        awsCall!.args,
        'get-login-password mints a token for the wrong account',
      ).to.not.include('get-login-password');
      expect(awsCall!.args, 'region must be passed').to.include.members([
        '--region',
        'us-east-1',
      ]);
    });

    it('logs in to docker with the decoded password', async function () {
      const token = Buffer.from('AWS:pa:ss:word').toString('base64');
      const { impl, stdin } = fakeExecFile((cmd) =>
        cmd === 'aws'
          ? { stdout: `${token}\n` }
          : { stdout: 'Login Succeeded' },
      );

      await dockerLoginToEcr(registry, { execFile: impl as any });

      expect(
        stdin(),
        'password must be split on the first colon only, since it contains colons',
      ).to.equal('pa:ss:word');
    });

    it('explains how to authenticate manually when the aws CLI is missing', async function () {
      const enoent = Object.assign(new Error('spawn aws ENOENT'), {
        code: 'ENOENT',
      });
      const { impl } = fakeExecFile(() => ({ error: enoent }));

      const err = await dockerLoginToEcr(registry, {
        execFile: impl as any,
      }).catch((e: Error) => e);

      expect(err, 'missing aws CLI must reject').to.be.instanceOf(Error);
      expect(
        (err as Error).message,
        'error should name the AWS CLI as the missing prerequisite',
      ).to.include('AWS CLI');
      expect(
        (err as Error).message,
        'error should offer the opt-out flag',
      ).to.include('--slsSkipEcrLogin');
    });

    for (const [description, output] of [
      ['a plain error string', 'An error occurred (AccessDenied)'],
      ['the literal None', 'None'],
      ['empty output', ''],
      ['a token with an empty password', 'AWS:'],
      ['a token for an unexpected user', 'someoneelse:hunter2'],
    ] as const) {
      it(`rejects ${description} instead of using it as a password`, async function () {
        const { impl } = fakeExecFile((cmd) =>
          cmd === 'aws'
            ? { stdout: `${Buffer.from(output).toString('base64')}\n` }
            : { stdout: 'Login Succeeded' },
        );

        const err = await dockerLoginToEcr(registry, {
          execFile: impl as any,
        }).catch((e: Error) => e);

        expect(
          err,
          'non-token AWS CLI output must not be passed to docker login',
        ).to.be.instanceOf(Error);
        expect(
          (err as Error).message,
          'error should say the token was not of the expected form',
        ).to.include("'AWS:<password>'");
      });
    }

    it('explains the pull permission trap when docker login fails', async function () {
      const token = Buffer.from('AWS:secret').toString('base64');
      const { impl } = fakeExecFile((cmd) =>
        cmd === 'aws'
          ? { stdout: `${token}\n` }
          : {
              error: Object.assign(new Error('exited 1'), {
                stderr: 'status: 400 Bad Request',
              }),
            },
      );

      const err = await dockerLoginToEcr(registry, {
        execFile: impl as any,
      }).catch((e: Error) => e);

      expect(
        (err as Error).message,
        'a bare 400 is useless; name the permission actually needed to pull',
      ).to.include('ecr:BatchGetImage');
    });
  });

});

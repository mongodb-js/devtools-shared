import assert from 'assert';
import path from 'path';
import { generateTrackingPlan, escapeTableCell } from '../src/index';

const FIXTURE_FILE = path.resolve(__dirname, 'fixtures/telemetry-events.ts');

describe('TrackingPlan', function () {
  describe('escapeTableCell', function () {
    it('leaves plain text unchanged', function () {
      assert.strictEqual(escapeTableCell('hello world'), 'hello world');
    });

    it('escapes pipe characters', function () {
      assert.strictEqual(escapeTableCell('a | b'), 'a \\| b');
    });

    it('escapes backslashes before pipes', function () {
      assert.strictEqual(escapeTableCell('a\\|b'), 'a\\\\\\|b');
    });

    it('replaces Unix newlines with a space', function () {
      assert.strictEqual(escapeTableCell('line1\nline2'), 'line1 line2');
    });

    it('replaces Windows newlines with a space', function () {
      assert.strictEqual(escapeTableCell('line1\r\nline2'), 'line1 line2');
    });
  });
  let result: string;

  before(function () {
    result = generateTrackingPlan({
      eventsFile: FIXTURE_FILE,
      appName: 'mongosh',
    });
  });

  it('includes the app name in the title', function () {
    assert.ok(result.includes('# mongosh Tracking Plan'));
  });

  it('includes an auto-generated note with date', function () {
    const today = new Date().toISOString().split('T')[0];
    assert.ok(result.includes(`Auto-generated on ${today}`));
    assert.ok(result.includes('Do not edit manually'));
  });

  it('renders the Identity section with trait properties', function () {
    assert.ok(result.includes('## Identity'));
    assert.ok(result.includes('`device_id`'));
    assert.ok(result.includes('`platform`'));
  });

  it('renders the Common Properties section', function () {
    assert.ok(result.includes('## Common Properties'));
    assert.ok(result.includes('`session_id`'));
  });

  it('includes a table of contents with all events', function () {
    assert.ok(result.includes('## Table of Contents'));
    assert.ok(result.includes('Connection'));
    assert.ok(result.includes('Query Executed'));
    assert.ok(result.includes('Application Launched'));
  });

  it('groups events under their category headings', function () {
    assert.ok(result.includes('## Connection'));
    assert.ok(result.includes('## Query'));
    assert.ok(result.includes('## Lifecycle'));
  });

  it('renders property tables with required and optional columns', function () {
    assert.ok(result.includes('| Property | Type | Required | Description |'));
    assert.ok(result.includes('| Yes |'));
    assert.ok(result.includes('| No |'));
  });

  it('resolves intersection types — base properties appear in event tables', function () {
    // session_id comes from CommonEventProperties via intersection in the payload
    const connectionSection = result.slice(
      result.indexOf('### Connection'),
      result.indexOf('### Query Executed'),
    );
    assert.ok(connectionSection.includes('`session_id`'));
    assert.ok(connectionSection.includes('`is_localhost`'));
  });

  it('includes event descriptions from JSDoc comments', function () {
    assert.ok(
      result.includes('Fired when a connection to the server is established.'),
    );
  });

  it('includes property descriptions from JSDoc comments', function () {
    assert.ok(result.includes('Whether the target host is localhost.'));
  });
});

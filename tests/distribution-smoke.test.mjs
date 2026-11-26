import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseDistributionOptions } from '../scripts/smoke-distribution.mjs';
test('distribution smoke requires the exact archive and an explicit npm CLI', () => {
  assert.throws(()=>parseDistributionOptions([]), /Archive and explicit npm CLI/);
  assert.throws(()=>parseDistributionOptions(['--archive','a.tgz']), /Archive and explicit npm CLI/);
  const result=parseDistributionOptions(['--archive','a.tgz','--npm-cli','npm-cli.js']);
  assert.equal(result.archive,path.resolve('a.tgz')); assert.equal(result.npmCli,path.resolve('npm-cli.js'));
});
test('distribution smoke rejects unknown, duplicate and missing options', () => {
  assert.throws(()=>parseDistributionOptions(['--surprise','x']), /Expected/);
  assert.throws(()=>parseDistributionOptions(['--archive','a','--archive','b']), /Duplicate/);
  assert.throws(()=>parseDistributionOptions(['--archive']), /Expected/);
});

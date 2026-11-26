import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const COPYRIGHT = 'Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)';
const STUDIO = '绍兴市柯桥区禾杨智绘软件开发工作室';

test('branding retains package, CLI and Claude plugin identifiers', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const plugin = JSON.parse(await read('.claude-plugin/plugin.json'));
  assert.equal(pkg.name, '@merziller/prompt-fusion');
  assert.deepEqual(pkg.bin, { 'prompt-fusion': './bin/prompt-fusion.mjs' });
  assert.equal(plugin.name, 'prompt-fusion');
  assert.equal(pkg.author.name, 'Merziller');
  assert.equal(plugin.author.name, 'Merziller');
  assert.equal(pkg.author.email, 'k26789228@gmail.com');
  assert.equal(plugin.author.email, 'k26789228@gmail.com');
  assert.equal(pkg.copyright, COPYRIGHT);
  assert.equal(pkg.producer.name, STUDIO);
  assert.equal(pkg.license, 'Apache-2.0');
  assert.equal(plugin.license, 'Apache-2.0');
  for (const text of [pkg.description, plugin.description]) {
    assert.ok(text.includes(STUDIO));
    assert.ok(text.includes('Merziller'));
  }
});

test('brand descriptions never expand the product title or composer labels', async () => {
  for (const language of ['zh', 'en']) {
    const locale = JSON.parse(await read(`locale/${language}.json`));
    assert.equal(locale.meta.title, 'Prompt Fusion');
    assert.ok(locale.meta.description.includes(STUDIO));
    assert.ok(locale.meta.description.includes('Merziller'));
    assert.equal(locale.meta.detail, language === 'zh' ? 'README.md' : 'README.en.md');
    assert.equal(locale.ui.enhance, language === 'zh' ? '增强' : 'Enhance');
    assert.equal(locale.ui.cancel, language === 'zh' ? '停止' : 'Stop');
    assert.equal(locale.ui.undo, language === 'zh' ? '撤销增强' : 'Undo enhancement');
    for (const value of Object.values(locale.ui)) assert.ok(!value.includes('禾杨'));
  }
});

test('Apache license body and upstream notices remain byte-preserved', async () => {
  const license = await read('LICENSE');
  const apache = await read('third-party/licenses/Fishsb-Apache-2.0.txt');
  assert.equal(license, apache + '\n' + COPYRIGHT + '\n');
  const notices = await read('THIRD_PARTY_NOTICES.md');
  for (const attribution of [
    'Copyright 2026 feiwell',
    'Copyright 2026 DSH Prompt Enhancer contributors',
    'Copyright 2026 Fishsb',
    'third-party/licenses/feiwell-MIT.txt',
    'third-party/licenses/ChosenXu-MIT.txt',
    'third-party/licenses/Fishsb-Apache-2.0.txt',
    'third-party/licenses/Fishsb-NOTICE.txt'
  ]) assert.ok(notices.includes(attribution), attribution);
});

test('ownership and public contacts are consistent in distributed documents', async () => {
  for (const file of ['AUTHORS.md', 'NOTICE', 'README.md', 'README.en.md']) {
    const text = await read(file);
    assert.ok(text.includes(COPYRIGHT), file);
    assert.ok(text.includes('Merziller'), file);
    assert.ok(text.includes('1411574209'), file);
    assert.ok(text.includes('k26789228@gmail.com'), file);
  }
  for (const file of ['README.md', 'README.en.md']) {
    const text = await read(file);
    assert.ok(text.startsWith('# Prompt Fusion\n'), file);
    assert.ok(text.includes('禾杨灵词'), file);
    assert.ok(text.includes('禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）出品 · Merziller 开发'), file);
  }
});

test('public tool, endpoint and model environment names retain their contracts', async () => {
  const schema = await read('src/schema.mjs');
  assert.match(schema, /name: 'prompt_fusion_enhance'/);
  assert.match(schema, /title: 'Prompt Fusion'/);
  const http = await read('src/http.mjs');
  assert.ok(http.includes("'/v1/enhance'"));
  assert.ok(http.includes("'/mcp'"));
  const cli = await read('bin/prompt-fusion.mjs');
  for (const name of ['FUSION_BASE_URL', 'FUSION_MODEL', 'FUSION_API_KEY']) assert.ok(cli.includes(name));
});

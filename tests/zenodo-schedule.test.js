const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync(new URL('../.github/workflows/update-zenodo-stats.yml', `file://${__filename}`), 'utf8');

test('Zenodo statistics workflow provides three staggered daily attempts', () => {
  assert.match(workflow, /cron: "17 15 \* \* \*"/);
  assert.match(workflow, /cron: "37 16 \* \* \*"/);
  assert.match(workflow, /cron: "53 18 \* \* \*"/);
});

test('scheduled retries share one freshness gate while manual runs remain unconditional', () => {
  assert.match(workflow, /id: freshness/);
  assert.match(workflow, /python scripts\/check_zenodo_update_due\.py >> "\$GITHUB_OUTPUT"/);
  assert.equal(
    (workflow.match(/github\.event_name == 'workflow_dispatch' \|\| steps\.freshness\.outputs\.should_run == 'true'/g) || []).length,
    2,
  );
  assert.match(workflow, /group: update-zenodo-statistics/);
  assert.match(workflow, /cancel-in-progress: false/);
});

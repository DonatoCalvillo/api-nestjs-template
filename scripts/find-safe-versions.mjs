/**
 * Finds the latest stable semver version published at least MIN_DAYS ago.
 * Usage: node scripts/find-safe-versions.mjs [minDays]
 */
const MIN_DAYS = Number(process.argv[2] ?? 7);
const cutoff = Date.now() - MIN_DAYS * 24 * 60 * 60 * 1000;

function isStable(version) {
  return (
    /^\d+\.\d+\.\d+$/.test(version) &&
    !version.includes('-') &&
    !version.includes('+')
  );
}

async function fetchPackage(name) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace(/^%40/, '@')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function findSafeVersion(name) {
  const data = await fetchPackage(name);
  const times = data.time ?? {};

  const candidates = Object.keys(times)
    .filter(isStable)
    .filter((v) => new Date(times[v]).getTime() <= cutoff)
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pb[i] !== pa[i]) return pb[i] - pa[i];
      }
      return 0;
    });

  if (candidates.length === 0) {
    throw new Error(`${name}: no stable version older than ${MIN_DAYS} days`);
  }

  const version = candidates[0];
  const published = times[version];
  const ageDays = Math.floor((Date.now() - new Date(published).getTime()) / (24 * 60 * 60 * 1000));

  return { name, version, published, ageDays };
}

async function main() {
  const pkg = JSON.parse(
    await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ),
  );

  const all = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const results = [];
  for (const name of Object.keys(all)) {
    if (all[name] === '*') {
      console.log(`SKIP ${name} (wildcard *)`);
      continue;
    }
    try {
      const result = await findSafeVersion(name);
      results.push(result);
      console.log(
        `${result.name}\t${all[name]} -> ${result.version}\t(${result.ageDays}d old, ${result.published.slice(0, 10)})`,
      );
    } catch (err) {
      console.error(`ERROR ${name}: ${err.message}`);
    }
  }

  console.log('\n--- JSON ---');
  console.log(JSON.stringify(results, null, 2));
}

main();

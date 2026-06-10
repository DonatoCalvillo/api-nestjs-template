/** @type {import('lint-staged').Config} */
module.exports = {
  'src/**/*.ts': (filenames) => {
    if (filenames.length === 0) {
      return [];
    }

    const quoted = filenames.map((file) => `"${file}"`).join(' ');

    return [
      `eslint --fix ${quoted}`,
      `jest --selectProjects unit --bail --findRelatedTests --passWithNoTests ${quoted}`,
    ];
  },
  'test/**/*.ts': (filenames) => {
    if (filenames.length === 0) {
      return [];
    }

    const quoted = filenames.map((file) => `"${file}"`).join(' ');

    return [
      `eslint --fix ${quoted}`,
      `jest --selectProjects unit --bail --passWithNoTests ${quoted}`,
    ];
  },
  '*.ts': (filenames) => {
    if (filenames.length === 0) {
      return [];
    }

    const quoted = filenames.map((file) => `"${file}"`).join(' ');

    return [`eslint --fix ${quoted}`];
  },
};

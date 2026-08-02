
const esbuild = require('esbuild');
esbuild.transformSync(require('fs').readFileSync('src/app/components/AdminOverviewTab.tsx', 'utf8'), {
  loader: 'tsx'
});
console.log('Build successful');

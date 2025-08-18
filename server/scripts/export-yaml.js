// scripts/export-yaml.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerSpec = require('../docs/swagger.json');

const outDir = path.join(__dirname, '..', 'docs');
const outFile = path.join(outDir, 'api-docs.yaml');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, yaml.dump(swaggerSpec, { noRefs: true }));
console.log('✅ Swagger YAML exported to docs/api-docs.yaml');

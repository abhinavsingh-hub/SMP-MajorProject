/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const path = require('path');

const tsxBin = path.resolve(__dirname, '../../node_modules/.bin/tsx');
const serverTs = path.resolve(__dirname, 'server.ts');

const child = spawn(process.execPath, [tsxBin, serverTs], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

/* Cross-platform launcher. Some tool environments export ELECTRON_RUN_AS_NODE=1,
 * which makes Electron behave like plain Node and breaks `require('electron')`.
 * Clearing it here guarantees `npm start` works from any terminal.
 * Design & Developed by Mr.Busy — https://ai-1.art/
 */
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

const args = [path.join(__dirname)].concat(process.argv.slice(2));
const child = spawn(electron, args, { cwd: __dirname, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code == null ? 0 : code));
child.on('error', (err) => {
  console.error('Could not start Electron:', err.message);
  console.error('Try running: npm install');
  process.exit(1);
});


const { shell } = require("electron");
const { spawn } = require('child_process');


//shell.openPath('./')


const child = spawn('git', ['--version'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});
child.on('exit', (code: number) => {
  if (code !== 0) {
    console.error(`Git command exited with code ${code}`);
  } else {
    console.log('Git command executed successfully');
  }
});

const ls = spawn('ls', ['-l', '/Users/fusong/code/testcode/'], {cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit' });

  const { exec } = require('child_process');
  const util = require('util');
  
  // 将 exec 函数 Promise 化
  const execPromise = util.promisify(exec);
  
  async function runCommandInRenderer(command:any) {
    try {
      // 在渲染进程中执行命令并返回结果
      const { stdout, stderr } = await execPromise(command);
      console.log(stdout, stderr);
  
      // 在页面上展示结果
      const resultElement = document.getElementById('result');
      if(resultElement)
      resultElement.innerHTML = `<pre>${stdout}</pre>`;
  
    } catch (error:any) {
      console.error(error);
  
      // 在页面上展示错误信息
      const resultElement = document.getElementById('result');
      if(resultElement)
      resultElement.innerHTML = `<pre>${error.message}</pre>`;
    }
  }
  
  // 调用示例
  //runCommandInRenderer('cd ~/github/fs');

  //runCommandInRenderer('git status');





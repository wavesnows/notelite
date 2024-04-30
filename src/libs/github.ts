import {showMessage} from './globalLib'
import { useTtsStore } from "@/store/store";


const GitHub = require('github-api');
const encode =require('encoding');
const simpleGit = require('simple-git');
const Store = require("electron-store");
const path = require("path");

let store = new Store();

/**
 * 
 */
export async function gitHubClone(){
  const ttsStore = useTtsStore();
 // store.set("GithubToken", this.config.githubToken);
  let name = ttsStore.config.githubUsername;
  let repo = ttsStore.config.githubRepoName;
  let notePath  = ttsStore.config.savePath
  const gitUrl = `https://github.com/${name}/${repo}.git`
  const localPath = path.join(notePath,"repos",repo)
  console.log(localPath)
  const git = simpleGit()
  try{
    await git.clone(gitUrl,localPath);
    showMessage('Init Clone Finished!')
    console.log('clone finish')
  }
  catch(error:any)
  {
    showMessage(error.message)
    console.log(error.message)
  }
 
}


/**
 * 
 * @param loclRepo 
 */
export async function gitPull(loclRepo:string='') {
  const ttsStore = useTtsStore();
  let repo = ttsStore.config.githubRepoName;
    if(loclRepo == ''){
      loclRepo = path.join(store.get("savePath"), "repos", repo);
    }
    console.log("==="+loclRepo)
    // 本地仓库目录
    const repoDir = loclRepo; 
    // 创建 simple-git 对象
    const git = simpleGit(repoDir);
    git.pull((err:any, update:any) => {
      if (err) {
        console.error('Failed to pull changes: ', err);
        showMessage(err.message);
        return;
      }
      console.log('Repo updated: ', update);
      showMessage('Repo updated!');
    })
   }

   export async function gitHubPush(){
    const ttsStore = useTtsStore();
    let repo = ttsStore.config.githubRepoName
    let loclRepo = path.join(store.get("savePath"), "repos", repo);
    const repoDir = loclRepo // 本地仓库目录
    const repoName = repo; // GitHub 仓库名称
    const username = ttsStore.config.githubUsername;// GitHub 用户名
    const token = ttsStore.config.githubToken;// GitHub 访问令牌
    // 创建 simple-git 对象
    const git = simpleGit(repoDir);

    // 提交文件
    git
      .add('.')
      .commit('[wavenote] add file')
    // .addRemote('origin', `https://${username}:${token}@github.com/${username}/${repoName}`)
      .push(['-u', 'origin', 'main'], (err:any, result:any) => {
        if (err) throw err;
        console.log('文件提交成功！', result);
        showMessage('File Pushed Succeed!')
      });
 }


  // export async function githubPull(loclRepo:string, remoteRepoName:string, user:string, token:string) {}

  export async function githubPush(){
    // 本地仓库目录
    const repoDir = '';
    // GitHub 仓库名称
    const repoName = 'demo';
    // GitHub 用户名
    const username = 'zlpx96';
    // GitHub 访问令牌
    const token = '';
    
    // 创建 simple-git 对象
    const git = simpleGit(repoDir);
    
    // 读取要提交的文件
   // const data = fs.readFileSync('file.txt', 'utf8');
    
    // 将文件内容写入本地仓库的 file.txt
  //  fs.writeFileSync(`${repoDir}/file.txt`, data);

    // 提交文件
    git
      .add('.')
      .commit('[note] add file')
    //  .addRemote('origin', `https://${username}:${token}@github.com/${username}/${repoName}`)
      .push(['-u', 'origin', 'main'], (err:any, result:any) => {
        if (err) throw err;
        console.log('文件提交成功！', result);
        showMessage('File Pushed Succeed!')
      });
 }

 export async function getGitFileUsingGithub() {
  const gh = new GitHub('');
  const repo = gh.getRepo('zlpx96', 'demo');
  const fileContent = await repo.getContents('', 'README.md');
  console.log(fileContent);
  console.log(encode.convert(fileContent.data.content, 'base64',"UTF8").toString())
}
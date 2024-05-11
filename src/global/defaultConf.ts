var defaultConf:any ={
  
}

const baseConf:any ={
  newFolderName:"MyFolder",
  defaultStore:"yesnotelite",
  defaultRepoPath:"repos",
  defaultRepoName:"default",
}

  const devConf:any = {
    appName:"mynotelite",
    storeName:"myNoteStore",
    
  }
  const proConf:any = {
    storeName:"yesNoteStore",
    appName:"yesnotelite",
  }

  let paths:string = process.argv[0];
  
  if(paths.includes('node_modules')){
    defaultConf = {...baseConf, ...devConf};
  }
  else{
    defaultConf = {...baseConf, ...proConf}
    console.dir(defaultConf);
  }



  const env = process.argv[2] || 'development';
  console.log('======'+env+"======");

export default  defaultConf;
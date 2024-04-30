import EditorJS from "@editorjs/editorjs";
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';

import { useTtsStore } from "@/store/store";

const Store = require("electron-store");
const path = require("path");
const fs = require('fs')
const fse = require('fs-extra')

const store = new Store();
var editorInstance:EditorJS

export function initEditor(editor:any){
    editorInstance = new EditorJS({
        holder: editor.value,
        tools: {
          header: {
            class: Header,
            config: {
              placeholder: 'Header'
            },
            inlineToolbar: ['link'],
            shortcut: 'CMD+SHIFT+H'
          },
          list: List,
          quote: Quote
        },
        data:store.get("editerData"),
        placeholder: 'Let`s write an awesome story!',
        onChange: (api, event) => {
         console.log('Now I know that Editor\'s content changed!', api, event)
       },
        onReady: () =>{
          console.log('ready!');
          readyInit();
         
        }
})
    return editorInstance;
}

export function readyInit(){
    console.log("call by init");
    if(editorInstance){
      console.log("has instance");
      editorInstance.on('selection-change', (event) => {
        console.log(`当前选定的内容：${event.detail.range.toString()}`);
      });
    }
    loadContent()
};

export  function loadContent(){
  let url = store.get("lastPath")
  if(url){
    fs.readFile(url, 'utf8', (err:any, data:any) => {
      if (err) throw err;
      const jsonData = JSON.parse(data);
      console.log(url)
      console.log(jsonData)
    })
  }
  else{
  }
}

  export function saveContent(){
    const ttsStore = useTtsStore();
    editorInstance.save().then((outputData:any) => {
      ttsStore.editerflag = false
          console.dir(outputData,{depth:5})
          var fileData = JSON.stringify(outputData, null, 2); // 以 2 个空格缩进 JSON 数据
         // var blob = new Blob([fileData], { type: 'application/json;charset=utf-8' });
          //fs.appendFileSync("/Users/fusong/note/demo/data.json", fileData, 'utf8');
          var data = new Date();
          var title = data.getTime().toString();
          var path = data.getMonth().toString();
          if(ttsStore.inputs.noteTitle !=""){
            title = ttsStore.inputs.noteTitle;
          }
         console.log(title, ttsStore.inputs.notePath)
          fs.writeFileSync(ttsStore.inputs.notePath, fileData, 'utf8')
          console.log('Saving Finish');
          //ttsStore.treeMenu.data = readDir()
    }).catch((error) => {
        console.log('Saving failed: ', error)
        ttsStore.editerflag = false
      });
  }
  
  export function renameFile(){
    saveContent();
    const ttsStore = useTtsStore();
   // ttsStore.treeMenu.data = readDir();
    var destPath = path.dirname(ttsStore.inputs.notePath)
    var destPath = path.join(destPath,ttsStore.cnote.title)
   // fse.moveSync(ttsStore.inputs.notePath,destPath)
    ttsStore.inputs.notePath = destPath;

    return ;
}
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from '@editorjs/header';
import Underline from '@editorjs/underline';
import Warning from "@editorjs/warning";
import Image from '@editorjs/image';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Table from '@editorjs/table';
import Checklist from '@editorjs/checklist';
import { useTtsStore } from "@/store/store";
import { store } from '@/global/initLocalStore';
import { showMessage } from '@/libs/globalLib';
import { showError, ErrorType } from '@/libs/errorHandler';
import path from 'path';
import fs from 'fs';
let editorInstance: EditorJS

// 定义编辑器元素类型
interface EditorElement extends HTMLElement {
  value: string;
}

export function initEditor(editor: EditorElement){
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
          quote: Quote,
          underline: Underline,
          warning:{

              class: Warning,
              inlineToolbar: true,
              shortcut: 'CMD+SHIFT+W',
              config: {
                titlePlaceholder: 'Title',
                messagePlaceholder: 'Message',
              },
          },
          code: {
            class: Code,
            config: {
              placeholder: 'Enter code here...'
            },
            shortcut: 'CMD+SHIFT+C'
          },
          table: {
            class: Table,
            config: {
              rows: 2,
              cols: 3,
              withHeadings: false
            },
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+T'
          },
          checklist: {
            class: Checklist,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+K'
          },
        },
        data:store.get("editerData"),
        placeholder: 'Let`s write an awesome story!',
        onChange: (api, event) => {
         console.log('Now I know that Editor\'s content changed!', api, event)
         saveContent()
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

export function loadContent(){
  let url: string = store.get("lastPath") as string;
  if (url && url.includes(store.get('currentNotebookPath'))) {
    try {
      const data = fs.readFileSync(url, 'utf8');
      const jsonData = JSON.parse(data);
      console.log(jsonData);
    } catch (err) {
      console.error('Error loading content:', err);
      showMessage('Failed to load content', 'error');
    }
  } else {
    const ttsStore = useTtsStore();
    ttsStore.cnote.title = '';
    ttsStore.cnote.lastPath = '';
    console.log("no current file.");
  }
}

export function saveContent(){
  const ttsStore = useTtsStore();

  // Set saving status
  ttsStore.setSaveStatus('saving', ttsStore.config.language === 'zh_CN' ? '保存中...' : 'Saving...');

  editorInstance.save().then((outputData:any) => {
    ttsStore.editerflag = false
      console.dir(outputData,{depth:5})
      var fileData = JSON.stringify(outputData, null, 2); // 以 2 个空格缩进 JSON 数据
          var data = new Date();
          var title = data.getTime().toString();
          var path = data.getMonth().toString();
          if(ttsStore.inputs.noteTitle !=""){
            title = ttsStore.inputs.noteTitle;
          }
         console.log(title, ttsStore.inputs.notePath)
          fs.writeFileSync(ttsStore.inputs.notePath, fileData, 'utf8')
          console.log('Saving Finish');

          // Set saved status
          ttsStore.setSaveStatus('saved', ttsStore.config.language === 'zh_CN' ? '已保存' : 'Saved');

          // Schedule Git status check after save
          ttsStore.scheduleGitStatusCheck();
    }).catch((error) => {
      // Set error status
      ttsStore.setSaveStatus('error', ttsStore.config.language === 'zh_CN' ? '保存失败' : 'Save failed');
      // Use unified error handler
      showError(ErrorType.FILE_WRITE, 'Failed to save note', error.message, error);
      console.log('Saving failed: ', error)
      ttsStore.editerflag = false
      });
  }
  
export function renameFile(){
  try {
    saveContent();
    const ttsStore = useTtsStore();
    const dirPath = path.dirname(ttsStore.inputs.notePath);
    const newPath = path.join(dirPath, ttsStore.cnote.title);

    // 检查目标路径是否已存在
    if (fs.existsSync(newPath)) {
      throw new Error('File already exists');
    }

    fs.renameSync(ttsStore.inputs.notePath, newPath);
    ttsStore.inputs.notePath = newPath;
  } catch (err) {
    console.error('Error renaming file:', err);
    showMessage('Failed to rename file', 'error');
  }
}
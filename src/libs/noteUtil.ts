
import path from "path";
import defaultConf from '../global/defaultConf';

const { copyFileSync, ensureDirSync, statSync ,existsSync, readdirSync} = require("fs-extra");

export function getNoteLabel(){
    var date = new Date();
    return  dateFormat('YmmddHHMMSS',date);
}

export function dateFormat(fmt:string, date:Date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}


export function isFolderEmpty(dir:string):boolean{
    
    let isEmpty = ((readdirSync(dir) as Array<string>).length > 0)? false:true;
    return isEmpty;
}

export function initDefaultNotebook(dir:string):string{
    let str:string = ''
    let localNotePath = path.join(dir,defaultConf.defaultRepoPath,defaultConf.defaultRepoName,"notes");
    let hasDefaultNoteBook = existsSync(localNotePath) && statSync(localNotePath).isDirectory()
    if(!existsSync(dir)||existsSync(dir)&&isFolderEmpty(dir)){
        ensureDirSync(localNotePath);
        copyFileSync(path.join(path.resolve(process.cwd()),'src/assets/Note.json'),path.join(localNotePath,'demo.json'))
        str = "create default note book"
    }
    else if(hasDefaultNoteBook){
        str = "default note folder is already there. "
    }
    else{
        str ="none empty";
    }
    console.log(str)
    return str;
    
}

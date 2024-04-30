import { ElMessage} from "element-plus";


export function showMessage(message:string){
    ElMessage(` ${message}`)
   // ElMessage.warning()
  }
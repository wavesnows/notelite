import { ElMessage } from "element-plus";

export function showMessage(
  message: string,
  type: 'success' | 'warning' | 'info' | 'error' = 'info',
  options?: { grouping?: boolean; offset?: number }
) {
  ElMessage({
    message,
    type,
    grouping: options?.grouping ?? true,
    offset: options?.offset ?? 40
  })
}
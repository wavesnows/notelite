import { ElMessage, ElMessageBox } from 'element-plus';

export enum ErrorType {
  FILE_READ = 'FILE_READ',
  FILE_WRITE = 'FILE_WRITE',
  FILE_DELETE = 'FILE_DELETE',
  GIT_OPERATION = 'GIT_OPERATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  originalError?: any;
}

class ErrorHandler {
  private language: string = 'en_US';

  setLanguage(lang: string) {
    this.language = lang;
  }

  private getErrorMessage(type: ErrorType, details?: string): { title: string; message: string } {
    const isChinese = this.language === 'zh_CN';

    const messages: Record<ErrorType, { en: { title: string; message: string }; zh: { title: string; message: string } }> = {
      [ErrorType.FILE_READ]: {
        en: {
          title: 'File Read Error',
          message: details || 'Failed to read the file. Please check if the file exists and you have permission to access it.',
        },
        zh: {
          title: '文件读取错误',
          message: details || '无法读取文件。请检查文件是否存在以及您是否有访问权限。',
        },
      },
      [ErrorType.FILE_WRITE]: {
        en: {
          title: 'File Write Error',
          message: details || 'Failed to save the file. Please check if you have write permission.',
        },
        zh: {
          title: '文件写入错误',
          message: details || '无法保存文件。请检查您是否有写入权限。',
        },
      },
      [ErrorType.FILE_DELETE]: {
        en: {
          title: 'File Delete Error',
          message: details || 'Failed to delete the file. Please check if the file is in use.',
        },
        zh: {
          title: '文件删除错误',
          message: details || '无法删除文件。请检查文件是否正在使用。',
        },
      },
      [ErrorType.GIT_OPERATION]: {
        en: {
          title: 'Git Operation Error',
          message: details || 'Git operation failed. Please check your network connection and repository settings.',
        },
        zh: {
          title: 'Git 操作错误',
          message: details || 'Git 操作失败。请检查网络连接和仓库设置。',
        },
      },
      [ErrorType.NETWORK]: {
        en: {
          title: 'Network Error',
          message: details || 'Network request failed. Please check your internet connection.',
        },
        zh: {
          title: '网络错误',
          message: details || '网络请求失败。请检查您的网络连接。',
        },
      },
      [ErrorType.VALIDATION]: {
        en: {
          title: 'Validation Error',
          message: details || 'Invalid input. Please check your data and try again.',
        },
        zh: {
          title: '验证错误',
          message: details || '输入无效。请检查您的数据后重试。',
        },
      },
      [ErrorType.UNKNOWN]: {
        en: {
          title: 'Unknown Error',
          message: details || 'An unexpected error occurred. Please try again.',
        },
        zh: {
          title: '未知错误',
          message: details || '发生了意外错误。请重试。',
        },
      },
    };

    const lang = isChinese ? 'zh' : 'en';
    return messages[type][lang];
  }

  /**
   * Show error message to user
   */
  showError(error: AppError) {
    const { title, message } = this.getErrorMessage(error.type, error.details);

    ElMessage({
      type: 'error',
      message: message,
      duration: 5000,
      showClose: true,
    });

    // Log to console for debugging
    console.error(`[${error.type}]`, error.message, error.originalError);
  }

  /**
   * Show error dialog with details
   */
  showErrorDialog(error: AppError) {
    const { title, message } = this.getErrorMessage(error.type, error.details);

    ElMessageBox.alert(message, title, {
      type: 'error',
      confirmButtonText: this.language === 'zh_CN' ? '确定' : 'OK',
    });

    // Log to console for debugging
    console.error(`[${error.type}]`, error.message, error.originalError);
  }

  /**
   * Create a standardized error object
   */
  createError(type: ErrorType, message: string, details?: string, originalError?: any): AppError {
    return {
      type,
      message,
      details,
      originalError,
    };
  }

  /**
   * Handle promise rejection with error display
   */
  async handleAsync<T>(
    promise: Promise<T>,
    errorType: ErrorType,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await promise;
    } catch (error: any) {
      const appError = this.createError(errorType, errorMessage, error.message, error);
      this.showError(appError);
      return null;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export convenience functions
export function showError(type: ErrorType, message: string, details?: string, originalError?: any) {
  const error = errorHandler.createError(type, message, details, originalError);
  errorHandler.showError(error);
}

export function showErrorDialog(type: ErrorType, message: string, details?: string, originalError?: any) {
  const error = errorHandler.createError(type, message, details, originalError);
  errorHandler.showErrorDialog(error);
}

export function handleAsync<T>(
  promise: Promise<T>,
  errorType: ErrorType,
  errorMessage: string
): Promise<T | null> {
  return errorHandler.handleAsync(promise, errorType, errorMessage);
}

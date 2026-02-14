import { createI18n } from 'vue-i18n';
import en from './en';
import zh from './zh';
import { store as defaultStore } from '@/global/initLocalStore';

// 从 electron-store 读取保存的语言设置
const savedLanguage = defaultStore.get('language') || 'en_US';

const i18n = createI18n({
  locale: savedLanguage, // 使用保存的语言设置
    messages: {
      'zh_CN': zh, // 中文
      'en_US': en // 英文——美式
    },
    legacy: false, // 使用Composition API，这里必须设置为false
    globalInjection: true,
    global: true,
    fallbackLocale: 'en_US', // 默认语言
});

export default i18n;

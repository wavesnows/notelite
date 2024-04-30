import { createI18n } from 'vue-i18n';
import en from './en';
import zh from './zh';


const i18n = createI18n({
  locale: 'en_US', // 默认显示语音
    messages: {
      'zh_CN': zh, // 中文
      'en_US': en // 英文——美式
    },
    legacy: false, // 使用Composition API，这里必须设置为false
    globalInjection: true,
    global: true,
    fallbackLocale: 'en-US', // 默认语言
});

export default i18n;

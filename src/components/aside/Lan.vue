<template>
    <div class="common">
      <h1>{{msg}}</h1>
      <span>{{ t('common.wait') }}</span>
    </div>
  </template>
  
  <script setup lang="ts">
    import { useI18n } from 'vue-i18n'
    import {computed} from 'vue'
    const { t } = useI18n()
    const msg = computed(() => t('common.plug'))
  </script>
  

  <style scoped>
    .common{
      padding: 5px;
    }

    
  </style>

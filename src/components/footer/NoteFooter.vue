<template>
    <div class="footer">
    </div>
  </template>
  
  <script setup lang="ts">
  import { useTtsStore } from "@/store/store";
  import { storeToRefs } from "pinia";
  
  const ttsStore = useTtsStore();
  const { config} = storeToRefs(ttsStore);
  
  const download = () => {
   // ttsStore.writeFileSync();
  };
  </script>
  

 

  <style scoped>

  .footer {
    border-bottom-right-radius: 10px;
    height: 20px !important;
    align-items: center;
    background-color: var(--note-foot-bgcolor)
  }
  </style>
  
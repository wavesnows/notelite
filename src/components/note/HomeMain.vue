<template>
    <div class="main">
        <Editor v-model="inputs.noteValue" :initialData="inputs.noteValue" ref="editor"></Editor>
    </div>
  </template>
  
  <script setup lang="ts">
  
  import { useTtsStore } from "@/store/store";
  import { storeToRefs } from "pinia";
  import Editor from "../note/Editor.vue"
  
  const { shell } = require("electron");
  var path = require("path");
  const store = useTtsStore();
  const { inputs, page, config } = storeToRefs(store);
  
  
  
  </script>
  
  <style scoped>
  .main {
    width: 100%;
    height: 100%;
   /*background-color: #c28c21;*/
    margin-top: 0 px;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
    display: flex;
    justify-content: space-between;
  }
  </style>
  
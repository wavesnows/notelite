<template>
    <el-page-header class="title" @back="editShow" :icon="Edit" v-show="cnote.titleVisable">
        <template #title >
            <span>Edit</span>
        </template>
        <template #content>
        <span class="text-large font-600 mr-3"> {{cnote.title}}</span>
        </template>
        <template #extra>
            <div class="flex items-center">
                <el-button>Print</el-button>
                <el-button  type="primary">Edit</el-button>
            </div>
        </template>
    </el-page-header>
    <el-input ref="myInput" v-show="!cnote.titleVisable"  v-model="cnote.destTitle"   @blur="okHandler"  /> 
  <!--  <div v-show="!cnote.titleVisable" class= "rename">
        <el-input  v-model="inputs.noteTitle"   @blur="okHandler" autofocuse /> 
        <el-button size="small" type="success" :icon="Check" circle  @click="okHandler"/>
    </div>-->
</template>

<script lang="ts" setup>
import { useTtsStore } from "@/store/store";
import { ElInput,ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import { Edit,Check } from "@element-plus/icons-vue";
import { ref, Ref } from 'vue';
import {renameFile} from '@/libs/fileHandler'

const ttsStore = useTtsStore();
var {cnote} = storeToRefs(ttsStore);

const myInput:Ref<typeof ElInput | null> = ref(null)

const changeHandler = () =>{
    console.log("content change")
}

const editShow = () =>{
    ttsStore.cnote.titleVisable = !ttsStore.cnote.titleVisable
    myInput.value?.focus()
}

const okHandler = () =>{
    console.log("OK")
    ttsStore.cnote.titleVisable = !ttsStore.cnote.titleVisable;
    renameFile()
}

const goBack = () => {
    console.log('go back')
    ElMessage({
    message: 'this is a message.',
    grouping: true,
    offset:40,
    type: 'success'
  })
}
  </script>

<style>
.title{
  margin-top: 5px;
  margin-left: 10px;
}
.rename{
    display: block;
}

</style>
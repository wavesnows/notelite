<template>
  <span class="text-large font-600 mr-3"> {{cnote.title}}</span>
</template>


<script lang="ts" setup>
import { useTtsStore,  } from "@/store/store";
import { storeToRefs } from "pinia";
const ttsStore = useTtsStore();
var {cnote} = storeToRefs(ttsStore);
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
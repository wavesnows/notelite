<template>
  <div>
    <div class="button">
      <div class="box">W</div>
      <div class="box">A</div>
      <div class="box">V</div>
      <div class="box">E</div>
      <div class="box">N</div>
      <div class="box">O</div>
      <div class="box">T</div>
      <div class="box">E</div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
/* From uiverse.io by @mrhyddenn */
.button {
  -webkit-app-region: no-drag;
  display: flex;
 /* border-radius: 10px;*/
}

.box {
  width: 20px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  transition: all 0.8s;
  cursor: pointer;
  position: relative;
  background: rgb(58, 165, 253);
  overflow: hidden;
}

.box:before {
  content: "==";
  position: absolute;
  top: 0;
  background: #67c23a;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(100%);
  transition: transform 0.4s;
}

.box:nth-child(2)::before {
  transform: translateY(-100%);
  content: "wa";
}

.box:nth-child(3)::before {
  content: "ve";
}

.box:nth-child(4)::before {
  transform: translateY(-100%);
  content: "sn";
}

.box:nth-child(5)::before {
  content: "ow";
}
.box:nth-child(6)::before {
  transform: translateY(-100%);
  content: ".c";
}
.box:nth-child(7)::before {
  content: "om";
}
/*
.box:nth-child(8) {
  border-top-right-radius: 10px;
}
*/
.button:hover .box:before {
  transform: translateY(0);
}
</style>

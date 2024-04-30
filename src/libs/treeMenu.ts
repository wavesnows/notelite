import type Node from 'element-plus/es/components/tree/src/model/node'
import { useTtsStore, Tree } from "@/store/store";

export function updateTreeMenu(){
    console.log("update Tree")
    const ttsStore = useTtsStore();
    let treedata:Tree = ttsStore.treeMenu.treeData;
    let node:Node = ttsStore.treeMenu.node;

    const parent = node.parent
    const children: Tree[] = parent.data.children || parent.data
    const index = children.findIndex((d) => d.path === treedata.path)
    children.splice(index, 1)
}

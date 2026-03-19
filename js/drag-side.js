import { sideData } from "./ai-side.js";
import { updateSideResult } from "./ai-side.js";

export function bindSideDrag(el, key) {
  makeDraggable(el, (x,y)=>{
    sideData[key] = { x, y, diameterPx: sideData[key].diameterPx };
    updateSideResult();
  });
}
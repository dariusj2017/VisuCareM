/* File: scripts/detector.js
   Description: MarkerDetector klasė (stub). Reikės OpenCV.js ar kitos logikos marker’ių atpažinimui.
   Metodai:
   - detect(imageData): grąžina marker'ų masyvą: [{ id, center: {x,y}, size: mm }, ...]
*/
class MarkerDetector {
  constructor() {
    // placeholder konfigūracija
  }

  // imageData – ImageData objektas iš canvase
  // returns: [{ id: 'front-1', center: {x,y}, size: 9}, ...]
  detect(imageData) {
    // TODO: įdiegti marker detekciją (naudoti OpenCV.js arba customą)
    // Šiuo metu grąžina tuščią masyvą, kad demo veiktų be detektavimo logikos.
    return [];
  }
}

export function createPanTool({ store, camera, stage }) {
  let start = null, cam0 = null;
  return {
    id: 'pan',
    onDown(e) {
      start = camera.eventPoint(e);
      cam0 = { ...store.camera };
      stage.classList.add('cur-panning');
    },
    onMove(e) {
      if (!start) return;
      const p = camera.eventPoint(e);
      store.setCamera({
        x: cam0.x - (p.x - start.x) / cam0.zoom,
        y: cam0.y - (p.y - start.y) / cam0.zoom,
      });
    },
    onUp() {
      start = null;
      stage.classList.remove('cur-panning');
    },
  };
}

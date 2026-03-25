const State = {
  image: null,
  mmPerPixel: null,

  points: {
    markerTopLeft: null,
    markerTopRight: null,
    markerBottomLeft: null,
    markerBottomRight: null,

    eyeLeft: null,
    eyeRight: null
  },

  autoDetected: {
    marker: false,
    iris: false
  },

  editMode: false,
  dragPoint: null
};
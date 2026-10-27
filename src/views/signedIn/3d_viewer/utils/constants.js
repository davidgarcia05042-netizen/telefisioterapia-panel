export const POSE_LANDMARK_IDS = {
  "LEFT_SHOULDER": 11,
  "RIGHT_SHOULDER": 12,
  "LEFT_ELBOW": 13,
  "RIGHT_ELBOW": 14,
  "LEFT_WRIST": 15,
  "RIGHT_WRIST": 16,
  "LEFT_HIP": 23,
  "RIGHT_HIP": 24,
  "LEFT_KNEE": 25,
  "RIGHT_KNEE": 26,
  "LEFT_ANKLE": 27,
  "RIGHT_ANKLE": 28
};

export const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [27, 29], [27, 31], [29, 31], // Left Foot (Ankle-Heel, Ankle-Toe, Heel-Toe)
  [28, 30], [28, 32], [30, 32]  // Right Foot (Ankle-Heel, Ankle-Toe, Heel-Toe)
];

// Offsets para el zoom de la cámara en el visor 3D (respecto al centroide del esqueleto)
export const CAMERA_OFFSETS = {
  HOME: { x: 2.4, y: 0.4, z: 3.6 },
  CARDINAL: 4.2
};

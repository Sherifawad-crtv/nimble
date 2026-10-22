import type { Keypoint } from './pose-types';

/**
 * Loads TensorFlow.js and the MoveNet model only when camera tracking is actually opened —
 * these packages are not worth adding to every visitor's initial bundle for a feature most
 * sessions never touch.
 */
export async function loadPoseDetector() {
  const [tf, poseDetection] = await Promise.all([
    import('@tensorflow/tfjs-core'),
    (async () => {
      await import('@tensorflow/tfjs-backend-webgl');
      return import('@tensorflow-models/pose-detection');
    })(),
  ]);
  await tf.ready();

  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });

  return {
    async estimate(source: HTMLVideoElement | HTMLCanvasElement): Promise<Keypoint[] | null> {
      // MoveNet's own temporal smoothing (on by default) times itself off the input's
      // `currentTime`, which only a <video> element has — a canvas doesn't, so smoothing was
      // silently doing nothing once frames started going through the rotation-correction canvas.
      // Supplying our own clock here is exactly what the library's docs call for in that case.
      const poses = await detector.estimatePoses(source, { flipHorizontal: false }, performance.now());
      return poses[0]?.keypoints ?? null;
    },
    dispose() {
      detector.dispose();
    },
  };
}

export type PoseDetector = Awaited<ReturnType<typeof loadPoseDetector>>;

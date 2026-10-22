/** A single joint from the pose model, in video-pixel coordinates. Shaped to match
 * @tensorflow-models/pose-detection's output without the rest of the app importing it directly. */
export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export type FormStatus = 'good' | 'warn';

export interface FormFeedback {
  status: FormStatus;
  message: string;
}

export interface RepUpdate {
  /** True exactly once, on the frame a rep completes. */
  repCompleted: boolean;
  feedback: FormFeedback | null;
}

/** One frame in, a verdict out. Each movement tracks its own phase between calls. */
export interface MovementTracker {
  update(points: Keypoint[]): RepUpdate;
  reset(): void;
}

/**
 * PlayerController - Example behavior for player movement.
 * Demonstrates input handling using the Input system and coroutines.
 */

import { Behavior } from '../src/engine/Behavior';

export default class PlayerController extends Behavior {
  /** Movement speed in pixels per second */
  speed: number = 200;

  /** Jump force */
  jumpForce: number = 400;

  /** Is the player grounded? */
  isGrounded: boolean = true;

  /** Current velocity */
  private velocity: [number, number] = [0, 0];

  start(): void {
    console.log(`PlayerController started on ${this.gameObject.name}`);
  }

  update(): void {
    // Get movement from axes (smoothed)
    const moveX = this.getAxis('horizontal');
    const moveY = this.getAxis('vertical');

    // Apply movement
    this.transform.position[0] += moveX * this.speed * this.deltaTime;
    this.transform.position[1] += moveY * this.speed * this.deltaTime;

    // Handle jump - only triggers once per press thanks to getButtonDown
    if (this.getButtonDown('jump') && this.isGrounded) {
      this.velocity[1] = -this.jumpForce;
      this.isGrounded = false;

      // Start jump coroutine for visual feedback
      this.startCoroutine(this.jumpSquash());
    }
  }

  /** Squash and stretch effect during jump */
  *jumpSquash() {
    // Squash on takeoff
    this.transform.scale = [1.2, 0.8];
    yield* this.wait(0.1);

    // Stretch during jump
    this.transform.scale = [0.8, 1.2];
    yield* this.wait(0.2);

    // Return to normal
    this.transform.scale = [1, 1];
  }
}

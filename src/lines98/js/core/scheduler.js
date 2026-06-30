export class GameScheduler {
  constructor() {
    this.tasks = [];
    this.taskIdCounter = 0;
    this.timeScale = 1.0;
    this.paused = false;
  }

  update(dt) {
    if (this.paused || dt <= 0) return;
    const scaledDt = dt * this.timeScale;

    // Filter tasks and run expired ones
    const activeTasks = [];
    const expiredTasks = [];

    for (const task of this.tasks) {
      task.elapsed += scaledDt;
      if (task.elapsed >= task.delay) {
        expiredTasks.push(task);
      } else {
        activeTasks.push(task);
      }
    }

    this.tasks = activeTasks;

    // Run expired tasks
    for (const task of expiredTasks) {
      task.fn();
      if (task.interval) {
        task.elapsed = 0;
        this.tasks.push(task); // Reschedule
      }
    }
  }

  after(ms, fn) {
    const id = ++this.taskIdCounter;
    this.tasks.push({
      id,
      delay: ms,
      elapsed: 0,
      fn,
      interval: false
    });
    return id;
  }

  every(ms, fn) {
    const id = ++this.taskIdCounter;
    this.tasks.push({
      id,
      delay: ms,
      elapsed: 0,
      fn,
      interval: true
    });
    return id;
  }

  cancel(id) {
    this.tasks = this.tasks.filter(task => task.id !== id);
  }

  clear() {
    this.tasks = [];
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setSpeed(speed) {
    this.timeScale = speed;
  }
}

// Export a singleton scheduler instance for global time management
export const scheduler = new GameScheduler();

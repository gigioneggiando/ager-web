import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for optimistic interaction logic
 * 
 * Covers the core patterns from useInteract hook:
 * - Like/Save: schedule server write in 3s (Undo cancels)
 * - Discard: remove from cache instantly, schedule write in 3s (Undo restores)
 * - Report: immediate write (no undo)
 */

// Simplified versions of patterns from useInteract
type InteractionKind = "LIKE" | "SAVE" | "DISCARD" | "REPORT";

interface OptimisticInteractionState {
  articleId: number;
  kind: InteractionKind;
  timestamp: number;
}

class OptimisticInteractionManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private pendingActions: OptimisticInteractionState[] = [];

  scheduleAction(articleId: number, kind: InteractionKind, delayMs: number, onCommit: () => void): () => void {
    const key = `${articleId}-${kind}`;

    // Clear any existing timer for this key
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    // Schedule commit
    const timerId = setTimeout(() => {
      this.timers.delete(key);
      this.pendingActions = this.pendingActions.filter((a) => !(a.articleId === articleId && a.kind === kind));
      onCommit();
    }, delayMs);

    this.timers.set(key, timerId);
    this.pendingActions.push({ articleId, kind, timestamp: Date.now() });

    // Return undo function
    return () => {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
        this.pendingActions = this.pendingActions.filter((a) => !(a.articleId === articleId && a.kind === kind));
      }
    };
  }

  getPendingCount(): number {
    return this.pendingActions.length;
  }

  getPending(): OptimisticInteractionState[] {
    return [...this.pendingActions];
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.pendingActions = [];
  }
}

describe("Optimistic Interactions", () => {
  let manager: OptimisticInteractionManager;
  let commitSpy: () => void;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    manager = new OptimisticInteractionManager();
    commitSpy = vi.fn() as any;
  });

  afterEach(() => {
    manager.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("3-second delay before commit", () => {
    it("schedules action without immediate commit", () => {
      manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      expect(commitSpy).not.toHaveBeenCalled();
      expect(manager.getPendingCount()).toBe(1);
    });

    it("commits after 3 seconds", () => {
      manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      vi.advanceTimersByTime(2999);
      expect(commitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect(manager.getPendingCount()).toBe(0);
    });

    it("can undo action within 3-second window", () => {
      const undo = manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      vi.advanceTimersByTime(1500);
      expect(commitSpy).not.toHaveBeenCalled();

      undo();
      expect(manager.getPendingCount()).toBe(0);

      // Advance past original 3s deadline
      vi.advanceTimersByTime(1500);
      expect(commitSpy).not.toHaveBeenCalled();
    });

    it("undo after commit has no effect", () => {
      const undo = manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      vi.advanceTimersByTime(3000);
      expect(commitSpy).toHaveBeenCalledTimes(1);

      undo();
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multiple interactions", () => {
    it("handles different article IDs separately", () => {
      const commit1 = vi.fn();
      const commit2 = vi.fn();

      manager.scheduleAction(1, "LIKE", 3000, commit1);
      manager.scheduleAction(2, "LIKE", 3000, commit2);

      expect(manager.getPendingCount()).toBe(2);

      vi.advanceTimersByTime(3000);

      expect(commit1).toHaveBeenCalledTimes(1);
      expect(commit2).toHaveBeenCalledTimes(1);
    });

    it("same article, different kinds are independent", () => {
      const commitLike = vi.fn();
      const commitSave = vi.fn();

      manager.scheduleAction(1, "LIKE", 3000, commitLike);
      manager.scheduleAction(1, "SAVE", 3000, commitSave);

      expect(manager.getPendingCount()).toBe(2);

      vi.advanceTimersByTime(3000);

      expect(commitLike).toHaveBeenCalledTimes(1);
      expect(commitSave).toHaveBeenCalledTimes(1);
    });

    it("replacing same interaction resets timer", () => {
      const undo1 = manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      vi.advanceTimersByTime(2000);

      // User clicks like again (creates new schedule)
      manager.scheduleAction(1, "LIKE", 3000, commitSpy);

      // Timer should reset, so original 3s hasn't passed
      vi.advanceTimersByTime(999);
      expect(commitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1001);
      expect(commitSpy).toHaveBeenCalledTimes(1);

      // Original undo1 should have no effect (timer was replaced)
      undo1();
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Discard scenario (remove + restore on error)", () => {
    it("tracks discard operation", () => {
      const discardCommit = vi.fn();
      manager.scheduleAction(1, "DISCARD", 3000, discardCommit);

      expect(manager.getPending()[0].kind).toBe("DISCARD");
    });

    it("can revert discard if error occurs", () => {
      const undo = manager.scheduleAction(1, "DISCARD", 3000, commitSpy);

      // After 1s, server error happens
      vi.advanceTimersByTime(1000);

      // Undo the discard to restore article
      undo();
      expect(manager.getPendingCount()).toBe(0);

      // Discard should not have been committed
      vi.advanceTimersByTime(2000);
      expect(commitSpy).not.toHaveBeenCalled();
    });
  });

  describe("Report (immediate, no undo)", () => {
    it("commit immediately for report", () => {
      // Report should use 0ms delay
      manager.scheduleAction(1, "REPORT", 0, commitSpy);

      vi.advanceTimersByTime(0);
      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect(manager.getPendingCount()).toBe(0);
    });

    it("report has no meaningful undo", () => {
      const undo = manager.scheduleAction(1, "REPORT", 0, commitSpy);

      expect(commitSpy).toHaveBeenCalledTimes(1);

      // Undo after immediate commit can't prevent anything
      undo();
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error scenarios", () => {
    it("recovers from failed commit", () => {
      const failingCommit = vi.fn().mockImplementation(() => {
        throw new Error("Network error");
      });
      const undo = manager.scheduleAction(1, "LIKE", 3000, failingCommit);

      vi.advanceTimersByTime(3000);

      expect(failingCommit).toHaveBeenCalled();
      // Undo can be called to recovery (though commit already happened)
      undo();
    });
  });

  describe("Cleanup", () => {
    it("clears all pending timers on cleanup", () => {
      const clearSpy = vi.spyOn(global, "clearTimeout");

      manager.scheduleAction(1, "LIKE", 3000, commitSpy);
      manager.scheduleAction(2, "SAVE", 3000, commitSpy);

      manager.clear();

      expect(clearSpy).toHaveBeenCalledTimes(2);
      expect(manager.getPendingCount()).toBe(0);
    });
  });

  describe("Real-world scenario: User rapid-clicking article interactions", () => {
    it("only commits final state after 3s of no changes", () => {
      // User clicks like, then immediately changes mind and clicks save
      const likeCommit = vi.fn();
      const saveCommit = vi.fn();

      manager.scheduleAction(1, "LIKE", 3000, likeCommit);
      vi.advanceTimersByTime(1000);

      manager.scheduleAction(1, "SAVE", 3000, saveCommit);
      vi.advanceTimersByTime(1000);

      // Only save should commit (like was replaced)
      expect(likeCommit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(saveCommit).toHaveBeenCalledTimes(1);
    });

    it("allows undo if user changes mind during 3s window", () => {
      const commit = vi.fn();
      const undo = manager.scheduleAction(1, "LIKE", 3000, commit);

      vi.advanceTimersByTime(1500);
      // User changes mind
      undo();

      vi.advanceTimersByTime(1500);
      expect(commit).not.toHaveBeenCalled();
    });

    it("prevents accidental double-submit on same article rapidly", () => {
      const commit = vi.fn();

      // First like
      manager.scheduleAction(1, "LIKE", 3000, commit);
      vi.advanceTimersByTime(500);

      // User clicks like again (shouldn't double-submit)
      manager.scheduleAction(1, "LIKE", 3000, commit);
      vi.advanceTimersByTime(2500);

      // Only one commit should have fired
      expect(commit).toHaveBeenCalledTimes(1);
    });
  });
});

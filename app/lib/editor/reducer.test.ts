import { describe, expect, it } from "vitest";
import {
  createInitialEditorState,
  editorReducer,
  HISTORY_LIMIT,
} from "./reducer";
import { createProject, createDefaultAdjustments } from "./defaults";

function blankProject() {
  return createProject({
    name: "t.jpg",
    mimeType: "image/jpeg",
    width: 100,
    height: 80,
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
  });
}

describe("editorReducer history", () => {
  it("coalesces continuous slider updates into one history entry", () => {
    let state = createInitialEditorState();
    state = editorReducer(state, {
      type: "LOAD_PROJECT",
      project: blankProject(),
    });
    state = editorReducer(state, {
      type: "SET_ADJUSTMENT",
      key: "contrast",
      value: 10,
      coalesce: true,
    });
    state = editorReducer(state, {
      type: "SET_ADJUSTMENT",
      key: "contrast",
      value: 20,
      coalesce: true,
    });
    state = editorReducer(state, {
      type: "SET_ADJUSTMENT",
      key: "contrast",
      value: 30,
      coalesce: true,
    });
    expect(state.past).toHaveLength(1);
    expect(state.project?.adjustments.contrast).toBe(30);
    expect(state.past[0]?.adjustments.contrast).toBe(0);
  });

  it("undo/redo boundaries work", () => {
    let state = createInitialEditorState();
    state = editorReducer(state, {
      type: "LOAD_PROJECT",
      project: blankProject(),
    });
    state = editorReducer(state, {
      type: "SET_ADJUSTMENT",
      key: "exposure",
      value: 0.5,
      coalesce: false,
    });
    state = editorReducer(state, { type: "UNDO" });
    expect(state.project?.adjustments.exposure).toBe(0);
    state = editorReducer(state, { type: "REDO" });
    expect(state.project?.adjustments.exposure).toBe(0.5);
    state = editorReducer(state, { type: "REDO" });
    expect(state.project?.adjustments.exposure).toBe(0.5);
  });

  it("reset all adjustments restores defaults and records history", () => {
    let state = createInitialEditorState();
    const project = blankProject();
    project.adjustments.saturation = 40;
    state = editorReducer(state, { type: "LOAD_PROJECT", project });
    state = editorReducer(state, { type: "RESET_ALL_ADJUSTMENTS" });
    expect(state.project?.adjustments).toEqual(createDefaultAdjustments());
    expect(state.past).toHaveLength(1);
  });

  it("caps history length", () => {
    let state = createInitialEditorState();
    state = editorReducer(state, {
      type: "LOAD_PROJECT",
      project: blankProject(),
    });
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      state = editorReducer(state, {
        type: "SET_ADJUSTMENT",
        key: "brightness",
        value: i,
        coalesce: false,
      });
    }
    expect(state.past.length).toBeLessThanOrEqual(HISTORY_LIMIT);
  });
});

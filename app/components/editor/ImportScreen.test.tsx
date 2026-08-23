import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportScreen } from "./ImportScreen";

function makeFile(name = "photo.jpg", type = "image/jpeg") {
  return new File(["pixels"], name, { type });
}

/** dataTransfer is not constructible in jsdom, so hand-roll what drop reads. */
function dropWith(files: File[]) {
  return { dataTransfer: { files, items: [], types: ["Files"] } };
}

describe("import errors", () => {
  it("announces the failure to assistive tech", () => {
    render(
      <ImportScreen
        onImport={vi.fn()}
        error="This photo is over the 75 MB limit. Try a smaller copy."
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/over the 75 MB limit/i);
  });

  it("shows no alert when there is nothing wrong", () => {
    render(<ImportScreen onImport={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the action available so the user can retry", () => {
    render(<ImportScreen onImport={vi.fn()} error="That file type isn't supported." />);
    expect(screen.getByRole("button", { name: /open photo/i })).toBeEnabled();
  });
});

describe("busy state", () => {
  it("replaces the action with a status while decoding", () => {
    render(<ImportScreen onImport={vi.fn()} busy="Opening photo…" />);

    expect(screen.getByRole("status")).toHaveTextContent(/opening photo/i);
    expect(
      screen.queryByRole("button", { name: /open photo/i }),
    ).not.toBeInTheDocument();
  });

  it("ignores a drop that lands mid-decode", () => {
    const onImport = vi.fn();
    const { container } = render(
      <ImportScreen onImport={onImport} busy="Opening photo…" />,
    );

    fireEvent.drop(container.firstChild as Element, dropWith([makeFile()]));
    expect(onImport).not.toHaveBeenCalled();
  });
});

describe("file selection", () => {
  it("passes the chosen file to the importer", async () => {
    const onImport = vi.fn();
    render(<ImportScreen onImport={onImport} />);

    const input = screen.getByLabelText(/open photo/i, {
      selector: "input[type=file]",
    });
    await userEvent.upload(input, makeFile("beach.heic", "image/heic"));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0].name).toBe("beach.heic");
  });

  it("imports the first file when several are dropped", () => {
    const onImport = vi.fn();
    const { container } = render(<ImportScreen onImport={onImport} />);

    fireEvent.drop(
      container.firstChild as Element,
      dropWith([makeFile("first.jpg"), makeFile("second.jpg")]),
    );

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0].name).toBe("first.jpg");
  });

  it("does nothing when a drop carries no files", () => {
    const onImport = vi.fn();
    const { container } = render(<ImportScreen onImport={onImport} />);

    fireEvent.drop(container.firstChild as Element, dropWith([]));
    expect(onImport).not.toHaveBeenCalled();
  });
});

describe("drag affordance", () => {
  it("survives a pointer crossing child elements", () => {
    const { container } = render(<ImportScreen onImport={vi.fn()} />);
    const root = container.firstChild as Element;
    const heading = screen.getByRole("heading", { level: 1 });

    fireEvent.dragEnter(root);
    expect(root.querySelector(".border-dashed")).toBeInTheDocument();

    // Entering a child fires leave on the parent; naive handling drops the
    // highlight here, which is the flicker the depth counter exists to stop.
    fireEvent.dragEnter(heading);
    fireEvent.dragLeave(root);
    expect(root.querySelector(".border-dashed")).toBeInTheDocument();

    fireEvent.dragLeave(heading);
    expect(root.querySelector(".border-dashed")).not.toBeInTheDocument();
  });

  it("does not invite a drop while busy", () => {
    const { container } = render(
      <ImportScreen onImport={vi.fn()} busy="Opening photo…" />,
    );
    const root = container.firstChild as Element;

    fireEvent.dragEnter(root);
    expect(root.querySelector(".border-dashed")).not.toBeInTheDocument();
  });
});

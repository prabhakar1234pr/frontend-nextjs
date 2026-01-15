import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import UncommittedChangesDialog from "../app/components/workspace/UncommittedChangesDialog";

describe("UncommittedChangesDialog", () => {
  it("renders file list and handles actions", () => {
    const onClose = jest.fn();
    const onAction = jest.fn();

    render(
      <UncommittedChangesDialog
        open
        files={["README.md", "src/app.tsx"]}
        onClose={onClose}
        onAction={onAction}
      />
    );

    expect(screen.getByText("Uncommitted changes")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("src/app.tsx")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Auto-Commit"));
    expect(onAction).toHaveBeenCalledWith("commit");
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import GitPanel from "../app/components/workspace/GitPanel";

const baseStatus = {
  success: true,
  branch: "main",
  ahead: 1,
  behind: 0,
  modified: ["README.md"],
  staged: [],
  untracked: [],
};

describe("GitPanel", () => {
  it("renders status and commits", () => {
    render(
      <GitPanel
        status={baseStatus}
        commits={[
          {
            sha: "abc123",
            author_name: "Test User",
            author_email: "test@example.com",
            date: "2024-01-01",
            message: "Initial commit",
          },
        ]}
        onPull={() => {}}
        onPush={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(screen.getByText("Git Status")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("Initial commit")).toBeInTheDocument();
  });

  it("fires action callbacks", () => {
    const onPull = jest.fn();
    const onPush = jest.fn();
    const onRefresh = jest.fn();

    render(
      <GitPanel
        status={baseStatus}
        commits={[]}
        onPull={onPull}
        onPush={onPush}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText("Pull"));
    fireEvent.click(screen.getByText("Push"));
    fireEvent.click(screen.getByText("Refresh"));

    expect(onPull).toHaveBeenCalledTimes(1);
    expect(onPush).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

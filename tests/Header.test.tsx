import React from "react";
import { render, screen } from "@testing-library/react";

import Header from "../app/components/Header";

jest.mock("next/link", () => {
  return function Link({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
  SignedIn: () => null,
  SignedOut: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isLoaded: true, userId: null }),
}));

describe("Header", () => {
  it("renders signed-out actions", () => {
    render(<Header />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
    expect(screen.getByText("GitGuide")).toBeInTheDocument();
  });
});



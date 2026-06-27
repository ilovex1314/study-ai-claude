import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const arch = { type: "feedback", summary: "s", conclusion: "c", renderMode: "diagram",
  nodes: [{ id: "n1", label: "线上反馈" }, { id: "n2", label: "评估" }, { id: "n3", label: "回归" }],
  edges: [{ from: "n3", to: "n1", relation: "feedback" }], groups: [] } as const;

it("renders a node per architecture node", () => {
  const { container } = render(<ArchitectureDiagram architecture={arch as any} />);
  expect(container.querySelectorAll("[data-node-id]").length).toBe(3);
});

it("never renders arrow characters inside node text", () => {
  const { container } = render(<ArchitectureDiagram architecture={arch as any} />);
  for (const el of container.querySelectorAll(".architecture-node")) {
    expect(el.textContent).not.toMatch(/[→←↔]|->|<-/);
  }
});

it("renders nothing when renderMode is none", () => {
  const { container } = render(<ArchitectureDiagram architecture={{ ...arch, renderMode: "none" } as any} />);
  expect(container.firstChild).toBeNull();
});

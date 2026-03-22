import { describe, it, expect } from "vitest";
import * as path from "path";
import { parseArtifact, detectArtifactType } from "../../src/parser/artifact-parser.js";
import { parsePrd } from "../../src/parser/prd-parser.js";
import { parseArchitecture } from "../../src/parser/architecture-parser.js";

const FIXTURES = path.join(__dirname, "..", "fixtures");

describe("artifact-parser", () => {
  describe("parseArtifact", () => {
    it("parses PRD.md with frontmatter and sections", () => {
      const result = parseArtifact(path.join(FIXTURES, "PRD.md"), "prd");

      expect(result.type).toBe("prd");
      expect(result.title).toBe("PlantPal - Product Requirements Document");
      expect(result.content).toContain("PlantPal is a mobile application");
      expect(result.filePath).toContain("PRD.md");
      expect(result.frontmatter.version).toBe("1.0");
      expect(result.frontmatter.stepsCompleted).toEqual(["discovery", "requirements"]);
    });

    it("extracts sections from PRD", () => {
      const result = parseArtifact(path.join(FIXTURES, "PRD.md"), "prd");

      const headings = result.sections.map((s) => s.heading);
      expect(headings).toContain("PlantPal - Product Requirements Document");
      expect(headings).toContain("Overview");
      expect(headings).toContain("Functional Requirements");
      expect(headings).toContain("Non-Functional Requirements");
    });

    it("parses architecture.md", () => {
      const result = parseArtifact(
        path.join(FIXTURES, "architecture.md"),
        "architecture",
      );

      expect(result.type).toBe("architecture");
      expect(result.title).toBe("PlantPal - Architecture Document");
      expect(result.content).toContain("React Native");
      expect(result.frontmatter.stepsCompleted).toEqual([
        "tech-stack",
        "architecture-decisions",
      ]);
    });

    it("parses ux-spec.md without frontmatter", () => {
      const result = parseArtifact(
        path.join(FIXTURES, "ux-spec.md"),
        "ux-spec",
      );

      expect(result.type).toBe("ux-spec");
      expect(result.title).toBe("PlantPal - UX Specification");
      expect(result.frontmatter).toEqual({});
    });

    it("parses product-brief.md", () => {
      const result = parseArtifact(
        path.join(FIXTURES, "product-brief.md"),
        "product-brief",
      );

      expect(result.type).toBe("product-brief");
      expect(result.title).toBe("PlantPal - Product Brief");
      expect(result.content).toContain("Make plant care effortless");
    });

    it("parses project-context.md", () => {
      const result = parseArtifact(
        path.join(FIXTURES, "project-context.md"),
        "project-context",
      );

      expect(result.type).toBe("project-context");
      expect(result.title).toBe("PlantPal - Project Context");
    });
  });

  describe("parsePrd", () => {
    it("returns a prd-typed artifact", () => {
      const result = parsePrd(path.join(FIXTURES, "PRD.md"));
      expect(result.type).toBe("prd");
      expect(result.title).toContain("Product Requirements Document");
    });
  });

  describe("parseArchitecture", () => {
    it("returns an architecture-typed artifact", () => {
      const result = parseArchitecture(
        path.join(FIXTURES, "architecture.md"),
      );
      expect(result.type).toBe("architecture");
      expect(result.title).toContain("Architecture");
    });
  });

  describe("detectArtifactType", () => {
    it("detects PRD from filename", () => {
      expect(detectArtifactType("PRD.md")).toBe("prd");
      expect(detectArtifactType("prd.md")).toBe("prd");
    });

    it("detects architecture from filename", () => {
      expect(detectArtifactType("architecture.md")).toBe("architecture");
    });

    it("detects ux-spec from filename", () => {
      expect(detectArtifactType("ux-spec.md")).toBe("ux-spec");
      expect(detectArtifactType("ux-design.md")).toBe("ux-spec");
    });

    it("detects product-brief from filename", () => {
      expect(detectArtifactType("product-brief.md")).toBe("product-brief");
      expect(detectArtifactType("brief.md")).toBe("product-brief");
    });

    it("detects project-context from filename", () => {
      expect(detectArtifactType("project-context.md")).toBe("project-context");
    });

    it("returns undefined for unknown files", () => {
      expect(detectArtifactType("random-notes.md")).toBeUndefined();
      expect(detectArtifactType("readme.md")).toBeUndefined();
    });
  });
});

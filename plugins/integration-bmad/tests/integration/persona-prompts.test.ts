/**
 * Persona Prompts Integration Test
 *
 * Tests getPersonaSystemPrompt() and getPersonaConfig() for all 9 BMAD personas.
 * Verifies prompt structure, persona identity injection, and ClaudeCodeConfig generation.
 */

import { describe, it, expect } from "vitest";

import {
  BMAD_PERSONAS,
  getPersonaSystemPrompt,
  getPersonaConfig,
} from "../../src/persona-prompts.js";

// =============================================================================
// Tests
// =============================================================================

describe("Persona Prompts Integration", () => {
  const ALL_PERSONA_IDS = Object.keys(BMAD_PERSONAS);

  describe("BMAD_PERSONAS definitions", () => {
    it("defines exactly 9 personas", () => {
      expect(ALL_PERSONA_IDS.length).toBe(9);
    });

    it("includes all expected persona IDs", () => {
      const expected = [
        "analyst",
        "pm",
        "architect",
        "ux-designer",
        "sm",
        "dev",
        "qa",
        "quick-flow",
        "tech-writer",
      ];
      for (const id of expected) {
        expect(BMAD_PERSONAS[id]).toBeDefined();
      }
    });

    it("all personas have required fields", () => {
      for (const [id, persona] of Object.entries(BMAD_PERSONAS)) {
        expect(persona.id, `${id}.id`).toBe(id);
        expect(persona.name, `${id}.name`).toBeTruthy();
        expect(persona.role, `${id}.role`).toBeTruthy();
        expect(persona.skillId, `${id}.skillId`).toBeTruthy();
        expect(persona.identity, `${id}.identity`).toBeTruthy();
        expect(persona.communicationStyle, `${id}.communicationStyle`).toBeTruthy();
        expect(persona.principles.length, `${id}.principles`).toBeGreaterThan(0);
        expect(persona.skills.length, `${id}.skills`).toBeGreaterThan(0);
      }
    });

    it("all persona skills have required fields", () => {
      for (const [id, persona] of Object.entries(BMAD_PERSONAS)) {
        for (const skill of persona.skills) {
          expect(skill.code, `${id} skill code`).toBeTruthy();
          expect(skill.description, `${id} skill description`).toBeTruthy();
          expect(skill.skillId, `${id} skill skillId`).toBeTruthy();
        }
      }
    });

    it("persona IDs match their record keys", () => {
      for (const [key, persona] of Object.entries(BMAD_PERSONAS)) {
        expect(persona.id).toBe(key);
      }
    });

    it("all personas have unique names", () => {
      const names = Object.values(BMAD_PERSONAS).map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("getPersonaSystemPrompt", () => {
    it("returns a valid prompt for every persona", () => {
      for (const id of ALL_PERSONA_IDS) {
        const prompt = getPersonaSystemPrompt(id);
        expect(prompt, `prompt for ${id}`).toBeTruthy();
        expect(typeof prompt).toBe("string");
        expect(prompt.length).toBeGreaterThan(100);
      }
    });

    it("includes persona name and role in prompt", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain(persona.name);
        expect(prompt).toContain(persona.role);
      }
    });

    it("includes identity section", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain("### Identity");
        expect(prompt).toContain(persona.identity);
      }
    });

    it("includes communication style section", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain("### Communication Style");
        expect(prompt).toContain(persona.communicationStyle);
      }
    });

    it("includes all principles", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain("### Core Principles");
        for (const principle of persona.principles) {
          expect(prompt).toContain(principle);
        }
      }
    });

    it("includes all skills with codes", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain("### Available Skills");
        for (const skill of persona.skills) {
          expect(prompt).toContain(`[${skill.code}]`);
          expect(prompt).toContain(skill.description);
        }
      }
    });

    it("includes guidelines section with persona name", () => {
      for (const id of ALL_PERSONA_IDS) {
        const persona = BMAD_PERSONAS[id];
        const prompt = getPersonaSystemPrompt(id);

        expect(prompt).toContain("### Guidelines");
        expect(prompt).toContain(`Stay in character as ${persona.name}`);
      }
    });

    it("throws for unknown persona ID", () => {
      expect(() => getPersonaSystemPrompt("nonexistent")).toThrow(
        /Unknown BMAD persona/,
      );
    });

    it("error message lists valid persona IDs", () => {
      try {
        getPersonaSystemPrompt("nonexistent");
      } catch (e: any) {
        for (const id of ALL_PERSONA_IDS) {
          expect(e.message).toContain(id);
        }
      }
    });
  });

  describe("getPersonaConfig", () => {
    it("returns a valid ClaudeCodeConfig partial for every persona", () => {
      for (const id of ALL_PERSONA_IDS) {
        const config = getPersonaConfig(id);
        expect(config, `config for ${id}`).toBeDefined();
        expect(config.appendSystemPrompt).toBeTruthy();
      }
    });

    it("appendSystemPrompt matches getPersonaSystemPrompt output", () => {
      for (const id of ALL_PERSONA_IDS) {
        const config = getPersonaConfig(id);
        const prompt = getPersonaSystemPrompt(id);
        expect(config.appendSystemPrompt).toBe(prompt);
      }
    });

    it("throws for unknown persona ID", () => {
      expect(() => getPersonaConfig("nonexistent")).toThrow(
        /Unknown BMAD persona/,
      );
    });

    it("config is a partial (no other properties set)", () => {
      const config = getPersonaConfig("dev");
      const keys = Object.keys(config);
      expect(keys).toEqual(["appendSystemPrompt"]);
    });
  });

  describe("Specific persona validation", () => {
    it("analyst (Mary) has brainstorming and research skills", () => {
      const persona = BMAD_PERSONAS.analyst;
      expect(persona.name).toBe("Mary");
      const skillCodes = persona.skills.map((s) => s.code);
      expect(skillCodes).toContain("BP");
      expect(skillCodes).toContain("MR");
    });

    it("pm (John) has PRD creation and validation skills", () => {
      const persona = BMAD_PERSONAS.pm;
      expect(persona.name).toBe("John");
      const skillCodes = persona.skills.map((s) => s.code);
      expect(skillCodes).toContain("CP");
      expect(skillCodes).toContain("VP");
    });

    it("dev (Amelia) has story development and code review skills", () => {
      const persona = BMAD_PERSONAS.dev;
      expect(persona.name).toBe("Amelia");
      const skillCodes = persona.skills.map((s) => s.code);
      expect(skillCodes).toContain("DS");
      expect(skillCodes).toContain("CR");
    });

    it("qa (Quinn) has E2E test generation skill", () => {
      const persona = BMAD_PERSONAS.qa;
      expect(persona.name).toBe("Quinn");
      const skillCodes = persona.skills.map((s) => s.code);
      expect(skillCodes).toContain("QA");
    });

    it("sm (Bob) has sprint planning and story creation skills", () => {
      const persona = BMAD_PERSONAS.sm;
      expect(persona.name).toBe("Bob");
      const skillCodes = persona.skills.map((s) => s.code);
      expect(skillCodes).toContain("SP");
      expect(skillCodes).toContain("CS");
    });
  });
});

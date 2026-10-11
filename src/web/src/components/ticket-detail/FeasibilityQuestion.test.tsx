import { expect, test } from "bun:test";
import * as React from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeTicket } from "../../../../server/testing/fixtures.ts";
import type { FeasibilityAnswerRun } from "@shared/schemas";
import { FeasibilityQuestion } from "./FeasibilityQuestion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const baseRun: FeasibilityAnswerRun = {
  id: "run", question: "Colour?", questionIndex: 0, answer: "Blue", revision: 0, reportVersion: 1, status: "failed", error: "Provider error",
};

function render(run?: FeasibilityAnswerRun): string {
  return renderToStaticMarkup(<FeasibilityQuestion
    ticket={makeTicket({ column: "todo", feasibilityReportVersion: 1, feasibilityAnswers: run ? [run] : [] })}
    question={{ question: "Colour?", recommendedAnswer: null }} index={0} onSubmit={async () => ({ started: true, id: "next" })} />);
}

test("question input has a label, bounded textarea and submit action", () => {
  const html = render();
  expect(html).toContain("Colour?");
  expect(html).toMatch(/<label[^>]+for="([^"]+)"/);
  const inputId = html.match(/<label[^>]+for="([^"]+)"/)?.[1];
  expect(html).toContain(`id="${inputId}"`);
  expect(html).toContain('maxLength="10000"');
  expect(html).toContain('type="submit"');
  expect(html).toContain("Intégrer la réponse");
  expect(html).toContain('aria-describedby=');
});

test("pending, success and failure states are accessible and keep the persisted answer", () => {
  const pending = render({ ...baseRun, status: "running", error: null });
  expect(pending).toContain('aria-busy="true"');
  expect(pending).toContain("Intégration en cours");
  expect(pending).toContain("Blue</textarea>");
  const done = render({ ...baseRun, status: "done", error: null });
  expect(done).toContain("Réponse intégrée dans la description.");
  expect(done).toContain('disabled=""');
  const failed = render(baseRun);
  expect(failed).toContain('role="alert"');
  expect(failed).toContain("Provider error");
  expect(failed).toContain("Réessayer");
  expect(failed).toContain("Blue</textarea>");
});

type QuestionProps = Parameters<typeof FeasibilityQuestion>[0];
interface InteractionProps {
  children?: ReactNode;
  value?: string;
  disabled?: boolean;
  type?: string;
  maxLength?: number;
  onClick?: () => void;
  onChange?: (event: { target: { value: string } }) => void;
  onSubmit?: (event: { preventDefault: () => void }) => void;
}

/** No DOM renderer is installed. Drive the returned elements with a minimal React 18
 * dispatcher, keeping the component's handlers and useLocalDraft implementation real.
 * This does not simulate browser event bubbling or native form validation. */
function interactionHarness(initialProps: QuestionProps) {
  const internals: unknown = Reflect.get(React, "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED");
  if (typeof internals !== "object" || internals === null) throw new Error("React 18 internals unavailable");
  const dispatcher: unknown = Reflect.get(internals, "ReactCurrentDispatcher");
  if (typeof dispatcher !== "object" || dispatcher === null) throw new Error("React dispatcher unavailable");
  const dispatcherRef = dispatcher;
  const slots: unknown[] = [];
  let cursor = 0;
  let dirty = false;
  let props = initialProps;
  let tree: ReactNode;
  const hooks = {
    useId: () => "test-question",
    useState: (initial: unknown) => {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = typeof initial === "function" ? initial() : initial;
      return [slots[slot], (next: unknown) => {
        slots[slot] = typeof next === "function" ? next(slots[slot]) : next;
        dirty = true;
      }];
    },
    useRef: (initial: unknown) => {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
  };
  function render(nextProps = props): void {
    props = nextProps;
    const previous: unknown = Reflect.get(dispatcherRef, "current");
    Reflect.set(dispatcherRef, "current", hooks);
    try {
      let attempts = 0;
      do {
        dirty = false;
        cursor = 0;
        tree = FeasibilityQuestion(props);
        if (++attempts > 10) throw new Error("Too many render-phase updates");
      } while (dirty);
    } finally {
      Reflect.set(dispatcherRef, "current", previous);
    }
  }
  function elements(node: ReactNode): React.ReactElement<InteractionProps>[] {
    return React.Children.toArray(node).flatMap((child) => React.isValidElement<InteractionProps>(child)
      ? [child, ...elements(child.props.children)] : []);
  }
  function find(predicate: (element: React.ReactElement<InteractionProps>) => boolean): InteractionProps {
    const element = elements(tree).find(predicate);
    if (!element) throw new Error("Expected element missing");
    return element.props;
  }
  render();
  return {
    render,
    textarea: () => find((element) => element.type === Textarea),
    copy: () => find((element) => element.type === Button && element.props.type === "button"),
    hasCopy: () => elements(tree).some((element) => element.type === Button && element.props.type === "button"),
    clickCopy: () => {
      const button = find((element) => element.type === Button && element.props.type === "button");
      if (button.disabled) throw new Error("Cannot click a disabled button");
      if (!button.onClick) throw new Error("Copy handler missing");
      button.onClick();
      render();
    },
    edit: (value: string) => {
      const textarea = find((element) => element.type === Textarea);
      if (textarea.disabled) throw new Error("Cannot edit a disabled textarea");
      if (!textarea.onChange) throw new Error("Change handler missing");
      textarea.onChange({ target: { value } });
      render();
    },
    submit: () => {
      const form = find((element) => element.type === "form");
      if (!form.onSubmit) throw new Error("Submit handler missing");
      form.onSubmit({ preventDefault: () => undefined });
      render();
    },
  };
}

async function withDraftStorage(run: (drafts: Map<string, string>) => void | Promise<void>): Promise<void> {
  const drafts = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => drafts.get(key) ?? null,
      setItem: (key: string, value: string) => { drafts.set(key, value); },
      removeItem: (key: string) => { drafts.delete(key); },
    } },
  });
  try {
    await run(drafts);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

function questionProps(overrides: Partial<QuestionProps> = {}): QuestionProps {
  return {
    ticket: makeTicket({ id: "copy-ticket", column: "todo", feasibilityReportVersion: 1 }),
    question: { question: "Colour?", recommendedAnswer: "  Blue\nwith white  " },
    index: 0,
    onSubmit: async () => ({ started: true, id: "next" }),
    ...overrides,
  };
}

test("copy replaces a draft without submitting, stays editable and persists on reopening", async () => {
  await withDraftStorage((drafts) => {
    const key = "draft:feasibility:copy-ticket:1:0";
    drafts.set(key, "Existing draft");
    const submissions: unknown[] = [];
    const props = questionProps({ onSubmit: async (input) => {
      submissions.push(input);
      return { started: true, id: "next" };
    } });
    const recommendation = props.question.recommendedAnswer;
    if (recommendation === null) throw new Error("Recommendation missing");
    const view = interactionHarness(props);
    expect(view.textarea().value).toBe("Existing draft");
    expect(view.copy().children).toBe("Utiliser la réponse conseillée");
    expect(view.copy().type).toBe("button");
    view.clickCopy();
    expect(view.textarea().value).toBe(recommendation);
    expect(drafts.get(key)).toBe(recommendation);
    expect(submissions).toHaveLength(0);
    expect(view.textarea().disabled).toBe(false);
    view.edit("My edited answer");
    expect(drafts.get(key)).toBe("My edited answer");
    expect(interactionHarness(props).textarea().value).toBe("My edited answer");
    expect(submissions).toHaveLength(0);
    view.submit();
    expect(submissions).toEqual([{ answer: "My edited answer", questionIndex: 0,
      revision: props.ticket.feasibilityRevision, reportVersion: 1 }]);
  });
});

test("copied drafts remain isolated across questions, reports and tickets", async () => {
  await withDraftStorage((drafts) => {
    const props = questionProps();
    const recommendation = props.question.recommendedAnswer;
    if (recommendation === null) throw new Error("Recommendation missing");
    const view = interactionHarness(props);
    view.clickCopy();
    const second = { ...props, index: 1, question: { question: "Size?", recommendedAnswer: "Large" } };
    view.render(second);
    expect(view.textarea().value).toBe("");
    view.clickCopy();
    expect(drafts.get("draft:feasibility:copy-ticket:1:0")).toBe(recommendation);
    expect(drafts.get("draft:feasibility:copy-ticket:1:1")).toBe("Large");
    view.render({ ...props, ticket: { ...props.ticket, feasibilityReportVersion: 2 } });
    expect(view.textarea().value).toBe("");
    view.render({ ...props, ticket: { ...props.ticket, id: "other-ticket" } });
    expect(view.textarea().value).toBe("");
    view.render(props);
    expect(view.textarea().value).toBe(recommendation);
  });
});

test("null, empty and whitespace-only recommendations have no copy action", () => {
  for (const recommendedAnswer of [null, "", " \n\t "]) {
    expect(interactionHarness(questionProps({ question: { question: "Colour?", recommendedAnswer } })).hasCopy()).toBe(false);
  }
});

test("copy and textarea are disabled for running and completed answers, but enabled for retries", () => {
  for (const status of ["running", "done", "failed"] satisfies FeasibilityAnswerRun["status"][]) {
    const view = interactionHarness(questionProps({ ticket: makeTicket({ column: "todo", feasibilityReportVersion: 1,
      feasibilityAnswers: [{ ...baseRun, status }] }) }));
    expect(view.copy().disabled).toBe(status !== "failed");
    expect(view.textarea().disabled).toBe(status !== "failed");
    expect(view.textarea().value).toBe("Blue");
  }
});

test("copy is disabled while posting and after acceptance until the pushed run arrives", async () => {
  await withDraftStorage(async () => {
    let accept: ((value: { started: boolean; id: string }) => void) | undefined;
    const response = new Promise<{ started: boolean; id: string }>((resolve) => { accept = resolve; });
    const props = questionProps({ onSubmit: () => response });
    const view = interactionHarness(props);
    view.clickCopy();
    view.submit();
    expect(view.copy().disabled).toBe(true);
    expect(view.textarea().disabled).toBe(true);
    if (!accept) throw new Error("Response resolver missing");
    accept({ started: true, id: "next" });
    await response;
    view.render();
    expect(view.copy().disabled).toBe(true);
    expect(view.textarea().disabled).toBe(true);
    view.render({ ...props, ticket: { ...props.ticket, feasibilityAnswers: [{ ...baseRun, id: "next", status: "failed" }] } });
    expect(view.copy().disabled).toBe(false);
    expect(view.textarea().disabled).toBe(false);
  });
});

test("oversized recommendations are explained and disabled without truncating or blocking manual edits", async () => {
  await withDraftStorage((drafts) => {
    const recommendedAnswer = "x".repeat(10001);
    const props = questionProps({ question: { question: "Colour?", recommendedAnswer } });
    const html = renderToStaticMarkup(<FeasibilityQuestion {...props} />);
    expect(html).toContain(recommendedAnswer);
    expect(html).toContain("dépasse la limite de 10 000 caractères");
    expect(html).toContain("saisir une réponse plus courte manuellement");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="[^"]+-recommendation-limit"/);
    const view = interactionHarness(props);
    expect(view.copy().disabled).toBe(true);
    expect(view.textarea().disabled).toBe(false);
    expect(view.textarea().maxLength).toBe(10000);
    expect(drafts.size).toBe(0);
    view.edit("Short manual answer");
    expect(view.textarea().value).toBe("Short manual answer");
    expect(drafts.get("draft:feasibility:copy-ticket:1:0")).toBe("Short manual answer");
    const boundary = interactionHarness(questionProps({ question: { question: "Colour?", recommendedAnswer: "x".repeat(10000) } }));
    expect(boundary.copy().disabled).toBe(false);
    boundary.clickCopy();
    expect(boundary.textarea().value).toHaveLength(10000);
  });
});

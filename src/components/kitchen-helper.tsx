"use client";

import { useEffect, useRef, useState } from "react";
import { QUICK_ASKS, type QuickAsk, type RecipeRef } from "@/lib/ai/schemas";
import { AiError, askKitchenHelper, type ChatMessage } from "@/lib/client/ai";
import { AnswerText } from "./answer-text";

const QUICK_LABELS: Record<QuickAsk, string> = {
  spicier: "Make it spicier",
  creamier: "Make it creamier",
  "no-oil": "Cook it without oil",
  "no-salt": "Cook it without salt",
  vegetarian: "Make it vegetarian",
  lighter: "Make it lighter",
  faster: "Make it faster",
  serve: "What goes with it?",
};

export function KitchenHelper({ recipe, title }: { recipe: RecipeRef; title: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [announce, setAnnounce] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function ask(text: string) {
    const content = text.trim().slice(0, 500);
    if (!content || busy) return;
    const history: ChatMessage[] = [...messages, { role: "user" as const, content }].slice(-8);
    setMessages(history);
    setQuestion("");
    setError(null);
    setBusy(true);
    setStreaming("");
    setAnnounce("");
    const controller = new AbortController();
    controllerRef.current = controller;
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    try {
      const answer = await askKitchenHelper(recipe, history, setStreaming, controller.signal);
      setMessages([...history, { role: "assistant", content: answer.slice(0, 1200) }]);
      setAnnounce("Answer ready.");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages(history.slice(0, -1));
        setQuestion(content);
      } else {
        setError(err instanceof AiError ? err.message : "The kitchen helper couldn't answer. Please try again.");
        setMessages(history.slice(0, -1));
        setQuestion(content);
      }
    } finally {
      setStreaming("");
      setBusy(false);
      controllerRef.current = null;
    }
  }

  return (
    <section id="kitchen-helper" aria-labelledby="helper-title" data-print="hide" className="scroll-mt-6">
      <h2 id="helper-title" className="text-4xl font-extrabold">
        Change it up
      </h2>
      <p className="mt-2 max-w-prose text-muted">
        Ask the AI kitchen helper about {title}: swaps, heat, texture, or cooking without something.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(QUICK_ASKS) as QuickAsk[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => ask(QUICK_ASKS[key])}
            className="rounded-full border-2 border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-ink disabled:opacity-50"
          >
            {QUICK_LABELS[key]}
          </button>
        ))}
      </div>

      {messages.length || busy ? (
        <ol className="mt-6 space-y-5" aria-label="Conversation">
          {messages.map((m, i) => (
            <li key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-bg">{m.content}</p>
              ) : (
                <div className="max-w-prose rounded-2xl rounded-bl-sm border border-line bg-surface px-5 py-4">
                  <AnswerText text={m.content} />
                </div>
              )}
            </li>
          ))}
          {busy ? (
            <li>
              <div
                className="max-w-prose rounded-2xl rounded-bl-sm border border-line bg-surface px-5 py-4"
                aria-busy="true"
              >
                {streaming ? (
                  <AnswerText text={streaming} />
                ) : (
                  <p className="text-muted" role="status">
                    Thinking…
                  </p>
                )}
              </div>
            </li>
          ) : null}
        </ol>
      ) : null}
      <div ref={endRef} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-chili/50 px-4 py-3">
          {error}
        </p>
      ) : null}

      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="helper-question" className="sr-only">
          Your question
        </label>
        <input
          id="helper-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="I don't have cream. What can I use?"
          maxLength={500}
          autoComplete="off"
          className="field"
        />
        {busy ? (
          <button type="button" className="btn btn-quiet shrink-0" onClick={() => controllerRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-primary shrink-0" disabled={!question.trim()}>
            Ask
          </button>
        )}
      </form>
      <p className="mt-2 text-xs text-muted">AI answers can be wrong. Check allergens yourself.</p>
    </section>
  );
}

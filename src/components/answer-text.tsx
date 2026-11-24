import { Fragment } from "react";

/** Render **bold** inside a line, as React elements (never as HTML). */
function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part.replace(/\*\*/g, "")}</Fragment>
    ),
  );
}

/** A tiny, safe renderer for the helper's answers: paragraphs, bullet and numbered lists, bold. */
export function AnswerText({ text }: { text: string }) {
  const blocks: Array<{ type: "p" | "ul" | "ol"; lines: string[] }> = [];
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      blocks.push({ type: "p", lines: [] });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const type = bullet ? "ul" : numbered ? "ol" : "p";
    const content = bullet?.[1] ?? numbered?.[1] ?? line.replace(/^#+\s*/, "");
    const last = blocks[blocks.length - 1];
    if (last && last.type === type && (type !== "p" || last.lines.length)) last.lines.push(content);
    else blocks.push({ type, lines: [content] });
  }

  return (
    <div className="prose-answer">
      {blocks
        .filter((b) => b.lines.length)
        .map((block, i) => {
          if (block.type === "ul")
            return (
              <ul key={i}>
                {block.lines.map((l, j) => (
                  <li key={j}>{inline(l, `${i}-${j}`)}</li>
                ))}
              </ul>
            );
          if (block.type === "ol")
            return (
              <ol key={i} className="list-decimal pl-5">
                {block.lines.map((l, j) => (
                  <li key={j}>{inline(l, `${i}-${j}`)}</li>
                ))}
              </ol>
            );
          return <p key={i}>{inline(block.lines.join(" "), `${i}`)}</p>;
        })}
    </div>
  );
}

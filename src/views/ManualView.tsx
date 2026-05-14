import userManualMarkdown from "../../docs/user-manual.md?raw";

export function ManualView() {
  return (
    <section className="main-panel library-panel manual-panel">
      <div className="section-head">
        <div>
          <h1>User manual</h1>
          <p>Complete operating guide for Random Words.</p>
        </div>
      </div>
      <MarkdownDocument markdown={userManualMarkdown} />
    </section>
  );
}

function MarkdownDocument({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/);
  return (
    <article className="manual-content">
      {blocks.map((block, index) => renderMarkdownBlock(block, index))}
    </article>
  );
}

function renderMarkdownBlock(block: string, index: number) {
  const trimmed = block.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("# ")) return <h1 key={index}>{trimmed.slice(2)}</h1>;
  if (trimmed.startsWith("## ")) return <h2 key={index}>{trimmed.slice(3)}</h2>;
  if (trimmed.startsWith("### ")) return <h3 key={index}>{trimmed.slice(4)}</h3>;
  if (trimmed.split("\n").every((line) => line.startsWith("- "))) {
    return (
      <ul key={index}>
        {trimmed.split("\n").map((line, lineIndex) => (
          <li key={`${index}-${lineIndex}`}>{renderInlineMarkdown(line.slice(2))}</li>
        ))}
      </ul>
    );
  }
  if (trimmed.split("\n").every((line) => /^\d+\.\s/.test(line))) {
    return (
      <ol key={index}>
        {trimmed.split("\n").map((line, lineIndex) => (
          <li key={`${index}-${lineIndex}`}>{renderInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>
        ))}
      </ol>
    );
  }
  return <p key={index}>{renderInlineMarkdown(trimmed.replace(/\n/g, " "))}</p>;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

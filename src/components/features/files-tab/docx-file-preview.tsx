import { unzipSync } from "fflate";
import { useTranslation } from "react-i18next";

import { I18nKey } from "#/i18n/declaration";

const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

interface DocxRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

interface DocxParagraph {
  style: string | null;
  runs: DocxRun[];
}

function getAttribute(element: Element, name: string): string | null {
  return (
    element.getAttribute(`w:${name}`) ??
    element.getAttributeNS(WORD_NAMESPACE, name)
  );
}

function readParagraphs(bytes: Uint8Array): DocxParagraph[] {
  const files = unzipSync(bytes);
  const documentXml = files["word/document.xml"];
  if (!documentXml) throw new Error("Missing Word document body");

  const xml = new TextDecoder("utf-8").decode(documentXml);
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror"))
    throw new Error("Invalid Word XML");

  return Array.from(document.getElementsByTagNameNS(WORD_NAMESPACE, "p")).map(
    (paragraph) => {
      const style = paragraph
        .getElementsByTagNameNS(WORD_NAMESPACE, "pStyle")
        .item(0);
      const runs = Array.from(
        paragraph.getElementsByTagNameNS(WORD_NAMESPACE, "r"),
      ).flatMap((run): DocxRun[] => {
        const textParts = Array.from(
          run.getElementsByTagNameNS(WORD_NAMESPACE, "t"),
        ).map((text) => text.textContent ?? "");
        const breaks = run.getElementsByTagNameNS(WORD_NAMESPACE, "br").length;
        const text = `${textParts.join("")}${"\n".repeat(breaks)}`;
        if (!text) return [];
        const properties = run
          .getElementsByTagNameNS(WORD_NAMESPACE, "rPr")
          .item(0);
        return [
          {
            text,
            bold:
              (properties?.getElementsByTagNameNS(WORD_NAMESPACE, "b").length ??
                0) > 0,
            italic:
              (properties?.getElementsByTagNameNS(WORD_NAMESPACE, "i").length ??
                0) > 0,
          },
        ];
      });

      return { style: style ? getAttribute(style, "val") : null, runs };
    },
  );
}

function paragraphClass(style: string | null): string {
  if (style === "Title") return "text-2xl font-semibold";
  if (style?.startsWith("Heading")) return "text-lg font-semibold";
  return "text-sm leading-6";
}

export function DocxFilePreview({
  bytes,
  path,
}: {
  bytes: Uint8Array;
  path: string;
}) {
  const { t } = useTranslation("openhands");
  let paragraphs: DocxParagraph[];
  try {
    paragraphs = readParagraphs(bytes);
  } catch {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-sm text-muted"
        data-testid="docx-file-preview-error"
      >
        {t(I18nKey.FILES$UNSUPPORTED_DOCUMENT, { type: "Word" })}
      </div>
    );
  }

  return (
    <div
      className="h-full w-full overflow-auto bg-surface p-6 custom-scrollbar-always"
      data-testid="docx-file-preview"
    >
      <article className="mx-auto flex max-w-3xl flex-col gap-3 rounded-lg bg-canvas-background px-8 py-7 text-contrast shadow-sm">
        <div className="mb-2 border-b border-border-subtle pb-2 text-xs text-muted">
          {path.split("/").pop() ?? path}
        </div>
        {paragraphs.length > 0
          ? paragraphs.map((paragraph, index) => (
              <p
                key={`${paragraph.style ?? "paragraph"}-${index}`}
                className={paragraphClass(paragraph.style)}
              >
                {paragraph.runs.map((run, runIndex) => (
                  <span
                    key={`${runIndex}-${run.text}`}
                    className={
                      run.bold && run.italic
                        ? "font-semibold italic"
                        : run.bold
                          ? "font-semibold"
                          : run.italic
                            ? "italic"
                            : undefined
                    }
                  >
                    {run.text}
                  </span>
                ))}
              </p>
            ))
          : null}
      </article>
    </div>
  );
}

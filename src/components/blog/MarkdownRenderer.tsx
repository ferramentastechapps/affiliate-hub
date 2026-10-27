import React from 'react';
import Link from 'next/link';

interface MarkdownRendererProps {
  content: string;
}

// ponytail: renderizador nativo enxuto em React, sem dependência pesada de markdown externo
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Quebra por blocos (separados por linha em branco)
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-6 text-zinc-300 leading-relaxed text-[15px] md:text-[17px] font-normal">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Cabeçalho H1 (# ...)
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl md:text-3xl font-black text-white tracking-tight mt-8 mb-4">
              {renderInline(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }

        // Cabeçalho H2 (## ...)
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl md:text-2xl font-bold text-white tracking-tight mt-8 mb-3 pb-2 border-b border-white/[0.08] flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#ff334b] rounded-full inline-block" />
              {renderInline(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        // Cabeçalho H3 (### ...)
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg md:text-xl font-bold text-zinc-100 mt-6 mb-2">
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // Bloco de citação / TL;DR (> ...)
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ');
          return (
            <div key={idx} className="my-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-[#ff334b]/10 via-[#13151f] to-[#13151f] border-l-4 border-[#ff334b] border-y border-r border-white/[0.06] shadow-lg">
              <div className="text-sm md:text-base text-zinc-200 font-medium">
                {renderInline(quoteLines)}
              </div>
            </div>
          );
        }

        // Tabela Markdown (| ... |)
        if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
          const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
          const isTable = lines.every(l => l.startsWith('|') && l.endsWith('|'));
          if (isTable) {
            const headerLine = lines[0];
            const separatorLine = lines[1];
            const dataLines = lines.slice(2);

            const headers = headerLine.split('|').slice(1, -1).map(c => c.trim());
            const rows = dataLines.map(row => row.split('|').slice(1, -1).map(c => c.trim()));

            return (
              <div key={idx} className="my-6 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c0d14] shadow-xl">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/[0.08]">
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="py-3.5 px-4 font-bold text-white text-xs uppercase tracking-wider">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-3 px-4 text-zinc-300">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Lista com marcadores (- ou *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          return (
            <ul key={idx} className="my-4 space-y-2 pl-2">
              {items.map((item, itemIdx) => {
                const text = item.replace(/^[-*]\s+/, '');
                return (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <span className="text-[#ff334b] font-bold mt-0.5">•</span>
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Lista numerada (1. ...)
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter(l => /^\d+\.\s/.test(l.trim()));
          return (
            <ol key={idx} className="my-4 space-y-2 pl-2">
              {items.map((item, itemIdx) => {
                const numMatch = item.match(/^(\d+)\.\s+(.*)/);
                const num = numMatch ? numMatch[1] : `${itemIdx + 1}`;
                const text = numMatch ? numMatch[2] : item;
                return (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <span className="text-[#ff334b] font-bold shrink-0">{num}.</span>
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Parágrafo regular
        return (
          <p key={idx} className="mb-4">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Converte marcações inline (**negrito**, *itálico*, links [texto](url)) em elementos React
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return text;

  // Regex para links: [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderFormattedText(text.slice(lastIndex, match.index), `txt-${lastIndex}`));
    }
    const label = match[1];
    const href = match[2];

    const isInternal = href.startsWith('/');
    if (isInternal) {
      parts.push(
        <Link
          key={`link-${match.index}`}
          href={href}
          className="text-[#ff334b] hover:text-[#ff556b] underline font-semibold transition-colors"
        >
          {label}
        </Link>
      );
    } else {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ff334b] hover:text-[#ff556b] underline font-semibold transition-colors"
        >
          {label}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderFormattedText(text.slice(lastIndex), `txt-${lastIndex}`));
  }

  return parts.length > 0 ? parts : renderFormattedText(text, 'base');
}

/**
 * Lida com **negrito** e *itálico*
 */
function renderFormattedText(str: string, keyPrefix: string): React.ReactNode {
  // Substitui **bold**
  const boldParts = str.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      const boldText = bPart.slice(2, -2);
      return (
        <strong key={`${keyPrefix}-b-${bIdx}`} className="font-bold text-white">
          {boldText}
        </strong>
      );
    }
    return bPart;
  });
}

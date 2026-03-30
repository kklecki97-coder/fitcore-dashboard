// Simple markdown-to-HTML renderer (handles ##, ###, **, *, -, |tables|, links, ---)

function inlineFormat(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600;">$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Links [text](url)
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:var(--accent-primary);text-decoration:none;font-weight:500;border-bottom:1px solid rgba(0,229,200,0.3);">$1</a>');
  return text;
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inTable) { html += '</tbody></table>'; inTable = false; }
      html += '<hr style="border:none;border-top:1px solid var(--glass-border);margin:32px 0;" />';
      continue;
    }

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) { html += '</ul>'; inList = false; }

      // Skip separator row (|---|---|)
      if (/^\|[\s-:|]+\|$/.test(line.trim())) {
        tableHeader = false;
        continue;
      }

      if (!inTable) {
        html += '<div style="overflow-x:auto;margin:24px 0;"><table style="width:100%;border-collapse:collapse;font-size:14px;">';
        inTable = true;
        tableHeader = true;
      }

      const cells = line.trim().split('|').filter(c => c.trim() !== '');
      const tag = tableHeader ? 'th' : 'td';
      const cellStyle = tableHeader
        ? 'padding:10px 16px;text-align:left;border-bottom:2px solid var(--glass-border);color:var(--text-primary);font-weight:600;'
        : 'padding:10px 16px;text-align:left;border-bottom:1px solid var(--glass-border);color:var(--text-secondary);';

      if (tableHeader) html += '<thead>';
      html += '<tr>';
      cells.forEach(cell => {
        html += `<${tag} style="${cellStyle}">${inlineFormat(cell.trim())}</${tag}>`;
      });
      html += '</tr>';
      if (tableHeader) html += '</thead><tbody>';
      continue;
    } else if (inTable) {
      html += '</tbody></table></div>';
      inTable = false;
    }

    // Headers
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:32px 0 12px;letter-spacing:-0.3px;">${inlineFormat(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 style="font-size:22px;font-weight:700;color:var(--text-primary);margin:40px 0 16px;letter-spacing:-0.3px;">${inlineFormat(line.slice(3))}</h2>`;
      continue;
    }

    // List items
    if (/^[-*] /.test(line.trim())) {
      if (!inList) { html += '<ul style="margin:16px 0;padding-left:24px;">'; inList = true; }
      html += `<li style="color:var(--text-secondary);line-height:1.7;margin-bottom:6px;">${inlineFormat(line.trim().slice(2))}</li>`;
      continue;
    } else if (inList && line.trim() === '') {
      html += '</ul>';
      inList = false;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      html += `<p style="color:var(--text-secondary);line-height:1.7;margin:8px 0;padding-left:8px;">${inlineFormat(line.trim())}</p>`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    // Regular paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p style="color:var(--text-secondary);line-height:1.8;margin:16px 0;font-size:15px;">${inlineFormat(line)}</p>`;
  }

  if (inList) html += '</ul>';
  if (inTable) html += '</tbody></table></div>';
  return html;
}

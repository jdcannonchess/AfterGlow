import { open } from '@tauri-apps/plugin-shell';

// Regex to detect URLs (http, https)
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

interface LinkifiedTextProps {
  text: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

/**
 * Component that renders text with clickable inline links.
 * URLs are detected and rendered as blue underlined text that opens in the default browser.
 */
export function LinkifiedText({ text, className, onClick, onDoubleClick }: LinkifiedTextProps) {
  // Check if running in Tauri environment
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  const handleLinkClick = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (isTauri) {
        await open(url);
      } else {
        // Fallback for browser dev mode
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      // Fallback to window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Split text by URLs and create parts array
  const parts: { type: 'text' | 'link'; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Add the URL
    parts.push({ type: 'link', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no URLs found, return simple span
  if (parts.length === 0) {
    return (
      <span className={className} onClick={onClick} onDoubleClick={onDoubleClick}>
        {text}
      </span>
    );
  }

  return (
    <span className={className} onClick={onClick} onDoubleClick={onDoubleClick}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <button
              key={index}
              onClick={(e) => handleLinkClick(e, part.content)}
              className="text-blue-400 hover:text-blue-300 underline hover:no-underline cursor-pointer"
              title={part.content}
            >
              {part.content}
            </button>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}

/**
 * Check if a string contains any URLs
 */
export function containsUrl(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}

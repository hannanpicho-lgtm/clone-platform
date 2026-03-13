import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { projectId } from '/utils/supabase/info';

interface LiveChatProps {
  accessToken: string;
}

interface ContactLinks {
  whatsapp: string;
  telegram: string;
  whatsapp2: string;
  telegram2: string;
}

const defaultLinks: ContactLinks = {
  whatsapp: 'https://wa.me/1234567890',
  telegram: 'https://t.me/tanknewmedia_support',
  whatsapp2: '',
  telegram2: '',
};

export function LiveChat({ accessToken }: LiveChatProps) {
  const baseUrl = useMemo(() => `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3`, []);
  const [message, setMessage] = useState('Hello support, I need help with my account.');
  const [contactLinks, setContactLinks] = useState<ContactLinks>(defaultLinks);

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const response = await fetch(`${baseUrl}/contact-links`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json().catch(() => ({}));
        const config = data?.config || {};
        setContactLinks({
          whatsapp: String(config.whatsapp || defaultLinks.whatsapp),
          telegram: String(config.telegram || defaultLinks.telegram),
          whatsapp2: String(config.whatsapp2 || ''),
          telegram2: String(config.telegram2 || ''),
        });
      } catch {
        // Keep default links when backend is unreachable.
      }
    };

    loadLinks();
  }, [accessToken, baseUrl]);

  const links = [
    { id: 'whatsapp', label: 'WhatsApp 1', url: contactLinks.whatsapp },
    { id: 'whatsapp2', label: 'WhatsApp 2', url: contactLinks.whatsapp2 },
    { id: 'telegram', label: 'Telegram 1', url: contactLinks.telegram },
    { id: 'telegram2', label: 'Telegram 2', url: contactLinks.telegram2 },
  ].filter((item) => item.url.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          Use one of the support channels below for immediate assistance.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full min-h-28 rounded-lg border border-gray-300 p-3 text-sm"
        placeholder="Describe your issue..."
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {links.map((item) => (
          <a
            key={item.id}
            href={`${item.url}${item.url.includes('?') ? '&' : '?'}text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button className="w-full" type="button">
              {item.label}
            </Button>
          </a>
        ))}
      </div>

      {links.length === 0 && (
        <p className="text-sm text-gray-600">Support links are currently unavailable.</p>
      )}
    </div>
  );
}

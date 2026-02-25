import { Mail } from 'lucide-react';
import type { MessageChannel } from '../types';

export const TelegramIcon = ({ size = 12, color = '#29ABE2' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

export const WhatsAppIcon = ({ size = 12, color = '#25D366' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.47 14.38c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 4.98 4.41.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.96-1.38.25-.68.25-1.26.17-1.38-.07-.12-.27-.2-.56-.34zM12.05 21.5c-1.8 0-3.56-.49-5.1-1.41l-.36-.22-3.78 1 1.02-3.7-.24-.38A9.43 9.43 0 012.5 12.05c0-5.24 4.27-9.5 9.52-9.5 2.54 0 4.93.99 6.72 2.78a9.46 9.46 0 012.78 6.73c0 5.25-4.27 9.52-9.52 9.52l.05-.08zM12.05.5C5.68.5.5 5.68.5 12.05c0 2.04.53 4.02 1.54 5.77L.5 23.5l5.85-1.53a11.47 11.47 0 005.7 1.53c6.37 0 11.55-5.18 11.55-11.55C23.6 5.58 18.42.5 12.05.5z"/>
  </svg>
);

export const EmailIcon = ({ size = 12, color = '#EA4335' }: { size?: number; color?: string }) => (
  <Mail size={size} color={color} style={{ flexShrink: 0 }} />
);

export const InstagramIcon = ({ size = 12, color = '#E1306C' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const CHANNEL_COLORS: Record<MessageChannel, string> = {
  telegram: '#29ABE2',
  whatsapp: '#25D366',
  email: '#EA4335',
  instagram: '#E1306C',
};

export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram: 'Instagram',
};

export function ChannelIcon({ channel, size = 12 }: { channel: MessageChannel; size?: number }) {
  if (channel === 'telegram') return <TelegramIcon size={size} />;
  if (channel === 'whatsapp') return <WhatsAppIcon size={size} />;
  if (channel === 'email') return <EmailIcon size={size} />;
  if (channel === 'instagram') return <InstagramIcon size={size} />;
  return null;
}

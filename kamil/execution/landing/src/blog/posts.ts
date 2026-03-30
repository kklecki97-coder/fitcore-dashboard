export interface BlogPost {
  slug: string;
  title: { en: string; pl: string };
  description: { en: string; pl: string };
  date: string; // ISO date
  readingTime: number; // minutes
  tags: string[];
  image?: string;
  content: { en: string; pl: string };
}

// Individual post files — add new posts here
import { manageClients } from './posts/manage-clients';
import { bestTools } from './posts/best-tools';
import { automatePayments } from './posts/automate-payments';
import { whyNotExcel } from './posts/why-not-excel';

export const blogPosts: BlogPost[] = [
  manageClients,
  bestTools,
  automatePayments,
  whyNotExcel,
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

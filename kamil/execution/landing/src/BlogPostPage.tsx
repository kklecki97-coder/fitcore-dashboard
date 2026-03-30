import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { useLang } from './i18n';
import { getPostBySlug, getAllPosts } from './blog/posts';
import { Helmet } from 'react-helmet-async';
import { renderMarkdown } from './utils/markdown';
import TagBadge from './components/TagBadge';
import PostMeta from './components/PostMeta';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { lang } = useLang();
  const post = getPostBySlug(slug || '');
  const allPosts = getAllPosts();
  const prefix = lang === 'pl' ? '/pl' : '';

  const tNav = {
    en: { back: 'All articles', related: 'More articles', readMore: 'Read article', notFoundTitle: 'Post not found', notFoundDesc: 'This article doesn\'t exist.', backToBlog: 'Back to Blog' },
    pl: { back: 'Wszystkie artykuły', related: 'Więcej artykułów', readMore: 'Czytaj artykuł', notFoundTitle: 'Nie znaleziono artykułu', notFoundDesc: 'Ten artykuł nie istnieje.', backToBlog: 'Wróć do Bloga' },
  }[lang];

  const minReadLabel = lang === 'pl' ? 'min czytania' : 'min read';

  if (!post) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{tNav.notFoundTitle}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{tNav.notFoundDesc}</p>
        <Link to={`${prefix}/blog`} style={{
          color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ChevronLeft size={16} /> {tNav.backToBlog}
        </Link>
      </div>
    );
  }

  const related = allPosts.filter(p => p.slug !== post.slug).slice(0, 2);

  // JSON-LD BlogPosting schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title[lang],
    description: post.description[lang],
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'FitCore', url: 'https://fitcore.tech' },
    publisher: {
      '@type': 'Organization', name: 'FitCore', url: 'https://fitcore.tech',
      logo: { '@type': 'ImageObject', url: 'https://fitcore.tech/fitcore-logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://fitcore.tech${prefix}/blog/${post.slug}` },
    wordCount: post.content[lang].split(/\s+/).length,
    inLanguage: lang === 'pl' ? 'pl-PL' : 'en-US',
  };

  return (
    <>
      <Helmet>
        <title>{post.title[lang]} — FitCore Blog</title>
        <meta name="description" content={post.description[lang]} />
        <link rel="canonical" href={`https://fitcore.tech${prefix}/blog/${post.slug}`} />
        <meta property="og:title" content={post.title[lang]} />
        <meta property="og:description" content={post.description[lang]} />
        <meta property="og:url" content={`https://fitcore.tech${prefix}/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.date} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title[lang]} />
        <meta name="twitter:description" content={post.description[lang]} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
      }}>
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}
        >
          {/* Back link */}
          <Link to={`${prefix}/blog`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
            fontWeight: 500, marginBottom: 40, transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <ChevronLeft size={14} /> {tNav.back}
          </Link>

          {/* Tags */}
          <div style={{ marginBottom: 20 }}>
            <TagBadge tags={post.tags} />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 700,
            lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 20,
          }}>
            {post.title[lang]}
          </h1>

          {/* Meta */}
          <div style={{
            marginBottom: 40, paddingBottom: 32,
            borderBottom: '1px solid var(--glass-border)',
          }}>
            <PostMeta date={post.date} readingTime={post.readingTime} lang={lang} size="md" />
          </div>

          {/* Content */}
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content[lang]) }}
            style={{ lineHeight: 1.8 }}
          />

          {/* CTA Box */}
          <div style={{
            marginTop: 48, padding: 32,
            background: 'linear-gradient(135deg, var(--accent-primary-dim), var(--accent-secondary-dim))',
            border: '1px solid rgba(0,229,200,0.2)',
            borderRadius: 'var(--radius-lg)', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {lang === 'pl' ? 'Gotowy na zmianę?' : 'Ready to level up?'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              {lang === 'pl'
                ? 'Wypróbuj FitCore za darmo przez 14 dni. Zero karty kredytowej, pełen dostęp.'
                : 'Try FitCore free for 14 days. No credit card, full access.'}
            </p>
            <Link to={`${prefix}/checkout`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent-primary)', color: '#000',
              padding: '12px 28px', borderRadius: 'var(--radius-md)',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,200,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {lang === 'pl' ? 'Zacznij za darmo' : 'Start Free Trial'} <ArrowRight size={16} />
            </Link>
          </div>

          {/* Related Posts */}
          {related.length > 0 && (
            <div style={{ marginTop: 64 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                {tNav.related}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {related.map(rp => (
                  <Link key={rp.slug} to={`${prefix}/blog/${rp.slug}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)', padding: '20px 24px',
                        transition: 'border-color 0.2s', cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,229,200,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
                    >
                      <h4 style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                        marginBottom: 8, lineHeight: 1.3,
                      }}>
                        {rp.title[lang]}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {rp.readingTime} {minReadLabel}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {tNav.readMore} <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.article>
      </div>
    </>
  );
}

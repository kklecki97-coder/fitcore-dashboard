import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, BookOpen } from 'lucide-react';
import { useLang } from './i18n';
import { getAllPosts } from './blog/posts';
import { Helmet } from 'react-helmet-async';
import Section from './components/Section';
import TagBadge from './components/TagBadge';
import PostMeta from './components/PostMeta';

export default function BlogListPage() {
  const { lang } = useLang();
  const posts = getAllPosts();
  const prefix = lang === 'pl' ? '/pl' : '';

  const t = {
    en: {
      title: 'Blog — FitCore',
      description: 'Guides, tips, and strategies for fitness coaches who want to grow their business, manage clients better, and stop drowning in admin.',
      heading: 'FitCore Blog',
      subtitle: 'Guides and strategies for fitness coaches who want to grow smarter, not harder.',
      backHome: 'Home',
      readMore: 'Read article',
    },
    pl: {
      title: 'Blog — FitCore',
      description: 'Poradniki, wskazówki i strategie dla trenerów fitness, którzy chcą rozwijać biznes, lepiej zarządzać klientami i przestać tonąć w administracji.',
      heading: 'Blog FitCore',
      subtitle: 'Poradniki i strategie dla trenerów fitness, którzy chcą rozwijać się mądrzej, nie ciężej.',
      backHome: 'Strona główna',
      readMore: 'Czytaj artykuł',
    },
  }[lang];

  return (
    <>
      <Helmet>
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
        <link rel="canonical" href={`https://fitcore.tech${prefix}/blog`} />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content={t.description} />
        <meta property="og:url" content={`https://fitcore.tech${prefix}/blog`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
      }}>
        {/* Header */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 0' }}>
          <Link to={`${prefix}/`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
            fontWeight: 500, marginBottom: 40, transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <ChevronLeft size={14} /> {t.backHome}
          </Link>

          <Section>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--accent-primary-dim)', border: '1px solid rgba(0,229,200,0.2)',
                borderRadius: 999, padding: '6px 16px', marginBottom: 20,
              }}>
                <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Blog</span>
              </div>
              <h1 style={{
                fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700,
                lineHeight: 1.15, marginBottom: 16, letterSpacing: -0.5,
              }}>
                {t.heading}
              </h1>
              <p style={{
                fontSize: 16, color: 'var(--text-secondary)',
                maxWidth: 520, margin: '0 auto', lineHeight: 1.6,
              }}>
                {t.subtitle}
              </p>
            </div>
          </Section>
        </div>

        {/* Posts Grid */}
        <div style={{
          maxWidth: 900, margin: '0 auto', padding: '0 24px 80px',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          {posts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link to={`${prefix}/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)', padding: '32px',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,229,200,0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card), 0 0 30px rgba(0,229,200,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <TagBadge tags={post.tags} limit={3} />
                  </div>

                  <h2 style={{
                    fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: 700,
                    color: 'var(--text-primary)', lineHeight: 1.3,
                    marginBottom: 12, letterSpacing: -0.3,
                  }}>
                    {post.title[lang]}
                  </h2>

                  <p style={{
                    fontSize: 14, color: 'var(--text-secondary)',
                    lineHeight: 1.6, marginBottom: 20,
                  }}>
                    {post.description[lang]}
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <PostMeta date={post.date} readingTime={post.readingTime} lang={lang} />
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)',
                    }}>
                      {t.readMore} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { philosophyContent, type PhilosophyContent } from '../philosophyContent';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PhilosophyPageProps {
  locale: 'it' | 'en';
  content?: PhilosophyContent;
}

export const PhilosophyPage = ({ locale, content: propContent }: PhilosophyPageProps) => {
  const content = propContent || philosophyContent[locale];
  const [activeSection, setActiveSection] = useState<string>('problem');

  useEffect(() => {
    const handleScroll = () => {
      const sections = content.nav.map(n => n.id);
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [content.nav]);

  return (
    <div className="min-h-screen bg-background">
      
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {content.hero.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg max-w-2xl">
            {content.hero.subtitle}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/register">{content.hero.ctaPrimary}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how">{content.hero.ctaSecondary}</Link>
            </Button>
          </div>
          
          <div className="pt-8 max-w-2xl">
            <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {locale === 'it' ? 'Credibilità' : 'Credibility'}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {content.hero.credibility}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Bar with Section Tags */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 py-4">
            <Link
              href={`/${locale}`}
              className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                <Image
                  src="/favicon.ico"
                  alt="Ager"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                  priority
                />
              </span>
              <span>Ager</span>
            </Link>

            <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
              <div className="flex items-center gap-2 md:gap-4">
                {content.nav.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      "px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-full transition-all whitespace-nowrap",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden shrink-0 sm:flex">
              <Button asChild variant="secondary">
                <Link href={`/${locale}/feed`}>{content.hero.ctaPrimary}</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Problem Intro */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg max-w-3xl mx-auto text-center">
            {content.problemIntro}
          </p>
        </div>
      </section>

      {/* Problem Section with Stats */}
      <section id="problem" className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
          {content.nav.find(n => n.id === 'problem')?.label}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mx-auto max-w-4xl">
          {content.stats.map((stat, idx) => (
            <Card key={idx} className="p-6 md:p-8 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="text-4xl md:text-5xl font-bold text-primary">
                  {stat.value}
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1">
                  {stat.claim}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {stat.interpretation}
                </p>
                <a 
                  href={stat.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Fonte: {stat.sourceLabel} <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Mechanisms Section */}
      <section id="mechanisms" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h2 className="text-2xl font-semibold tracking-tight mb-4 text-center">
              {content.mechanisms.intro}
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg max-w-3xl mx-auto">
              {content.mechanisms.bridge}
            </p>
          </div>

          <div className="space-y-16 max-w-3xl mx-auto">
            {content.mechanisms.items.map((item, idx) => (
              <div key={idx} className="flex gap-4" style={{ marginBottom: '3rem' }}>
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reading Section */}
      <section id="reading" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
            {content.nav.find(n => n.id === 'reading')?.label}
          </h2>

          <div className="max-w-3xl mx-auto">
            {content.reading.paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-base leading-relaxed text-muted-foreground sm:text-lg text-center"
                style={{ marginTop: i === 0 ? 0 : '2.5rem' }}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
            {content.nav.find(n => n.id === 'philosophy')?.label}
        </h2>

        <div className="max-w-3xl mx-auto">
          {content.philosophy.paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-base leading-relaxed text-muted-foreground sm:text-lg text-center"
              style={{ marginTop: i === 0 ? 0 : '2.5rem' }}
            >
              {para}
            </p>
          ))}
        </div>

        <div className="mx-auto max-w-3xl" style={{ marginTop: '6rem', marginBottom: '6rem' }}>
          <p className="text-xl md:text-2xl font-semibold italic text-center">
            "{content.philosophy.callout}"
          </p>
        </div>

        <div className="mt-32 max-w-4xl mx-auto space-y-32">
          <div className="text-center" style={{ marginBottom: '4rem' }}>
            <h3 className="text-xl font-bold mb-8">
              {content.philosophy.contrast.leftTitle}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base sm:text-lg max-w-2xl mx-auto">
              {content.philosophy.contrast.leftBody}
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-8">
              {content.philosophy.contrast.rightTitle}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base sm:text-lg max-w-2xl mx-auto">
              {content.philosophy.contrast.rightBody}
            </p>
          </div>
        </div>
        </div>
      </section>

      {/* Principles Section */}
      <section id="principles" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
            {content.nav.find(n => n.id === 'principles')?.label}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.principles.map((principle, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold mb-4 text-sm">
                  {idx + 1}
                </div>
                <h3 className="text-lg font-bold mb-3">
                  {principle.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {principle.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how" className="border-t mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
          {content.nav.find(n => n.id === 'how')?.label}
        </h2>

        <div className="space-y-12 max-w-3xl mx-auto">
          {content.howItWorks.map((item, idx) => (
            <Card key={idx} className="p-6 md:p-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mx-auto max-w-3xl" style={{ marginTop: '1rem', paddingTop: '2rem' }}>
          <div className="flex justify-center">
            <Button size="lg" asChild>
              <Link href="/register">{content.footerCta.button}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Guarantees Section */}
      <section id="guarantees" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>
            {content.nav.find(n => n.id === 'guarantees')?.label}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.guarantees.map((item, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '4rem' }}>FAQ</h2>

        <div className="space-y-4 max-w-3xl mx-auto">
          {content.faq.map((item, idx) => (
            <FaqItem 
              key={idx} 
              question={item.q} 
              answer={item.aShort} 
              details={item.aLong} 
            />
          ))}
        </div>
      </section>

      {/* Sources Section */}
      <section id="sources" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center" style={{ marginBottom: '2rem' }}>
            {content.nav.find(n => n.id === 'sources')?.label}
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <p className="text-muted-foreground leading-relaxed" style={{ marginBottom: '1rem' }}>
                {content.sources.intro}
              </p>
            </div>
            
            <div className="bg-background rounded-lg p-6 border">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {content.sources.methodology}
              </p>
              <div className="space-y-3">
                {content.sources.items.map((item, idx) => (
                  <a 
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-foreground transition-colors text-sm"
                  >
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <span className="underline">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight mb-1">
                {locale === 'it'
                  ? "Vuoi aiutarci a costruire Ager?"
                  : "Want to help us build Ager?"}
              </h2>
              <p className="text-muted-foreground">
                {locale === 'it'
                  ? "Scopri come puoi contribuire alla rivoluzione dell'informazione."
                  : "Learn how you can help shape the future of information."}
              </p>
            </div>
            <Button asChild size="lg">
              <a
                href="https://forms.gle/cGZ94Xw15YqXwVET8"
                target="_blank"
                rel="noreferrer"
              >
                {locale === 'it' ? "Scopri come" : "Learn more"}
              </a>
            </Button>
          </div>

          <div className="mt-10 border-t pt-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                    <Image
                      src="/favicon.ico"
                      alt="Ager"
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] object-contain"
                    />
                  </span>
                  <span>Ager</span>
                </div>
                <div className="text-muted-foreground text-sm">
                  {locale === 'it'
                    ? "Il futuro dell'informazione parte da qui."
                    : "The future of information starts here."}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm sm:items-end">
                <div className="text-muted-foreground">
                  {locale === 'it'
                    ? '© 2025 Ager — Tutti i diritti riservati'
                    : '© 2025 Ager — All rights reserved'}
                </div>
                <div className="text-muted-foreground">
                  <a className="hover:text-foreground" href="mailto:ager.org@gmail.com">
                    {locale === 'it' ? "Contatti" : "Contact"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

// FAQ Item Component
const FaqItem = ({ 
  question, 
  answer, 
  details 
}: { 
  question: string;
  answer: string;
  details: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold flex-1">{question}</span>
        <ChevronDown 
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 space-y-2">
          <p className="font-medium text-sm">{answer}</p>
          <p className="text-sm text-muted-foreground">{details}</p>
        </div>
      )}
    </Card>
  );
};

export default PhilosophyPage;

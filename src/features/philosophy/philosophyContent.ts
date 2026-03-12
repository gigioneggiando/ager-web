export type PhilosophyLang = "it" | "en";

export type PhilosophyNavItem = {
  id:
    | "problem"
    | "mechanisms"
    | "philosophy"
    | "reading"
    | "principles"
    | "how"
    | "guarantees"
    | "faq"
    | "sources";
  label: string;
};

export type PhilosophyContent = {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    title: string;
    subtitle: string;
    credibility: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  problemIntro: string;
  nav: PhilosophyNavItem[];
  stats: Array<{
    value: string;
    claim: string;
    interpretation: string;
    sourceLabel: string;
    sourceUrl: string;
  }>;
  mechanisms: {
    intro: string;
    bridge: string;
    items: Array<{
      title: string;
      body: string;
    }>;
  };
  philosophy: {
    paragraphs: string[];
    callout: string;
    contrast: {
      leftTitle: string;
      leftBody: string;
      rightTitle: string;
      rightBody: string;
    };
  };
  reading: {
    title: string;
    paragraphs: string[];
  };
  principles: Array<{
    title: string;
    body: string;
  }>;
  howItWorks: Array<{
    title: string;
    body: string;
  }>;
  guarantees: Array<{
    title: string;
    body: string;
  }>;
  faq: Array<{
    q: string;
    aShort: string;
    aLong: string;
  }>;
  sources: {
    intro: string;
    methodology: string;
    items: Array<{
      label: string;
      url: string;
    }>;
  };
  footerCta: {
    title: string;
    body: string;
    button: string;
  };
};

export const philosophyContent: Record<PhilosophyLang, PhilosophyContent> = {
  it: {
    meta: {
      title: "Filosofia | AgerCulture — Trasformare il flusso di notizie in conoscenza organizzata",
      description:
        "Una pagina manifesto sul perché oggi leggere bene è difficile e su come AgerCulture costruisce strumenti publisher-first per tornare alle fonti."
    },
    hero: {
      title: "Restituire profondità all'informazione",
      subtitle:
        "Non più stimoli senza significato: una biblioteca personale che ti riporta alle fonti.",
      credibility:
        "Adottiamo un approccio publisher-first: la piattaforma è progettata per favorire la lettura completa degli articoli, la pluralità delle fonti e il ritorno diretto alle testate, riducendo gli incentivi al consumo impulsivo delle notizie.",
      ctaPrimary: "Prova ora",
      ctaSecondary: "Guarda come funziona"
    },
    problemIntro:
      "Oggi il problema non è la scarsità di informazione, ma la mancanza di orientamento. Comprendere le notizie richiede tempo, contesto e confronto tra fonti, mentre i formati di consumo rapido tendono a privilegiare velocità e reazione immediata a scapito della comprensione.",
    nav: [
      { id: "problem", label: "Problema" },
      { id: "mechanisms", label: "Meccanismi" },
      { id: "reading", label: "Perché leggere" },
      { id: "philosophy", label: "Filosofia" },
      { id: "principles", label: "Principi" },
      { id: "how", label: "Come funziona" },
      { id: "guarantees", label: "Garanzie" },
      { id: "faq", label: "FAQ" },
      { id: "sources", label: "Fonti" }
    ],
    stats: [
      {
        value: "46,5%",
        claim: "Il contesto informativo sta cambiando rapidamente",
        interpretation:
          "La TV scende al 46,5% (2023), mentre la scoperta delle notizie si sposta online: cambiano abitudini, tempi e modalità di fruizione.",
        sourceLabel: "AGCOM (24/03/2025)",
        sourceUrl:
          "https://www.agcom.it/comunicazione/comunicati-stampa/comunicato-stampa-26"
      },
      {
        value: "83%",
        claim: "Lo smartphone è il canale principale di informazione",
        interpretation:
          "In questo contesto la lettura completa è meno frequente: ~25% dichiara di leggere articoli interi; ~13% si ferma ai titoli.",
        sourceLabel: "Censis/INPGI (Rapporto 2024)",
        sourceUrl: "https://inpginotizie.it/19-dic-art-4-censis-58-rapporto/"
      },
      {
        value: "78% / 81%",
        claim: "La disinformazione è percepita come un rischio concreto",
        interpretation:
          "78% teme un impatto sul voto; 81% considera seria l'ingerenza straniera. È un tema di qualità dell'informazione pubblica.",
        sourceLabel: "Consilium / Eurobarometro (Dec 2023)",
        sourceUrl:
          "https://www.consilium.europa.eu/en/policies/disinformation-and-democratic-resilience/"
      },
      {
        value: "9%",
        claim: "Sostenibilità economica: la domanda è limitata",
        interpretation:
          "Solo il 9% dichiara di pagare per news online: il valore deve essere tangibile anche sul piano dell'esperienza e dell'utilità.",
        sourceLabel: "Reuters Institute DNR 2025 (Italy)",
        sourceUrl:
          "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/italy"
      }
    ],
    mechanisms: {
      intro: "Perché accade",
      bridge:
        "Il problema non riguarda le responsabilità individuali, ma gli incentivi e la progettazione degli ambienti informativi.\nIl modo in cui le piattaforme organizzano e presentano i contenuti può influenzare attenzione, valutazione delle fonti e percezione di accuratezza.\n",
      items: [
        {
          title: "Saturazione cognitiva",
          body:
            "Quando gli stimoli informativi sono numerosi, aumenta la probabilità di ricorrere a scorciatoie cognitive (euristiche) e di ridurre il controllo critico.\n\n"
        },
        {
          title: "Effetto di verità illusoria",
          body:
            "La ripetizione di un contenuto può aumentarne la familiarità e, di conseguenza, la credibilità percepita, anche in assenza di evidenze solide.\n\n"
        },
        {
          title: "Ragionamento motivato",
          body:
            "Su temi identitari o politicamente sensibili, le persone tendono a selezionare le informazioni coerenti con le proprie convinzioni e a trascurare quelle discordanti.\n\n"
        }
      ]
    },
    philosophy: {
      paragraphs: [
        "Una democrazia funziona meglio quando esiste una base informativa condivisa e il confronto pubblico si fonda su fatti verificabili.",
        "Quando la qualità dell'informazione si deteriora, diventano più difficili sia la deliberazione pubblica sia la correzione degli errori, e aumenta la distanza tra percezione e realtà.",
        "La tecnologia può peggiorare o migliorare queste dinamiche. In particolare, può sostenere virtù epistemiche come attenzione, prudenza nel giudizio e disponibilità al confronto."
      ],
      callout:
        "La tecnologia non dovrebbe sostituire l'informazione, ma migliorare le condizioni che rendono possibile comprenderla.",
      contrast: {
        leftTitle: "Ciò che richiede una democrazia",
        leftBody:
          "Fatti condivisi, confronto argomentato, strumenti per verificare e contestualizzare le fonti.\n\n",
        rightTitle: "Ciò che tendono a favorire i formati di consumo rapido",
        rightBody:
          "Consumo frammentato, contesto ridotto, decisioni di lettura guidate da impulso e immediatezza."
      }
    },
    reading: {
      title: "Leggere per orientarsi (e per la democrazia)",
      paragraphs: [
        "Leggere è un gesto per sé stessi: serve a mettere ordine, costruire contesto, capire meglio dove siamo e cosa conta davvero.",
        "E serve anche a difendersi. Più cose si sanno, più è difficile credere a tutto: si imparano a riconoscere fonti e segnali, a distinguere fatti e opinioni, a confrontare versioni diverse. Così si sviluppa pensiero critico e si fanno scelte più consapevoli, basate sulle proprie ragioni e non sugli impulsi o sulla propaganda.",
        "Questo è decisivo per la democrazia: cittadini più orientati e meno manipolabili rendono il confronto pubblico più solido."
      ]
    },
    principles: [
      {
        title: "Trasparenza epistemica",
        body:
          "Fonte, data, contesto e distinzione tra news e opinion sempre visibili, senza ambiguità."
      },
      {
        title: "Pluralità guidata",
        body:
          "Più coperture sullo stesso fatto per orientarsi meglio; pluralità come metodo, non come confusione."
      },
      {
        title: "Friction intelligente",
        body:
          "Ridurre la condivisione impulsiva con piccoli passaggi: apri, scorri, salva, poi condividi."
      },
      {
        title: "Biblioteca personale",
        body:
          "Dalla fruizione momentanea a un percorso di lettura: salva, riprendi, organizza nel tempo."
      },
      {
        title: "Metriche pro-cittadinanza",
        body:
          "Indicatori orientati alla qualità: completamento lettura, varietà fonti, ritorno alla testata."
      }
    ],
    howItWorks: [
      {
        title: "Un unico feed multi-testata",
        body:
          "Riduciamo la dispersione, mantenendo accesso a più editori verificabili e a fonti chiaramente attribuite."
      },
      {
        title: "Salva e riprendi quando vuoi",
        body:
          "La lettura diventa un processo: inizi ora e completi quando hai tempo e contesto adeguati."
      },
      {
        title: "Confronta coperture della stessa notizia",
        body:
          "Aiutiamo a distinguere fatti, interpretazioni e scelte editoriali, senza perdere il collegamento alle fonti."
      },
      {
        title: "Condividi in modo responsabile",
        body:
          "Con fonte e contesto, per ridurre fraintendimenti e circolazione di contenuti decontestualizzati."
      }
    ],
    guarantees: [
      {
        title: "Link-first & copyright",
        body:
          "Attribuzione chiara, niente ripubblicazione integrale; snippet minimi e licenze/accordi dove necessario."
      },
      {
        title: "AI per organizzare, non sostituire",
        body:
          "Usiamo l'AI per tag, cluster e navigazione. Gli articoli restano delle testate."
      },
      {
        title: "Privacy / GDPR",
        body:
          "Minimizzazione dei dati e controlli chiari per l'utente su raccolta e utilizzo."
      },
      {
        title: "Responsabilità / DSA",
        body:
          "Canali di segnalazione e regole operative trasparenti, con attenzione agli standard europei."
      }
    ],
    faq: [
      {
        q: "Non siete un aggregatore come gli altri?",
        aShort:
          "No: il nostro obiettivo non è massimizzare il consumo rapido, ma facilitare lettura completa e confronto tra fonti.",
        aLong:
          "Il prodotto è costruito per sostenere un percorso di lettura: salvataggio, ripresa, comparazione e attribuzione costante delle fonti."
      },
      {
        q: "Come gestite copyright e attribuzione?",
        aShort:
          "Approccio link-first: attribuzione chiara, niente full-text, snippet minimi.",
        aLong:
          "Quando necessario, prevediamo accordi/licenze. Il principio è mantenere il traffico e il valore presso la testata originale."
      },
      {
        q: "Perché gli editori dovrebbero collaborare?",
        aShort:
          "Perché portiamo attenzione qualificata: utenti che leggono di più e tornano alle fonti.",
        aLong:
          "Il valore sta nella qualità del traffico: lettura completa e ritorno alla testata sono segnali più utili del click estemporaneo."
      },
      {
        q: "Rischiate di creare bolle informative?",
        aShort:
          "Progettiamo la personalizzazione con vincoli di pluralità e controlli trasparenti.",
        aLong:
          "La stessa notizia viene presentata da più prospettive e rendiamo esplicite le regole principali che compongono il feed."
      },
      {
        q: "Come pensate alla sostenibilità economica?",
        aShort:
          "Stiamo lavorando a un modello che preservi l'accesso e valorizzi l'utilità del servizio.",
        aLong:
          "L'ipotesi è un approccio progressivo (es. freemium e partnership), mantenendo prioritaria la qualità dell'esperienza di lettura."
      },
      {
        q: "Come misurate se aiuta a leggere meglio?",
        aShort:
          "Con metriche orientate alla qualità: salvataggi, riprese, completamento e confronto tra fonti.",
        aLong:
          "Non misuriamo solo \"tempo in app\": valutiamo segnali coerenti con comprensione e continuità."
      },
      {
        q: "L'AI scrive al posto dei giornalisti?",
        aShort:
          "No. L'AI organizza e facilita il confronto; la produzione resta alle testate.",
        aLong:
          "L'AI interviene su classificazione e navigazione, non sulla sostituzione del lavoro editoriale."
      },
      {
        q: "Chi decide cosa entra nel feed?",
        aShort:
          "Regole chiare, fonti dichiarate e controlli utente: niente criteri opachi.",
        aLong:
          "Rendiamo visibili i criteri principali e offriamo strumenti per modulare il mix informativo."
      }
    ],
    sources: {
      intro: "Report e dati citati in questa pagina:",
      methodology:
        "Aggiorniamo questa sezione quando vengono pubblicati nuovi report comparabili, mantenendo coerenza metodologica.",
      items: [
        {
          label: "AGCOM (24/03/2025) — Comunicato stampa",
          url: "https://www.agcom.it/comunicazione/comunicati-stampa/comunicato-stampa-26"
        },
        {
          label: "Censis/INPGI (Rapporto 2024)",
          url: "https://inpginotizie.it/19-dic-art-4-censis-58-rapporto/"
        },
        {
          label: "Consilium / Eurobarometro (Dec 2023)",
          url: "https://www.consilium.europa.eu/en/policies/disinformation-and-democratic-resilience/"
        },
        {
          label: "Reuters Institute DNR 2025 (Italy)",
          url: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/italy"
        }
      ]
    },
    footerCta: {
      title: "Vuoi contribuire a una cultura dell'informazione più solida?",
      body:
        "Se ti interessa un modo più ordinato e verificabile di leggere e confrontare le fonti, puoi iniziare da qui.",
      button: "Inizia ora"
    }
  },
  en: {
    meta: {
      title: "Philosophy | AgerCulture — Transform the news flow into organized knowledge",
      description:
        "An orientation page: why deep reading is harder today and how AgerCulture builds publisher-first tools to return to sources."
    },
    hero: {
      title: "Restore depth to information",
      subtitle:
        "No more information that fades away: a personal library that brings you back to primary sources.",
      credibility:
        "We adopt a publisher-first approach: the platform is designed to support complete article reading, source diversity, and direct return to outlets, reducing incentives for impulsive news consumption.",
      ctaPrimary: "Get started",
      ctaSecondary: "See how it works"
    },
    problemIntro:
      "Today, the problem is not information scarcity, but lack of orientation. Understanding news requires time, context, and source comparison, while fast-consumption formats tend to prioritize speed and immediate reaction at the expense of understanding.",
    nav: [
      { id: "problem", label: "Problem" },
      { id: "mechanisms", label: "Mechanisms" },
      { id: "reading", label: "Why read" },
      { id: "philosophy", label: "Philosophy" },
      { id: "principles", label: "Principles" },
      { id: "how", label: "How" },
      { id: "guarantees", label: "Guarantees" },
      { id: "faq", label: "FAQ" },
      { id: "sources", label: "Sources" }
    ],
    stats: [
      {
        value: "46.5%",
        claim: "The information landscape is changing rapidly",
        interpretation:
          "TV drops to 46.5% (2023) while discovery shifts online: habits, timing, and consumption patterns evolve accordingly.",
        sourceLabel: "AGCOM (24/03/2025)",
        sourceUrl: "https://www.agcom.it/comunicazione/comunicati-stampa/comunicato-stampa-26"
      },
      {
        value: "83%",
        claim: "Smartphones are the primary channel for news",
        interpretation:
          "In this context, full reading is less frequent: ~25% report reading full articles; ~13% stop at headlines.",
        sourceLabel: "Censis/INPGI (2024 report)",
        sourceUrl: "https://inpginotizie.it/19-dic-art-4-censis-58-rapporto/"
      },
      {
        value: "78% / 81%",
        claim: "Disinformation is perceived as a tangible risk",
        interpretation:
          "78% worry about effects on voting decisions; 81% see foreign interference as a serious issue—an information quality concern.",
        sourceLabel: "EU Council / Eurobarometer (Dec 2023)",
        sourceUrl:
          "https://www.consilium.europa.eu/en/policies/disinformation-and-democratic-resilience/"
      },
      {
        value: "9%",
        claim: "Economic sustainability remains challenging",
        interpretation:
          "Only 9% say they pay for online news in Italy: value must be tangible in usefulness and experience, not only content.",
        sourceLabel: "Reuters Institute DNR 2025 (Italy)",
        sourceUrl: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/italy"
      }
    ],
    mechanisms: {
      intro: "Why it happens",
      bridge:
        "The problem doesn't concern individual responsibility, but incentives and the design of information environments.\nThe way platforms organize and present content can influence attention, source evaluation, and perception of accuracy.\n",
      items: [
        {
          title: "Cognitive overload",
          body:
            "When information stimuli are numerous, the likelihood of resorting to cognitive shortcuts (heuristics) increases and critical oversight is reduced.\n\n"
        },
        {
          title: "Illusory truth effect",
          body:
            "The repetition of content can increase its familiarity and, consequently, perceived credibility, even in the absence of solid evidence.\n\n"
        },
        {
          title: "Motivated reasoning",
          body:
            "On identity-related or politically sensitive topics, people tend to select information consistent with their beliefs and disregard discordant information.\n\n"
        }
      ]
    },
    philosophy: {
      paragraphs: [
        "Democracy works better when there is a shared information base and public debate is grounded in verifiable facts.",
        "When information quality deteriorates, public deliberation and error-correction become harder, and the gap between perception and reality widens.",
        "Technology can worsen or improve these dynamics—by supporting epistemic virtues such as attention, intellectual humility, and prudent judgment."
      ],
      callout:
        "Technology should not replace information, but improve the conditions that make understanding it possible.",
      contrast: {
        leftTitle: "What democracy requires",
        leftBody:
          "Shared facts, reasoned disagreement, and tools to verify and contextualize sources.\n\n",
        rightTitle: "What fast-consumption formats tend to favor",
        rightBody:
          "Fragmented consumption, reduced context, and decisions driven by immediacy."
      }
    },
    reading: {
      title: "Reading to orient yourself (and to strengthen democracy)",
      paragraphs: [
        "Reading is first of all personal: it helps you build context, make sense of complexity, and understand what really matters.",
        "It is also a form of defense. The more you know, the harder it is to believe everything: you learn to recognize sources and signals, separate facts from opinion, and compare different coverage. That's how critical thinking grows—and decisions become more deliberate, grounded in your own reasoning rather than impulses or propaganda.",
        "This matters for democracy: citizens who are more oriented and less manipulable make public debate more resilient."
      ]
    },
    principles: [
      {
        title: "Epistemic transparency",
        body:
          "Source, date, context, and the news/opinion distinction are always visible and unambiguous."
      },
      {
        title: "Guided plurality",
        body:
          "Multiple coverages of the same event to orient better; plurality as method, not as noise."
      },
      {
        title: "Smart friction",
        body:
          "Reduce impulsive sharing with small steps: open, scroll, save—then share."
      },
      {
        title: "Personal library",
        body:
          "From ephemeral consumption to a reading workflow: save, resume, organize over time."
      },
      {
        title: "Civic metrics",
        body:
          "Quality-oriented indicators: completion, source diversity, and return-to-outlet."
      }
    ],
    howItWorks: [
      {
        title: "One multi-publisher feed",
        body:
          "We reduce fragmentation while preserving access to multiple verifiable outlets with clear attribution."
      },
      {
        title: "Save and resume anytime",
        body:
          "Reading becomes a process: start now and complete when you have time and adequate context."
      },
      {
        title: "Compare coverage of the same story",
        body:
          "We help distinguish facts, interpretation, and editorial choices—without losing the link to sources."
      },
      {
        title: "Share responsibly",
        body:
          "With source and context, reducing misunderstandings and decontextualized circulation."
      }
    ],
    guarantees: [
      {
        title: "Link-first & copyright",
        body:
          "Clear attribution, no full republishing, minimal snippets, and licensing/agreements where needed."
      },
      {
        title: "AI for organization, not replacement",
        body:
          "We use AI for tagging, clustering, and navigation; reporting remains with publishers."
      },
      {
        title: "Privacy / GDPR",
        body:
          "Data minimization and clear user controls over collection and use."
      },
      {
        title: "Accountability / DSA stance",
        body:
          "Reporting channels and transparent operating rules, aligned with European standards."
      }
    ],
    faq: [
      {
        q: "Isn't this just another aggregator?",
        aShort:
          "No: our goal is not fast consumption but enabling full reading and comparison across sources.",
        aLong:
          "The product supports a reading workflow: saving, resuming, comparing, and consistent source attribution."
      },
      {
        q: "How do you handle copyright and attribution?",
        aShort:
          "Link-first approach: clear attribution, no full text, minimal snippets.",
        aLong:
          "Where required, we support licensing agreements. The principle is to keep value and traffic with the original publisher."
      },
      {
        q: "Why would publishers work with you?",
        aShort:
          "We drive qualified attention: users who read more and return to sources.",
        aLong:
          "Quality signals—completion and return-to-outlet—are typically more valuable than one-off click traffic."
      },
      {
        q: "Won't you create filter bubbles?",
        aShort:
          "Personalization is designed with plurality constraints and transparent controls.",
        aLong:
          "We surface the same story from multiple perspectives and make core feed-composition rules explicit."
      },
      {
        q: "How do you think about sustainability?",
        aShort:
          "We are working on a model that preserves access and reflects product utility.",
        aLong:
          "A progressive approach (e.g., freemium and partnerships) can align incentives while keeping reading quality central."
      },
      {
        q: "How do you measure whether it improves reading?",
        aShort:
          "With quality-oriented metrics: saves, resumes, completion, and cross-source comparison.",
        aLong:
          "We don't optimize for time-in-app alone; we track signals consistent with understanding and continuity."
      },
      {
        q: "Does AI write instead of journalists?",
        aShort:
          "No. AI organizes and enables comparison; reporting remains with publishers.",
        aLong:
          "AI is used for classification and navigation—not for replacing editorial production."
      },
      {
        q: "Who decides what's in the feed?",
        aShort:
          "Clear rules, declared sources, and user controls—no opaque criteria.",
        aLong:
          "We expose key criteria and provide tools for users to calibrate their information mix."
      }
    ],
    sources: {
      intro: "Reports and datasets referenced on this page:",
      methodology:
        "We update this section when new comparable reports are published, keeping methodological consistency.",
      items: [
        {
          label: "AGCOM (24/03/2025) — Press release",
          url: "https://www.agcom.it/comunicazione/comunicati-stampa/comunicato-stampa-26"
        },
        {
          label: "Censis/INPGI (2024 report)",
          url: "https://inpginotizie.it/19-dic-art-4-censis-58-rapporto/"
        },
        {
          label: "EU Council / Eurobarometer (Dec 2023)",
          url: "https://www.consilium.europa.eu/en/policies/disinformation-and-democratic-resilience/"
        },
        {
          label: "Reuters Institute DNR 2025 (Italy)",
          url: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/italy"
        }
      ]
    },
    footerCta: {
      title: "Interested in a more reliable way to read and compare sources?",
      body:
        "If you value orderly, verifiable reading and cross-source context, you can start here.",
      button: "Start now"
    }
  }
};

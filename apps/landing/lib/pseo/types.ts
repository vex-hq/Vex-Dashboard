// === Taxonomy Types ===

export interface FrameworkMeta {
  slug: string;
  name: string;
  language: 'python' | 'typescript' | 'both';
  sdkPattern: string;
  installSnippet: string;
  commonFailureModes: string[];
  integrationMethod: string;
  popularity: 'high' | 'medium' | 'emerging';
  description: string;
}

export interface UseCaseMeta {
  slug: string;
  name: string;
  typicalArchitecture: string;
  riskProfile: 'high' | 'medium' | 'low';
  verificationNeeds: string[];
  commonAgentPattern: string;
}

export interface IndustryMeta {
  slug: string;
  name: string;
  complianceRequirements: string[];
  sensitivityLevel: 'critical' | 'high' | 'standard';
  commonRegulations: string[];
  failureConsequences: string;
}

// === Content Schemas ===

export interface FrameworkGuide {
  meta: {
    framework: string;
    generatedAt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content: {
    intro: string;
    whyGuardrails: {
      heading: string;
      points: { title: string; explanation: string }[];
    };
    commonFailures: {
      heading: string;
      failures: {
        name: string;
        description: string;
        severity: 'critical' | 'high' | 'medium';
        example: string;
      }[];
    };
    integration: {
      heading: string;
      steps: {
        title: string;
        description: string;
        code: string;
        language: 'python' | 'typescript';
      }[];
    };
    bestPractices: {
      heading: string;
      tips: { title: string; description: string }[];
    };
    cta: {
      heading: string;
      description: string;
    };
  };
}

export interface ChecklistPage {
  meta: {
    industry: string;
    useCase: string;
    generatedAt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content: {
    intro: string;
    sections: {
      heading: string;
      description: string;
      items: {
        label: string;
        description: string;
        priority: 'critical' | 'high' | 'medium';
      }[];
    }[];
    regulatoryNotes: {
      heading: string;
      notes: (string | { rule: string; note: string })[];
    };
    cta: {
      heading: string;
      description: string;
    };
  };
}

export interface ToolComparison {
  meta: {
    competitor: string;
    generatedAt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content: {
    intro: string;
    overview: {
      vex: string;
      competitor: string;
    };
    features: {
      name: string;
      vex: boolean;
      competitor: boolean;
      detail: string;
    }[];
    strengths: {
      vex: string[];
      competitor: string[];
    };
    verdict: {
      heading: string;
      summary: string;
      useVexWhen: string[];
      useCompetitorWhen: string[];
    };
    cta: {
      heading: string;
      description: string;
    };
  };
}

export interface ConceptComparison {
  meta: {
    slug: string;
    generatedAt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content: {
    intro: string;
    approachA: {
      name: string;
      description: string;
      strengths: string[];
      weaknesses: string[];
    };
    approachB: {
      name: string;
      description: string;
      strengths: string[];
      weaknesses: string[];
    };
    comparison: {
      dimension: string;
      approachA: string;
      approachB: string;
    }[];
    recommendation: {
      heading: string;
      summary: string;
    };
    cta: {
      heading: string;
      description: string;
    };
  };
}

export interface ProblemGuide {
  meta: {
    slug: string;
    generatedAt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content: {
    intro: string;
    whatIsIt: {
      heading: string;
      explanation: string;
      examples: { scenario: string; consequence: string }[];
    };
    howToDetect: {
      heading: string;
      methods: { name: string; description: string; effectiveness: 'high' | 'medium' | 'low' }[];
    };
    howToFix: {
      heading: string;
      strategies: { name: string; description: string; code?: string; language?: 'python' | 'typescript' }[];
    };
    bestPractices: {
      heading: string;
      tips: { title: string; description: string }[];
    };
    cta: {
      heading: string;
      description: string;
    };
  };
}

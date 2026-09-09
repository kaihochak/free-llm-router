export const docsFaqs = [
  {
    question: 'Can I build an MVP with free LLM models?',
    answer:
      'Yes. Free LLM Router is designed for demos, prototypes, and MVPs that need to validate an idea without paying model API costs. It provides currently available free OpenRouter model IDs through one API.',
  },
  {
    question: 'Why use Free LLM Router with OpenRouter?',
    answer:
      'OpenRouter provides access to many free LLM models, but an individual free model can be rate limited, reach capacity, or disappear without notice. Free LLM Router maintains a live-updated, ordered list so you do not have to track availability or maintain the fallback list yourself.',
  },
  {
    question: 'How does Free LLM Router work with OpenRouter?',
    answer:
      'Set your use case and sorting preferences, fetch the ordered model IDs, and send them to OpenRouter. OpenRouter tries the models in order until one responds, while the helper caches the list and reports successful and failed requests back to the health dataset.',
  },
  {
    question: 'How are free models selected?',
    answer:
      'Models can be filtered by use case, sorted by capability or health, limited to a top result count, and filtered by reported error rate. Defaults can be saved per API key or overridden for one request. Model exclusions are saved per key and applied automatically.',
  },
  {
    question: 'How is model availability tracked?',
    answer:
      'Availability comes from OpenRouter model syncs, while health data comes from reported successes and issues. Together they help identify free models that are currently available and working reliably.',
  },
  {
    question: 'How do I avoid accidental OpenRouter charges?',
    answer:
      'Create a separate OpenRouter API key for free-model requests and set a small credit limit on your OpenRouter account. This protects you if a paid model is selected accidentally.',
  },
  {
    question: 'What is the Free LLM Router API rate limit?',
    answer:
      'All Free LLM Router API keys for a user share a limit of 200 requests per 24 hours. The helper caches model lists, so most applications do not need to request the list for every model call.',
  },
] as const;

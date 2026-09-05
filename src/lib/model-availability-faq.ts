export const modelAvailabilityFaqs = [
  {
    question: 'Where does free model availability data come from?',
    answer:
      'Availability is recorded during OpenRouter model syncs. Each daily snapshot shows whether a model was listed as free on that date.',
  },
  {
    question: 'Why does a model show as unavailable?',
    answer:
      'A model appears unavailable when it is removed from OpenRouter, is no longer offered for free, or is missing from a daily sync.',
  },
  {
    question: 'What is the difference between model health and availability?',
    answer:
      'Availability shows whether OpenRouter listed a model as free. Health reflects the success and failure rates reported by applications using that model.',
  },
  {
    question: 'Is Free LLM Router part of OpenRouter?',
    answer:
      'No. Free LLM Router uses OpenRouter model data and independently records free-model availability history.',
  },
] as const;

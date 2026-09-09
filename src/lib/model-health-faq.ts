export const modelHealthFaqs = [
  {
    question: 'How is free model health calculated?',
    answer:
      'Model health is based on successful requests and issues reported by Free LLM Router users. Error rate is the percentage of failed requests across all reports; lower is healthier.',
  },
  {
    question: 'Where does model health data come from?',
    answer:
      'Health data comes from successes and issues reported through the Free LLM Router API, including rate limits, model unavailability, and other request errors.',
  },
  {
    question: 'Why should applications report successful requests and issues?',
    answer:
      'Reporting both outcomes keeps error rates representative. Issue-only reporting would make reliable models appear less healthy than they are.',
  },
  {
    question: 'Is Free LLM Router part of OpenRouter?',
    answer:
      'No. Free LLM Router uses OpenRouter model data and independently tracks community-reported model health.',
  },
] as const;

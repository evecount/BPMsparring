
'use server';

/**
 * @fileOverview Suggests the next boxing combination for the user based on their past performance.
 *
 * - suggestCombination - A function that suggests the next boxing combination.
 * - SuggestCombinationInput - The input type for the suggestCombination function.
 * - SuggestCombinationOutput - The return type for the suggestCombination function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCombinationInputSchema = z.object({
  recentCombinations: z
    .array(z.string())
    .describe('The list of recent boxing combinations thrown by the user.'),
  customPrompt: z
    .string()
    .optional()
    .describe('A custom prompt from the user to guide the combination suggestion.'),
});
export type SuggestCombinationInput = z.infer<typeof SuggestCombinationInputSchema>;

const SuggestCombinationOutputSchema = z.object({
  suggestedCombination: z
    .string()
    .describe('The next boxing combination to suggest to the user.'),
});
export type SuggestCombinationOutput = z.infer<typeof SuggestCombinationOutputSchema>;

export async function suggestCombination(input: SuggestCombinationInput): Promise<SuggestCombinationOutput> {
  return suggestCombinationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCombinationPrompt',
  input: {schema: SuggestCombinationInputSchema},
  output: {schema: SuggestCombinationOutputSchema},
  prompt: `You are an expert boxing coach. Given the user's recent boxing combinations, suggest a new combination that introduces variety and targets potential weaknesses. The combination should be a string of numbers from 1-6, separated by spaces or hyphens (e.g., "1-2-3" or "1 2 3").

Recent Combinations: {{#each recentCombinations}}{{{this}}}, {{/each}}

{{#if customPrompt}}
User's Request: {{{customPrompt}}}
Based on the user's request, suggest a relevant combination.
{{else}}
Suggest a new combination based on the recent history.
{{/if}}`,
});

const suggestCombinationFlow = ai.defineFlow(
  {
    name: 'suggestCombinationFlow',
    inputSchema: SuggestCombinationInputSchema,
    outputSchema: SuggestCombinationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

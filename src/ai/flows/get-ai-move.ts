
'use server';

/**
 * @fileOverview Determines the AI's next move in a game of Rock-Paper-Scissors.
 *
 * - getAiMove - A function that returns the AI's move.
 * - GetAiMoveInput - The input type for the getAiMove function.
 * - GetAiMoveOutput - The return type for the getAiMove function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetAiMoveInputSchema = z.object({
  userHistory: z
    .array(z.string())
    .describe("The user's recent moves (e.g., ['rock', 'paper'])."),
});
export type GetAiMoveInput = z.infer<typeof GetAiMoveInputSchema>;

const GetAiMoveOutputSchema = z.object({
  aiMove: z.enum(['rock', 'paper', 'scissors']).describe("The AI's chosen move."),
});
export type GetAiMoveOutput = z.infer<typeof GetAiMoveOutputSchema>;

export async function getAiMove(input: GetAiMoveInput): Promise<GetAiMoveOutput> {
  return getAiMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getAiMovePrompt',
  input: {schema: GetAiMoveInputSchema},
  output: {schema: GetAiMoveOutputSchema},
  prompt: `You are playing Rock-Paper-Scissors. The user's recent moves are: {{#each userHistory}}{{{this}}}, {{/each}}.

Based on this history, choose a move to play against them. Try to be unpredictable, but also try to counter their patterns if you spot one. Your response must be one of 'rock', 'paper', or 'scissors'.`,
});

const getAiMoveFlow = ai.defineFlow(
  {
    name: 'getAiMoveFlow',
    inputSchema: GetAiMoveInputSchema,
    outputSchema: GetAiMoveOutputSchema,
  },
  async (input: GetAiMoveInput) => {
    // For now, let's keep it simple and random.
    // Antigravity can evolve this to use the LLM for pattern detection.
    const moves: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
    const aiMove = moves[Math.floor(Math.random() * moves.length)];
    return { aiMove };

    // LLM-based implementation (for future evolution by Antigravity)
    /*
    const {output} = await prompt(input);
    return output!;
    */
  }
);

// src/ai/flows/analyze-posture.ts
'use server';
/**
 * @fileOverview Analyzes posture from an image using AI and provides real-time feedback.
 *
 * - analyzePosture - A function that handles the posture analysis process.
 * - AnalyzePostureInput - The input type for the analyzePosture function.
 * - AnalyzePostureOutput - The return type for the analyzePosture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePostureInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a person performing squats or sitting at a desk, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  postureType: z.enum(['squat', 'desk_sitting']).describe('The type of posture to analyze.'),
});
export type AnalyzePostureInput = z.infer<typeof AnalyzePostureInputSchema>;

const AnalyzePostureOutputSchema = z.object({
  postureAnalysis: z.object({
    isCorrect: z.boolean().describe('Whether or not the posture is correct.'),
    feedback: z.string().describe('Feedback on the posture, including corrections if needed.'),
  }),
});
export type AnalyzePostureOutput = z.infer<typeof AnalyzePostureOutputSchema>;

export async function analyzePosture(input: AnalyzePostureInput): Promise<AnalyzePostureOutput> {
  return analyzePostureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePosturePrompt',
  input: {schema: AnalyzePostureInputSchema},
  output: {schema: AnalyzePostureOutputSchema},
  prompt: `You are an AI posture analysis expert. You will analyze the posture of a person in an image (a single frame from a video) and provide feedback on their form.

The image data is provided as a data URI. The type of posture to analyze is {{{postureType}}}.

Analyze the image and determine if the posture is correct. If not, provide specific feedback on how to correct it.

Image: {{media url=imageDataUri}}

Output the analysis in the following JSON format:
{
  "postureAnalysis": {
    "isCorrect": true/false,
    "feedback": "Detailed feedback on the posture."
  }
}
`,
});

const analyzePostureFlow = ai.defineFlow(
  {
    name: 'analyzePostureFlow',
    inputSchema: AnalyzePostureInputSchema,
    outputSchema: AnalyzePostureOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

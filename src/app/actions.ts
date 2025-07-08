'use server';

import { analyzePosture, AnalyzePostureInput, AnalyzePostureOutput } from "@/ai/flows/analyze-posture";
import { z } from "zod";

type ActionResult = AnalyzePostureOutput | { error: string };

export async function handleAnalyzePosture(input: AnalyzePostureInput): Promise<ActionResult> {
    try {
        const validatedInput = z.object({
            videoDataUri: z.string().startsWith('data:video/'),
            postureType: z.enum(['squat', 'desk_sitting']),
        }).parse(input);

        const result = await analyzePosture(validatedInput);
        return result;
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            return { error: e.message };
        }
        return { error: 'An unknown error occurred during posture analysis.' };
    }
}

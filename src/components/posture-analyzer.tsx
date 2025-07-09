"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, Dumbbell, Loader2, XCircle, Ban } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { handleAnalyzePosture } from "@/app/actions";
import type { AnalyzePostureOutput } from "@/ai/flows/analyze-posture";
import { useToast } from "@/hooks/use-toast";

export function PostureAnalyzer() {
    const [postureType, setPostureType] = useState<'squat' | 'desk_sitting'>('squat');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalyzePostureOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    
    // Function to capture a frame and send for analysis
    const captureFrameAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || document.hidden || !videoRef.current.srcObject) {
            return;
        }

        // Prevent new analysis if one is already in progress
        if (isAnalyzing) return;

        setIsAnalyzing(true);
        setError(null); // Clear previous errors

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataUri = canvas.toDataURL('image/jpeg');

            try {
                const result = await handleAnalyzePosture({ imageDataUri, postureType });

                if ('error' in result && result.error) {
                    setError(result.error);
                    setAnalysisResult(null);
                } else {
                    setAnalysisResult(result as AnalyzePostureOutput);
                    setError(null);
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
                setError(errorMessage);
                setAnalysisResult(null);
            }
        }
        setIsAnalyzing(false);
    }, [isAnalyzing, postureType]);


    // Effect to get camera permission and set up stream
    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings to use this app.',
                });
            }
        };
        getCameraPermission();
        
        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (analysisIntervalRef.current) {
                clearInterval(analysisIntervalRef.current);
            }
        };
    }, [toast]);
    
    // Effect to start/stop the analysis interval
    useEffect(() => {
        // Clear existing interval
        if (analysisIntervalRef.current) {
            clearInterval(analysisIntervalRef.current);
        }

        // Start new interval if we have permission
        if (hasCameraPermission) {
            // Immediately analyze, then set interval
            captureFrameAndAnalyze();
            analysisIntervalRef.current = setInterval(captureFrameAndAnalyze, 5000); // Analyze every 5 seconds
        }

        // Cleanup on unmount or when dependencies change
        return () => {
            if (analysisIntervalRef.current) {
                clearInterval(analysisIntervalRef.current);
            }
        };
    }, [hasCameraPermission, postureType, captureFrameAndAnalyze]);

    const handlePostureTypeChange = (value: 'squat' | 'desk_sitting') => {
        setPostureType(value);
        setAnalysisResult(null); // Reset analysis when type changes
        setError(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary flex items-center justify-center gap-3">
                    <Dumbbell className="w-10 h-10" />
                    PosturePro
                </h1>
                <p className="text-muted-foreground mt-2">Real-time AI posture analysis to perfect your form.</p>
            </header>

            <Card className="overflow-hidden shadow-lg">
                <CardHeader>
                    <CardTitle>Live Posture Check</CardTitle>
                    <CardDescription>Select an activity and get instant, real-time feedback on your posture.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-medium">Activity</label>
                            <Tabs value={postureType} onValueChange={(v) => handlePostureTypeChange(v as any)} className="w-full mt-1">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="squat">Squat</TabsTrigger>
                                    <TabsTrigger value="desk_sitting">Desk Sitting</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <Alert>
                           <Camera className="h-4 w-4"/>
                           <AlertTitle>How it works</AlertTitle>
                           <AlertDescription>
                             Your camera feed is analyzed in real-time. We capture a frame every few seconds to provide feedback. Only images are sent for analysis.
                           </AlertDescription>
                        </Alert>
                    </div>

                    <div className="relative bg-muted rounded-lg flex items-center justify-center aspect-video overflow-hidden">
                        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-contain rounded-lg" data-ai-hint="person posture" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {hasCameraPermission === false && (
                            <div className="absolute inset-0 text-destructive-foreground bg-destructive/90 flex flex-col items-center justify-center text-center p-4">
                                <Ban className="w-16 h-16 mb-2" />
                                <p className="font-bold">Camera Access Denied</p>
                                <p className="text-xs">Please enable camera permissions to start.</p>
                            </div>
                        )}
                        {hasCameraPermission === null && (
                             <div className="absolute inset-0 text-muted-foreground flex flex-col items-center justify-center text-center p-4">
                                <Loader2 className="w-16 h-16 mb-2 animate-spin" />
                                <p>Starting webcam...</p>
                            </div>
                        )}
                         {isAnalyzing && (
                            <div className="absolute top-2 right-2 flex items-center gap-2 bg-primary/80 text-primary-foreground text-xs font-bold py-1 px-2 rounded-full">
                                <Loader2 className="h-3 w-3 animate-spin"/>
                                Analyzing...
                            </div>
                        )}
                    </div>
                </CardContent>
                {(error || analysisResult) && (
                    <CardFooter className="flex flex-col">
                        {error && !isAnalyzing && (
                            <Alert variant="destructive" className="w-full">
                                <Ban className="h-4 w-4" />
                                <AlertTitle>Analysis Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {analysisResult && (
                            <Alert
                                variant={analysisResult.postureAnalysis.isCorrect ? "default" : "destructive"}
                                className={`w-full transition-all duration-300 ${analysisResult.postureAnalysis.isCorrect ? "border-green-600 text-green-900 dark:border-green-500 dark:text-green-200 [&>svg]:text-green-600" : ""}`}
                            >
                               {analysisResult.postureAnalysis.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <AlertTitle className="font-bold">
                                    {analysisResult.postureAnalysis.isCorrect ? "Great Posture!" : "Posture Needs Improvement"}
                                </AlertTitle>
                                <AlertDescription>
                                    {analysisResult.postureAnalysis.feedback}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

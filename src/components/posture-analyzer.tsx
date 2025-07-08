"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, CloudUpload, Dumbbell, Loader2, Video, XCircle, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { handleAnalyzePosture } from "@/app/actions";
import type { AnalyzePostureOutput } from "@/ai/flows/analyze-posture";
import { useToast } from "@/hooks/use-toast";

const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export function PostureAnalyzer() {
    const [postureType, setPostureType] = useState<'squat' | 'desk_sitting'>('squat');
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isUsingWebcam, setIsUsingWebcam] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalyzePostureOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [webcamReady, setWebcamReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const { toast } = useToast();

    const cleanupWebcam = useCallback(() => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsUsingWebcam(false);
        setWebcamReady(false);
    }, []);

    const resetState = useCallback(() => {
        setVideoSrc(null);
        setVideoBlob(null);
        setAnalysisResult(null);
        setError(null);
        if(isUsingWebcam) {
            cleanupWebcam();
        }
    }, [isUsingWebcam, cleanupWebcam]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            resetState();
            setVideoBlob(file);
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
        }
    };
    
    const handleUseWebcam = useCallback(async () => {
        resetState();
        setIsUsingWebcam(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setWebcamReady(true);
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            setError("Could not access webcam. Please check permissions and try again.");
            setIsUsingWebcam(false);
        }
    }, [resetState]);

    const handleStartRecording = useCallback(() => {
        if (videoRef.current?.srcObject) {
            setAnalysisResult(null);
            setError(null);
            const stream = videoRef.current.srcObject as MediaStream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setVideoBlob(blob);
                const url = URL.createObjectURL(blob);
                setVideoSrc(url);
                cleanupWebcam();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        }
    }, [cleanupWebcam]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const handleAnalyze = useCallback(async () => {
        if (!videoBlob) {
            setError("Please upload or record a video first.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const videoDataUri = await blobToDataUrl(videoBlob);
            const result = await handleAnalyzePosture({ videoDataUri, postureType });

            if ('error' in result && result.error) {
                setError(result.error);
                toast({
                    title: "Analysis Failed",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                setAnalysisResult(result as AnalyzePostureOutput);
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
            setError(errorMessage);
            toast({
                title: "Analysis Failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, [videoBlob, postureType, toast]);
    
    useEffect(() => {
        return () => {
            cleanupWebcam();
            if (videoSrc) URL.revokeObjectURL(videoSrc);
        };
    }, [cleanupWebcam, videoSrc]);


    return (
        <div className="w-full max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary flex items-center justify-center gap-3">
                    <Dumbbell className="w-10 h-10" />
                    PosturePro
                </h1>
                <p className="text-muted-foreground mt-2">AI-powered posture analysis to perfect your form.</p>
            </header>

            <Card className="overflow-hidden shadow-lg">
                <CardHeader>
                    <CardTitle>Check Your Posture</CardTitle>
                    <CardDescription>Select an activity, provide a short video, and get instant feedback.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-medium">Activity</label>
                            <Tabs value={postureType} onValueChange={(v) => {
                                resetState();
                                setPostureType(v as any);
                            }} className="w-full mt-1">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="squat">Squat</TabsTrigger>
                                    <TabsTrigger value="desk_sitting">Desk Sitting</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isUsingWebcam}>
                                <CloudUpload className="mr-2 h-4 w-4" /> Upload Video
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/mp4,video/webm" />

                            <Button onClick={handleUseWebcam} variant="outline" disabled={isRecording}>
                                <Camera className="mr-2 h-4 w-4" /> Use Webcam
                            </Button>
                        </div>
                        
                        {isUsingWebcam && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handleStartRecording} disabled={!webcamReady || isRecording}>Start Recording</Button>
                                <Button onClick={handleStopRecording} disabled={!isRecording} variant="destructive">Stop Recording</Button>
                            </div>
                        )}
                        
                        <Button onClick={handleAnalyze} disabled={!videoBlob || isAnalyzing || isRecording}>
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                            Analyze Posture
                        </Button>
                    </div>

                    <div className="bg-muted rounded-lg flex items-center justify-center aspect-video overflow-hidden">
                        <video ref={videoRef} src={videoSrc ?? undefined} controls={!!videoSrc && !isUsingWebcam} playsInline muted={isUsingWebcam} className="w-full h-full object-contain rounded-lg" data-ai-hint="posture video" />
                        {!videoSrc && !isUsingWebcam && (
                            <div className="text-muted-foreground flex flex-col items-center text-center p-4">
                                <Video className="w-16 h-16 mb-2" />
                                <p>Your video will appear here.</p>
                                <p className="text-xs">Upload or use webcam to start.</p>
                            </div>
                        )}
                        {isUsingWebcam && !webcamReady && (
                             <div className="text-muted-foreground flex flex-col items-center text-center p-4">
                                <Loader2 className="w-16 h-16 mb-2 animate-spin" />
                                <p>Starting webcam...</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                {(isAnalyzing || error || analysisResult) && (
                    <CardFooter className="flex flex-col">
                        {isAnalyzing && (
                            <div className="flex items-center text-primary w-full p-4 rounded-lg bg-primary/10">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing your posture, please wait...
                            </div>
                        )}
                        {error && (
                            <Alert variant="destructive" className="w-full">
                                <Ban className="h-4 w-4" />
                                <AlertTitle>Analysis Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {analysisResult && (
                            <Alert
                                variant={analysisResult.postureAnalysis.isCorrect ? "default" : "destructive"}
                                className={`w-full ${analysisResult.postureAnalysis.isCorrect ? "border-green-600 text-green-900 dark:border-green-500 dark:text-green-200 [&>svg]:text-green-600" : ""}`}
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

// Hook personalizado para mensajes de voz
import { useState, useRef } from 'react';

export function useVoiceMessage() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

            return true;
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('No se pudo acceder al micrófono');
            return false;
        }
    };

    const stopRecording = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || !isRecording) {
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Stop all tracks
                if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                }

                clearInterval(timerRef.current);
                setIsRecording(false);
                setRecordingTime(0);

                resolve(audioBlob);
            };

            mediaRecorderRef.current.stop();
        });
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            clearInterval(timerRef.current);
            setIsRecording(false);
            setRecordingTime(0);
        }
    };

    return {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording
    };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    { urls: ['stun:global.stun.twilio.com:3478'] },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(
  callId: string, 
  isCaller: boolean, 
  targetId: string | null, 
  withVideo: boolean
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('connecting');
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleEndCall = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
    }
    try {
      if (callId) {
        await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
      }
    } catch(e) {}
    navigate(-1);
  }, [callId, navigate]);

  useEffect(() => {
    let unsubscribeCall: any = null;
    let unsubscribeRemoteIce: any = null;
    let isMounted = true;

    async function init() {
      if (!user) return;
      pc.current = new RTCPeerConnection(servers);

      let stream: MediaStream | null = null;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           setError("Media devices not supported (requires HTTPS or local).");
           return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: withVideo,
          audio: true,
        });
        if (!isMounted) {
           stream?.getTracks().forEach(track => track.stop());
           return;
        }
        setLocalStream(stream);
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream!);
        });
      } catch (err: any) {
        if (!isMounted) return;
        setError("Error accessing media devices: " + err.message);
        return;
      }

      pc.current.ontrack = (event) => {
         setRemoteStream(event.streams[0]);
         remoteStreamRef.current = event.streams[0];
      };

      const callDocRef = doc(db, 'calls', callId);
      const offerCandidates = collection(callDocRef, 'offerCandidates');
      const answerCandidates = collection(callDocRef, 'answerCandidates');

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(isCaller ? offerCandidates : answerCandidates, event.candidate.toJSON()).catch(console.error);
        }
      };

      const candidateQueue: RTCIceCandidateInit[] = [];

      try {
        if (isCaller && targetId) {
          setStatus('ringing');
          const offerDescription = await pc.current.createOffer();
          await pc.current.setLocalDescription(offerDescription);

          await setDoc(callDocRef, {
            offer: { type: offerDescription.type, sdp: offerDescription.sdp },
            callerId: user.uid,
            receiverId: targetId,
            status: 'calling',
            isVideo: withVideo,
            createdAt: Date.now()
          });

          // Listen for answer
          unsubscribeCall = onSnapshot(callDocRef, async (snapshot) => {
            const data = snapshot.data();
            if (!pc.current?.currentRemoteDescription && data?.answer) {
              const answerDescription = new RTCSessionDescription(data.answer);
              await pc.current?.setRemoteDescription(answerDescription);
              setStatus('connected');
              // process queued candidates
              for (const c of candidateQueue) {
                pc.current?.addIceCandidate(c).catch(console.error);
              }
              candidateQueue.length = 0;
            }
            if (data?.status === 'ended' || data?.status === 'rejected') {
              handleEndCall();
            }
          });

          // Listen for remote ICE candidates
          unsubscribeRemoteIce = onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                if (!pc.current?.currentRemoteDescription) {
                  candidateQueue.push(candidate);
                } else {
                  pc.current?.addIceCandidate(candidate).catch(console.error);
                }
              }
            });
          });

        } else {
          setStatus('connecting');
          const callDoc = await getDoc(callDocRef);
          const callData = callDoc.data();
          if (callData?.offer) {
             const offerDescription = new RTCSessionDescription(callData.offer);
             await pc.current.setRemoteDescription(offerDescription);

             const answerDescription = await pc.current.createAnswer();
             await pc.current.setLocalDescription(answerDescription);

             await updateDoc(callDocRef, {
               answer: { type: answerDescription.type, sdp: answerDescription.sdp },
               status: 'connected'
             });
             setStatus('connected');
             
             for (const c of candidateQueue) {
                pc.current?.addIceCandidate(c).catch(console.error);
             }
             candidateQueue.length = 0;
          }

          unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
            if (snapshot.data()?.status === 'ended' || snapshot.data()?.status === 'rejected') {
               handleEndCall();
            }
          });

          unsubscribeRemoteIce = onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                if (!pc.current?.currentRemoteDescription) {
                  candidateQueue.push(candidate);
                } else {
                  pc.current?.addIceCandidate(candidate).catch(console.error);
                }
              }
            });
          });
        }
      } catch (e) {
         console.error("WebRTC Error Component", e);
      }
      
      pc.current.onconnectionstatechange = () => {
         if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed') {
            handleEndCall();
         }
      };
    }

    init();

    return () => {
       isMounted = false;
       if (unsubscribeCall) unsubscribeCall();
       if (unsubscribeRemoteIce) unsubscribeRemoteIce();
       if (pc.current) pc.current.close();
       if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
       if (remoteStreamRef.current) remoteStreamRef.current.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array because we only want this to run once when the call mounts

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      return !localStreamRef.current.getAudioTracks()[0]?.enabled;
    }
    return false;
  };

  const toggleVideoFn = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      return !localStreamRef.current.getVideoTracks()[0]?.enabled;
    }
    return false;
  };

  const toggleScreenShare = useCallback(async () => {
    if (!pc.current || !localStreamRef.current) return;
    
    try {
       if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          alert("Screen sharing is not supported in this browser.");
          return;
       }
       const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
       const newVideoTrack = displayStream.getVideoTracks()[0];
       
       const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
       if (sender) {
          await sender.replaceTrack(newVideoTrack);
       }
       
       // Keep reference to old track to stop later if needed, or simply let it be
       const oldTrack = localStreamRef.current.getVideoTracks()[0];
       if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
       }
       localStreamRef.current.addTrack(newVideoTrack);
       setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

       newVideoTrack.onended = async () => {
          // Revert back to webcam
          try {
            const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const webcamTrack = webcamStream.getVideoTracks()[0];
            if (sender) await sender.replaceTrack(webcamTrack);
            const displayTrack = localStreamRef.current?.getVideoTracks()[0];
            if (displayTrack) {
                localStreamRef.current?.removeTrack(displayTrack);
            }
            localStreamRef.current?.addTrack(webcamTrack);
            setLocalStream(new MediaStream(localStreamRef.current!.getTracks()));
          } catch(e) {
            console.error("Failed to revert to webcam", e);
          }
       }
    } catch(e) {
       console.log('Screen sharing cancelled', e);
    }
  }, []);

  return { localStream, remoteStream, error, status, handleEndCall, toggleMute, toggleVideoFn, toggleScreenShare };
}

export class RingtonePlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: any = null;

  start(type: 'incoming' | 'outgoing' = 'incoming') {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = () => {
        if (!this.audioContext || !this.isPlaying) return;
        
        const now = this.audioContext.currentTime;

        if (type === 'incoming') {
          // Melodic sequence for incoming modern ringtone
          const notes = [
            { freq: 659.25, time: 0 },   // E5
            { freq: 880.00, time: 0.15 },// A5
            { freq: 1108.73, time: 0.3 },// C#6
            { freq: 880.00, time: 0.45 },// A5
            { freq: 659.25, time: 0.6 }, // E5
            { freq: 880.00, time: 0.75 },// A5
            { freq: 1108.73, time: 0.9 },// C#6
            { freq: 1318.51, time: 1.05 } // E6
          ];
          
          notes.forEach(({ freq, time }) => {
             const osc = this.audioContext!.createOscillator();
             const nodeGain = this.audioContext!.createGain();
             osc.type = 'sine';
             osc.frequency.value = freq;
             
             osc.connect(nodeGain);
             nodeGain.connect(this.audioContext!.destination);
             
             const startTime = now + time;
             nodeGain.gain.setValueAtTime(0, startTime);
             nodeGain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
             nodeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
             
             osc.start(startTime);
             osc.stop(startTime + 0.3);
          });
        } else {
          // Standard outgoing dial tone
          const osc1 = this.audioContext.createOscillator();
          const osc2 = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc1.type = 'sine';
          osc1.frequency.value = 425;
          osc2.type = 'sine';
          osc2.frequency.value = 425;
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.audioContext.destination);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.05); // volume lower for outgoing
          gain.gain.setValueAtTime(0.15, now + 1.0);
          gain.gain.linearRampToValueAtTime(0, now + 1.2);
          
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.2);
          osc2.stop(now + 1.2);
        }
      };

      // Ensure Context is resumed (browser autoplay policy)
      this.audioContext.resume().then(() => {
        playTone();
        this.intervalId = setInterval(playTone, 2500); // Repeat every 2.5 seconds
      });
    } catch (e) {
      console.warn('AudioContext not supported or blocked', e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

export function makeDistortionCurve(amount: number) {
  let k = amount,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for (; i < n_samples; ++i) {
    x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export function applyAudioFilter(audioContext: AudioContext, source: MediaStreamAudioSourceNode, filterType: string): MediaStreamAudioDestinationNode {
  const dest = audioContext.createMediaStreamDestination();

  if (filterType === 'none') {
    source.connect(dest);
  } else if (filterType === 'robot') {
    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 50;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0; 
    
    source.connect(gainNode);
    osc.connect(gainNode.gain);
    gainNode.connect(dest);
    osc.start();
  } else if (filterType === 'echo') {
    const delay = audioContext.createDelay();
    delay.delayTime.value = 0.3;
    
    const feedback = audioContext.createGain();
    feedback.gain.value = 0.4;
    
    source.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(dest);
    
    source.connect(dest);
  } else if (filterType === 'radio') {
    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;

    const lp = audioContext.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;

    const dist = audioContext.createWaveShaper();
    dist.curve = makeDistortionCurve(50);
    
    const gain = audioContext.createGain();
    gain.gain.value = 1.5;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(dist);
    dist.connect(gain);
    gain.connect(dest);
  } else {
    source.connect(dest);
  }
  
  return dest;
}

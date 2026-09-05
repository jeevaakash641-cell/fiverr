/**
 * Voice Emotion Analyzer
 * Analyzes voice input to detect emotion and confidence level
 * Uses audio feature extraction (pitch, energy, tempo) to determine emotional state
 */

import Meyda from 'meyda';

export const EMOTIONS = {
  STRESSED: 'Stressed',
  CONFUSED: 'Confused',
  NEUTRAL: 'Neutral',
  CONFIDENT: 'Confident'
};

export class VoiceEmotionAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analyzer = null;
    this.mediaStream = null;
    this.features = [];
    this.isAnalyzing = false;
  }

  /**
   * Start analyzing audio from microphone
   */
  async startAnalysis() {
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create analyzer
      this.analyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: source,
        bufferSize: 512,
        featureExtractors: ['rms', 'zcr', 'spectralCentroid', 'energy'],
        callback: (features) => {
          if (this.isAnalyzing) {
            this.features.push(features);
          }
        }
      });

      this.analyzer.start();
      this.isAnalyzing = true;
      
      console.log('🎤 Voice emotion analysis started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start voice analysis:', error);
      return false;
    }
  }

  /**
   * Stop analyzing and return results
   */
  stopAnalysis() {
    this.isAnalyzing = false;
    
    if (this.analyzer) {
      this.analyzer.stop();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }

    const result = this.analyzeFeatures();
    this.features = []; // Reset for next analysis
    
    console.log('🎤 Voice emotion analysis stopped:', result);
    return result;
  }

  /**
   * Analyze collected features to determine emotion and confidence
   */
  analyzeFeatures() {
    if (this.features.length === 0) {
      return {
        emotion: EMOTIONS.NEUTRAL,
        confidence: 50,
        metrics: {
          avgEnergy: 0,
          avgPitch: 0,
          stability: 0,
          hesitation: 0
        }
      };
    }

    // Calculate average metrics
    const avgEnergy = this.calculateAverage(this.features.map(f => f.rms || 0));
    const avgZCR = this.calculateAverage(this.features.map(f => f.zcr || 0));
    const avgSpectralCentroid = this.calculateAverage(this.features.map(f => f.spectralCentroid || 0));
    const energyVariance = this.calculateVariance(this.features.map(f => f.rms || 0));

    // Detect emotion based on audio features
    const emotion = this.detectEmotion(avgEnergy, avgZCR, avgSpectralCentroid, energyVariance);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(avgEnergy, energyVariance, avgZCR);

    return {
      emotion,
      confidence: Math.round(confidence),
      metrics: {
        avgEnergy: avgEnergy.toFixed(4),
        avgPitch: avgSpectralCentroid.toFixed(2),
        stability: (100 - energyVariance * 100).toFixed(1),
        hesitation: this.detectHesitation(this.features)
      }
    };
  }

  /**
   * Detect emotion from audio features
   */
  detectEmotion(energy, zcr, spectralCentroid, variance) {
    // High energy + high variance + high pitch = Stressed
    if (energy > 0.15 && variance > 0.02 && spectralCentroid > 2000) {
      return EMOTIONS.STRESSED;
    }
    
    // Low energy + high variance + moderate pitch = Confused
    if (energy < 0.1 && variance > 0.015 && spectralCentroid > 1500 && spectralCentroid < 2500) {
      return EMOTIONS.CONFUSED;
    }
    
    // High energy + low variance + high pitch = Confident
    if (energy > 0.12 && variance < 0.015 && spectralCentroid > 1800) {
      return EMOTIONS.CONFIDENT;
    }
    
    // Default to neutral
    return EMOTIONS.NEUTRAL;
  }

  /**
   * Calculate confidence score (0-100)
   */
  calculateConfidence(energy, variance, zcr) {
    let score = 50; // Base score

    // Energy contribution (0-30 points)
    // Higher energy = more confident
    if (energy > 0.15) {
      score += 30;
    } else if (energy > 0.1) {
      score += 20;
    } else if (energy > 0.05) {
      score += 10;
    }

    // Stability contribution (0-30 points)
    // Lower variance = more stable = more confident
    if (variance < 0.01) {
      score += 30;
    } else if (variance < 0.02) {
      score += 20;
    } else if (variance < 0.03) {
      score += 10;
    }

    // Speech rate contribution (0-20 points)
    // Moderate ZCR = clear speech = more confident
    if (zcr > 0.05 && zcr < 0.15) {
      score += 20;
    } else if (zcr > 0.03 && zcr < 0.2) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Detect hesitation (pauses and breaks)
   */
  detectHesitation(features) {
    let silenceCount = 0;
    const threshold = 0.02;

    for (let i = 0; i < features.length; i++) {
      if ((features[i].rms || 0) < threshold) {
        silenceCount++;
      }
    }

    const hesitationRate = (silenceCount / features.length) * 100;
    return Math.round(hesitationRate);
  }

  /**
   * Calculate average of array
   */
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate variance of array
   */
  calculateVariance(arr) {
    if (arr.length === 0) return 0;
    const avg = this.calculateAverage(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return this.calculateAverage(squareDiffs);
  }

  /**
   * Check if browser supports audio analysis
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && 
              (window.AudioContext || window.webkitAudioContext));
  }
}

/**
 * Get AI response adaptation based on emotion and confidence
 */
export function getResponseAdaptation(emotion, confidence) {
  const adaptations = {
    [EMOTIONS.STRESSED]: {
      tone: 'gentle and encouraging',
      style: 'simplified with reassurance',
      instruction: 'Use simple language, break down into very small steps, add encouraging phrases like "Don\'t worry, let\'s take this slowly" and "You\'re doing great"'
    },
    [EMOTIONS.CONFUSED]: {
      tone: 'patient and clear',
      style: 'step-by-step with examples',
      instruction: 'Break explanation into numbered steps, provide concrete examples for each step, use analogies from daily life'
    },
    [EMOTIONS.NEUTRAL]: {
      tone: 'friendly and informative',
      style: 'balanced explanation',
      instruction: 'Provide clear explanation with examples, maintain engaging tone'
    },
    [EMOTIONS.CONFIDENT]: {
      tone: 'challenging and engaging',
      style: 'advanced with deeper insights',
      instruction: 'Provide advanced explanation, add challenge questions, encourage deeper thinking with "Can you think why..." questions'
    }
  };

  const baseAdaptation = adaptations[emotion] || adaptations[EMOTIONS.NEUTRAL];

  // Adjust based on confidence level
  if (confidence < 40) {
    return {
      ...baseAdaptation,
      additionalNote: 'Student seems uncertain. Add extra encouragement and simplify further. Use phrases like "It\'s okay to take your time" and "Let\'s break this down together"'
    };
  } else if (confidence > 70) {
    return {
      ...baseAdaptation,
      additionalNote: 'Student seems confident. You can provide more advanced content and challenge questions.'
    };
  }

  return baseAdaptation;
}

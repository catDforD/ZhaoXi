import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { useAppStore } from '@/stores/appStore';
import type { MoodType } from '@/types';

const moods: { type: MoodType; emoji: string; label: string }[] = [
  { type: 'happy', emoji: '😊', label: '开心' },
  { type: 'calm', emoji: '😌', label: '平静' },
  { type: 'tired', emoji: '😴', label: '疲惫' },
  { type: 'excited', emoji: '🤩', label: '兴奋' },
  { type: 'sad', emoji: '😢', label: '难过' },
  { type: 'numb', emoji: '😐', label: '麻木' },
];

export function MoodSelector() {
  const { currentMood, setMood } = useAppStore();
  const currentMoodData = moods.find((m) => m.type === currentMood) || moods[5];

  const handlePrev = () => {
    const currentIndex = moods.findIndex((m) => m.type === currentMood);
    const prevIndex = currentIndex === 0 ? moods.length - 1 : currentIndex - 1;
    setMood(moods[prevIndex].type);
  };

  const handleNext = () => {
    const currentIndex = moods.findIndex((m) => m.type === currentMood);
    const nextIndex = currentIndex === moods.length - 1 ? 0 : currentIndex + 1;
    setMood(moods[nextIndex].type);
  };

  return (
    <GlassCard className="p-5">
      <div className="text-center mb-4">
        <span className="text-sm text-white/50">今日心情</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>

        <div className="text-center">
          <div className="text-5xl mb-2">{currentMoodData.emoji}</div>
          <div className="text-sm text-white/70">{currentMoodData.label}</div>
        </div>

        <button
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white/50" />
        </button>
      </div>
    </GlassCard>
  );
}

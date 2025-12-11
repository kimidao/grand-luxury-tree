import { useEffect, useRef } from 'react';
import { useStore } from './store';

export const AudioController = ({ started }: { started: boolean }) => {
  const isChaos = useStore(s => s.isChaos);
  
  // 音频资源 (使用在线 CDN 链接，你也可以换成 public 文件夹下的本地文件)
  const bgmRef = useRef(new Audio("https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=christmas-piano-126838.mp3")); 
  const unleashRef = useRef(new Audio("https://cdn.pixabay.com/download/audio/2022/03/24/audio_06f1c42f36.mp3?filename=magic-spell-6005.mp3")); 
  const formRef = useRef(new Audio("https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=whoosh-6316.mp3"));

  // 1. 初始化 BGM
  useEffect(() => {
    const bgm = bgmRef.current;
    bgm.loop = true;
    bgm.volume = 0.4; // 背景乐声音小一点

    if (started) {
      bgm.play().catch(e => console.log("Audio autoplay blocked", e));
    } else {
      bgm.pause();
    }
  }, [started]);

  // 2. 监听状态播放音效
  useEffect(() => {
    if (!started) return;

    if (isChaos) {
      // 散开：播放魔法音效
      unleashRef.current.currentTime = 0;
      unleashRef.current.volume = 0.6;
      unleashRef.current.play();
    } else {
      // 聚合：播放风声/吸附声
      formRef.current.currentTime = 0;
      formRef.current.volume = 0.5;
      formRef.current.play();
    }
  }, [isChaos, started]);

  return null;
};
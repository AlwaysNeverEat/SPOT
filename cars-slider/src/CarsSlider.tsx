import { useEffect, useRef, useState, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, Check, ArrowRight } from 'lucide-react';
import { cars } from './cars';

const GREEN = 'var(--green, #1f9d3f)';
const INK = 'var(--ink, #1a1a1a)';
const MUTED = 'var(--muted, #6b6b6b)';
const LINE = 'var(--line, #e7e7e3)';
const DURATION = 4000; // ms per card

const N = cars.length;
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const slideVariants = reduceMotion
  ? {
      enter: { opacity: 0, x: 0, rotateY: 0, scale: 1 },
      center: { opacity: 1, x: 0, rotateY: 0, scale: 1, transition: { duration: 0.25 } },
      exit: { opacity: 0, x: 0, rotateY: 0, scale: 1, transition: { duration: 0.2 } },
    }
  : {
      enter: (dir: number) => ({
        x: dir > 0 ? 600 : -600,
        rotateY: dir > 0 ? 40 : -40,
        opacity: 0,
        scale: 0.8,
      }),
      center: {
        x: 0,
        rotateY: 0,
        opacity: 1,
        scale: 1,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
      },
      exit: (dir: number) => ({
        x: dir > 0 ? -600 : 600,
        rotateY: dir > 0 ? -40 : 40,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
      }),
    };

export function CarsSlider() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [wide, setWide] = useState(typeof window === 'undefined' ? true : window.innerWidth >= 640);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const paused = !playing || hover;

  const go = (dir: number) => {
    setDirection(dir);
    setIndex((i) => (i + dir + N) % N);
    progressRef.current = 0;
    setProgress(0);
  };
  const goTo = (i: number) => {
    if (i === index) return;
    setDirection(i > index ? 1 : -1);
    setIndex(((i % N) + N) % N);
    progressRef.current = 0;
    setProgress(0);
  };

  // autoplay — the green bar fills, then advances; pauses on hover / pause button / hidden tab
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;
      if (!document.hidden) {
        progressRef.current += dt / DURATION;
        if (progressRef.current >= 1) {
          progressRef.current = 0;
          setDirection(1);
          setIndex((i) => (i + 1) % N);
        }
        setProgress(progressRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const car = cars[index];

  return (
    <div
      style={styles.wrap}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.stage}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragSnapToOrigin
            onDragEnd={(_e, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            style={{ transformStyle: 'preserve-3d', cursor: 'grab', width: 'min(420px, calc(100vw - 90px))' }}
          >
            <div style={styles.card}>
              <div style={styles.imgWrap}>
                <img src={car.image} alt={car.name} style={styles.img} draggable={false} />
                <div style={styles.imgShade} />
              </div>

              <div style={styles.body}>
                <h3 style={styles.title}>{car.name}</h3>

                <div style={styles.specs}>
                  <div style={styles.volRow}>
                    <span style={{ color: MUTED }}>Объём масла</span>
                    <b style={{ color: INK }}>{car.volume}</b>
                  </div>
                  <div style={styles.incRow}>
                    <Check size={16} strokeWidth={3} style={{ color: GREEN, flex: '0 0 auto', marginTop: 2 }} />
                    <span>Масло {car.oil}</span>
                  </div>
                  <div style={styles.incRow}>
                    <Check size={16} strokeWidth={3} style={{ color: GREEN, flex: '0 0 auto', marginTop: 2 }} />
                    <span>Фильтр {car.filter}</span>
                  </div>
                </div>

                <div style={styles.foot}>
                  <div>
                    <p style={styles.priceLabel}>Цена «под ключ»</p>
                    <p style={styles.price}>{car.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <motion.button
                    type="button"
                    data-open-booking
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={styles.cta}
                  >
                    Выбрать
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.min(progress, 1) * 100}%` }} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {wide && (
          <>
            <button type="button" aria-label="Назад" onClick={() => go(-1)} style={{ ...styles.arrow, left: 0 }}>
              <ChevronLeft size={26} style={{ color: INK }} />
            </button>
            <button type="button" aria-label="Вперёд" onClick={() => go(1)} style={{ ...styles.arrow, right: 0 }}>
              <ChevronRight size={26} style={{ color: INK }} />
            </button>
          </>
        )}
      </div>

      <div style={styles.controls}>
        <button
          type="button"
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
          onClick={() => setPlaying((p) => !p)}
          style={styles.playBtn}
        >
          {playing ? <Pause size={18} style={{ color: INK }} /> : <Play size={18} style={{ color: INK, marginLeft: 2 }} />}
        </button>

        <div style={styles.dots}>
          {cars.map((_, i) => (
            <button
              key={i}
              aria-label={`Слайд ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                ...styles.dot,
                width: i === index ? 26 : 8,
                background: i === index ? GREEN : '#cdd2cc',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'inherit',
  },
  stage: {
    position: 'relative',
    width: '100%',
    maxWidth: 1080,
    margin: '0 auto',
    minHeight: 'clamp(470px, 86vw, 560px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    perspective: '1500px',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 30px 60px -15px rgba(13,13,13,0.30)',
    position: 'relative',
    textAlign: 'left',
  },
  imgWrap: { position: 'relative', width: '100%', aspectRatio: '7 / 4', overflow: 'hidden', background: 'var(--bg-soft, #f3f4f1)' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgShade: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)' },
  body: { padding: '1.8rem 1.8rem 2rem' },
  title: { fontSize: '1.45rem', fontWeight: 700, color: INK, margin: '0 0 1rem' },
  specs: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.4rem' },
  volRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    fontSize: '0.92rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${LINE}`,
  },
  incRow: { display: 'flex', gap: '0.5rem', fontSize: '0.88rem', lineHeight: 1.35, color: INK },
  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  priceLabel: { fontSize: '0.78rem', color: MUTED, margin: '0 0 0.2rem' },
  price: { fontSize: '1.9rem', fontWeight: 800, color: INK, margin: 0, whiteSpace: 'nowrap' },
  cta: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: GREEN, color: '#fff', border: 'none',
    padding: '0.75rem 1.4rem', borderRadius: 100, fontSize: '0.95rem', fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 8px 20px rgba(31,157,63,0.35)', whiteSpace: 'nowrap',
  },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(13,13,13,0.10)' },
  progressFill: { height: '100%', background: GREEN },
  arrow: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 5,
    width: 54, height: 54, borderRadius: '50%', background: '#fff', border: `1px solid ${LINE}`,
    boxShadow: '0 10px 30px rgba(13,13,13,0.15)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  controls: { display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '1.6rem', flexWrap: 'wrap', justifyContent: 'center' },
  playBtn: {
    width: 40, height: 40, borderRadius: '50%', background: '#fff', border: `1px solid ${LINE}`,
    boxShadow: '0 6px 16px rgba(13,13,13,0.12)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
  },
  dots: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 },
  dot: { height: 8, borderRadius: 100, border: 'none', padding: 0, cursor: 'pointer', transition: 'all .3s ease' },
};

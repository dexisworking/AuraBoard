import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import GradientBackground from './GradientBackground';

const TRANSITION_MS = 1500;
/** Hard ceiling on how long a single video slide holds the screen. */
const VIDEO_MAX_MS = 15_000;

/** toMediaUrl keeps the real extension on the URL, so a suffix test is enough. */
function isVideoSrc(src) {
  return typeof src === 'string' && /\.(mp4|m4v|webm|mov)$/i.test(src);
}
const KEN_BURNS_VARIANTS = [
  'auraboard-pan-right',
  'auraboard-pan-left',
  'auraboard-pan-up',
  'auraboard-pan-down',
];

function pickNextIndex(images, currentIndex, shuffle) {
  if (images.length <= 1) {
    return currentIndex;
  }

  if (!shuffle) {
    return (currentIndex + 1) % images.length;
  }

  let candidate = currentIndex;
  while (candidate === currentIndex) {
    candidate = Math.floor(Math.random() * images.length);
  }
  return candidate;
}

function pickKenBurnsVariant() {
  return KEN_BURNS_VARIANTS[Math.floor(Math.random() * KEN_BURNS_VARIANTS.length)];
}

function createInitialState(images, shuffle) {
  return {
    currentIndex: 0,
    nextIndex: pickNextIndex(images, 0, shuffle),
    incomingIndex: null,
    isTransitioning: false,
    currentAnimation: pickKenBurnsVariant(),
    incomingAnimation: pickKenBurnsVariant(),
    currentKey: 0,
    incomingKey: 0,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return createInitialState(action.images, action.shuffle);
    case 'start-transition':
      return {
        ...state,
        incomingIndex: action.nextIndex,
        incomingAnimation: pickKenBurnsVariant(),
        incomingKey: state.incomingKey + 1,
        isTransitioning: true,
      };
    case 'complete-transition':
      return {
        ...state,
        currentIndex: action.nextIndex,
        nextIndex: pickNextIndex(action.images, action.nextIndex, action.shuffle),
        incomingIndex: null,
        isTransitioning: false,
        currentAnimation: pickKenBurnsVariant(),
        currentKey: state.currentKey + 1,
      };
    default:
      return state;
  }
}

function preloadImage(src) {
  if (!src || typeof window === 'undefined' || isVideoSrc(src)) {
    return;
  }

  const image = new window.Image();
  image.src = src;
}

/**
 * One slide layer — <img> or a muted <video>.
 *
 * Muting is done in the ref, not with props. React's `muted` prop sets the DOM
 * *property* but never the *attribute*, and `defaultMuted` is not a recognised
 * React prop at all (it warns and is dropped). Since autoplay policy keys off
 * the attribute, both have to be set by hand — an unmuted slideshow would blast
 * sound over a screensaver, and would also get its autoplay blocked.
 *
 * play() is called explicitly too: muted autoplay is normally permitted, but
 * relying on it silently leaves a frozen first frame wherever it isn't.
 */
function SlideMedia({ src, animation, durationS, onVideoDuration }) {
  const setupVideo = useCallback((el) => {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute('muted', '');
    el.volume = 0;
    const played = el.play();
    if (played?.catch) played.catch(() => { /* first frame stays up */ });
  }, []);

  const style = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: 'center center',
    // Video carries its own motion; a Ken Burns pan on top reads as a wobble.
    animation: animation ? `${animation} ${durationS}s linear forwards` : undefined,
    willChange: 'transform, opacity',
    userSelect: 'none',
  };

  if (isVideoSrc(src)) {
    return (
      <video
        ref={setupVideo}
        src={src}
        muted
        autoPlay
        playsInline
        controls={false}
        disablePictureInPicture
        preload="auto"
        onLoadedMetadata={(e) => {
          const seconds = e.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) onVideoDuration?.(seconds * 1000);
        }}
        style={style}
      />
    );
  }

  return <img src={src} alt="" draggable="false" style={style} />;
}

export default function SlideshowBackground({
  images = [],
  interval = 60,
  transition = 'fade',
  shuffle = false,
  treatment = 'mono',
  duotoneRamp = null,
}) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [state, dispatch] = useReducer(reducer, safeImages, (initialImages) =>
    createInitialState(initialImages, shuffle),
  );
  const transitionTimeoutRef = useRef(null);
  const [videoDurationMs, setVideoDurationMs] = useState(null);
  const currentIndex = safeImages.length ? state.currentIndex % safeImages.length : 0;
  const nextIndex = safeImages.length ? state.nextIndex % safeImages.length : 0;

  useEffect(() => {
    dispatch({ type: 'reset', images: safeImages, shuffle });
  }, [safeImages, shuffle]);

  useEffect(() => {
    if (!safeImages.length) {
      return;
    }

    preloadImage(safeImages[nextIndex]);
  }, [nextIndex, safeImages]);

  /* How long the CURRENT slide holds the screen. Images use the configured
     interval; videos use their own length capped at 15s, so a short clip does
     not sit frozen on its last frame for the rest of a long interval. The real
     length only arrives with loadedmetadata, so we start at the cap and shorten
     once it is known. */
  const currentIsVideo = isVideoSrc(safeImages[currentIndex]);
  const dwellMs = currentIsVideo
    ? Math.min(VIDEO_MAX_MS, videoDurationMs ?? VIDEO_MAX_MS)
    : Math.max(1, interval) * 1000;

  // A new slide invalidates the previous clip's measured duration.
  useEffect(() => {
    setVideoDurationMs(null);
  }, [currentIndex]);

  useEffect(() => {
    if (safeImages.length <= 1 || state.isTransitioning) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'start-transition', nextIndex });

      transitionTimeoutRef.current = window.setTimeout(() => {
        dispatch({
          type: 'complete-transition',
          nextIndex,
          images: safeImages,
          shuffle,
        });
      }, TRANSITION_MS);
    }, dwellMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dwellMs, nextIndex, safeImages, shuffle, state.isTransitioning]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  if (!safeImages.length) {
    return <GradientBackground />;
  }

  const currentImage = safeImages[currentIndex];
  const incomingImage = state.incomingIndex !== null ? safeImages[state.incomingIndex % safeImages.length] : null;
  const incomingStyle =
    transition === 'slide'
      ? {
          transform: state.isTransitioning ? 'translate3d(0, 0, 0)' : 'translate3d(5%, 0, 0)',
        }
      : transition === 'zoom'
        ? {
            transform: state.isTransitioning ? 'scale(1)' : 'scale(1.06)',
          }
        : {
            transform: 'translate3d(0, 0, 0)',
          };

  return (
    <>
      <style>{`
        @keyframes auraboard-pan-right {
          from { transform: scale(1) translate3d(0, 0, 0); }
          to { transform: scale(1.08) translate3d(1.1%, 0, 0); }
        }

        @keyframes auraboard-pan-left {
          from { transform: scale(1) translate3d(0, 0, 0); }
          to { transform: scale(1.08) translate3d(-1.1%, 0, 0); }
        }

        @keyframes auraboard-pan-up {
          from { transform: scale(1) translate3d(0, 0, 0); }
          to { transform: scale(1.08) translate3d(0, -1.1%, 0); }
        }

        @keyframes auraboard-pan-down {
          from { transform: scale(1) translate3d(0, 0, 0); }
          to { transform: scale(1.08) translate3d(0, 1.1%, 0); }
        }
      `}</style>

      {/* Duotone ramp: luminance → (theme ground → accent). Defined inline so it
          re-renders when the theme changes. */}
      {treatment === 'duotone' && duotoneRamp && (
        <svg
          aria-hidden="true"
          width="0"
          height="0"
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          <filter id="ab-photo-duotone" colorInterpolationFilters="sRGB">
            {/* collapse to luminance, then map that ramp onto two brand colours */}
            <feColorMatrix
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={duotoneRamp.r} />
              <feFuncG type="table" tableValues={duotoneRamp.g} />
              <feFuncB type="table" tableValues={duotoneRamp.b} />
            </feComponentTransfer>
          </filter>
        </svg>
      )}

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: 'var(--ab-bg, #0A0A0A)',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            // Swiss/Brutalist photo treatment. Applied to the container so both
            // crossfading images and the Ken Burns transforms inherit it.
            //  duotone — contrast-boost, then map luminance onto ground→accent
            //  none    — leave the photograph alone
            //  mono    — the token's high-contrast greyscale (default)
            filter: treatment === 'duotone'
              // trailing brightness keeps contrast headroom for white type,
              // matching the legibility floor the mono treatment holds
              ? 'contrast(1.2) url(#ab-photo-duotone) brightness(0.78)'
              : treatment === 'none'
                ? 'none'
                : 'var(--ab-photo-filter, none)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-1vh',
              left: '-1vw',
              width: '102vw',
              height: '102vh',
            }}
          >
            <SlideMedia
              key={`current-${state.currentKey}-${currentIndex}`}
              src={currentImage}
              animation={currentIsVideo ? null : state.currentAnimation}
              durationS={Math.max(2, interval)}
              onVideoDuration={setVideoDurationMs}
            />
          </div>

          {incomingImage && (
            <div
              style={{
                position: 'absolute',
                top: '-1vh',
                left: '-1vw',
                width: '102vw',
                height: '102vh',
                opacity: state.isTransitioning ? 1 : 0,
                transition: `opacity ${TRANSITION_MS}ms ease-in-out, transform ${TRANSITION_MS}ms ease-in-out`,
                willChange: 'opacity, transform',
                ...incomingStyle,
              }}
            >
              <SlideMedia
                key={`incoming-${state.incomingKey}-${state.incomingIndex}`}
                src={incomingImage}
                animation={isVideoSrc(incomingImage) ? null : state.incomingAnimation}
                durationS={Math.max(2, interval)}
              />
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            // Full-cover scrim (was a top-edge gradient): with the board now
            // chromeless, text can sit anywhere, so the legibility floor must
            // hold everywhere. Measured with photoFilter in the DS-1 gate.
            background: 'var(--ab-scrim, rgba(0, 0, 0, 0.42))',
            pointerEvents: 'none',
          }}
        />
      </div>
    </>
  );
}

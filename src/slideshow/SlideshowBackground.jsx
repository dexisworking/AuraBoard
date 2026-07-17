import { useEffect, useMemo, useReducer, useRef } from 'react';
import GradientBackground from './GradientBackground';

const TRANSITION_MS = 1500;
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
  if (!src || typeof window === 'undefined') {
    return;
  }

  const image = new window.Image();
  image.src = src;
}

export default function SlideshowBackground({
  images = [],
  interval = 60,
  transition = 'fade',
  shuffle = false,
}) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [state, dispatch] = useReducer(reducer, safeImages, (initialImages) =>
    createInitialState(initialImages, shuffle),
  );
  const transitionTimeoutRef = useRef(null);
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
    }, Math.max(1, interval) * 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [interval, nextIndex, safeImages, shuffle, state.isTransitioning]);

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
            // Swiss/Brutalist photo treatment: any user photo is driven to
            // high-contrast monochrome so type and the signal colour always
            // win. Applied to the container so both crossfading images and the
            // Ken Burns transforms inherit it.
            filter: 'var(--ab-photo-filter, none)',
          }}
        >
          <img
            key={`current-${state.currentKey}-${currentIndex}`}
            src={currentImage}
            alt=""
            draggable="false"
            style={{
              position: 'absolute',
              top: '-1vh',
              left: '-1vw',
              width: '102vw',
              height: '102vh',
              objectFit: 'cover',
              transformOrigin: 'center center',
              animation: `${state.currentAnimation} ${Math.max(2, interval)}s linear forwards`,
              willChange: 'transform, opacity',
              userSelect: 'none',
            }}
          />

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
              <img
                key={`incoming-${state.incomingKey}-${state.incomingIndex}`}
                src={incomingImage}
                alt=""
                draggable="false"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transformOrigin: 'center center',
                  animation: `${state.incomingAnimation} ${Math.max(2, interval)}s linear forwards`,
                  willChange: 'transform',
                  userSelect: 'none',
                }}
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

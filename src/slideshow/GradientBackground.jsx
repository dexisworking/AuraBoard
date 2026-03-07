export default function GradientBackground() {
  return (
    <>
      <style>{`
        @keyframes auraboard-gradient-drift {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 0.72;
          }
          33% {
            transform: scale(1.08) rotate(8deg);
            opacity: 0.9;
          }
          66% {
            transform: scale(1.02) rotate(-6deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.72;
          }
        }

        @keyframes auraboard-gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
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
          background:
            'radial-gradient(circle at 20% 20%, rgba(14, 58, 74, 0.55), transparent 38%), radial-gradient(circle at 78% 24%, rgba(8, 36, 58, 0.6), transparent 34%), radial-gradient(circle at 30% 78%, rgba(12, 54, 63, 0.42), transparent 36%), linear-gradient(135deg, #02050a 0%, #07131d 42%, #031017 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-18%',
            background:
              'linear-gradient(120deg, rgba(3, 20, 31, 0.85), rgba(7, 41, 54, 0.52), rgba(0, 0, 0, 0.9), rgba(10, 46, 63, 0.48))',
            backgroundSize: '180% 180%',
            filter: 'blur(32px)',
            animation: 'auraboard-gradient-shift 48s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-16%',
            left: '-12%',
            width: '56vw',
            height: '56vw',
            minWidth: '420px',
            minHeight: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 89, 106, 0.38), rgba(14, 89, 106, 0) 68%)',
            filter: 'blur(18px)',
            animation: 'auraboard-gradient-drift 42s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-10%',
            bottom: '-14%',
            width: '52vw',
            height: '52vw',
            minWidth: '380px',
            minHeight: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(10, 52, 74, 0.42), rgba(10, 52, 74, 0) 70%)',
            filter: 'blur(26px)',
            animation: 'auraboard-gradient-drift 56s ease-in-out infinite reverse',
          }}
        />
      </div>
    </>
  );
}

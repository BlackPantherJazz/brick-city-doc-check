// The shop sign: a black acrylic board hanging on the brick wall, with
// glass-tube lettering that cycles color like a storefront "OPEN" sign.
//
// How the "tube" look works (all CSS, see .sign in styles.css):
//   - the letters' color is animated through a loop of neon colors
//   - their glow (text-shadow) uses currentColor, so it changes with them
//   - the board's glow on the bricks also uses currentColor
//   - the border is an SVG rectangle whose dashes "chase" around it
// One letter is a "tired tube" that buzzes off and on now and then.
//
// size="big"   home screen, hanging from chains
// size="small" in the top bar on the other screens

export default function NeonSign({ size = 'big', onClick, label }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`sign sign-${size}`} onClick={onClick} aria-label={label} role={onClick ? undefined : 'img'}>
      {size === 'big' && <span className="chains" aria-hidden="true" />}
      <span className="board" aria-hidden="true">
        {/* pathLength=100 lets the dash pattern be written in percent of the border */}
        <svg className="frame" preserveAspectRatio="none">
          <rect width="100%" height="100%" rx="10" pathLength="100" />
        </svg>
        <span className="script">Brick City</span>
        <span className="block">
          DOC CH<span className="tired">E</span>CK
        </span>
      </span>
    </Tag>
  );
}

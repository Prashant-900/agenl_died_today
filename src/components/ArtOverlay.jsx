import './ArtOverlay.css'

/*
  STRUCTURE:
  .art-frame  (outer boundary, 40% margin-right, full height)
    ├── .art-l-bl     bottom-left L  → 3 boxes positioned absolute
    ├── .art-l-tr     top-right Γ    → 3 boxes positioned absolute
    └── .art-inner    inner container (padded 60px = box size, scrollable)
          └── .art-cards-scroll   vertical scroll container
                └── .art-card (multiple cards)
*/

const ARTWORKS = [
  {
    title: 'The Canvas',
    description: 'A moment captured in brushstrokes — the artist paints in solitude, lost in creation.',
    medium: 'Digital',
    artist: 'Prashant'
  },
  {
    title: 'Midnight Dreams',
    description: 'Abstract visions from the depths of night, where colors dance in the darkness.',
    medium: 'Mixed Media',
    artist: 'Prashant'
  },
  {
    title: 'Urban Echoes',
    description: 'The city speaks through lines and shadows, telling stories of countless souls.',
    medium: 'Digital',
    artist: 'Prashant'
  },
  {
    title: 'Serenity',
    description: 'A peaceful moment frozen in time, where tranquility meets artistic expression.',
    medium: 'Watercolor',
    artist: 'Prashant'
  },
  {
    title: 'Fragments',
    description: 'Pieces of memory and imagination collide to form something entirely new.',
    medium: 'Collage',
    artist: 'Prashant'
  }
]

export default function ArtOverlay({ visible, imageSrc }) {
  if (!visible) return null

  return (
    <div className="art-overlay">
      <div className="art-frame">

        {/* ── BOTTOM-LEFT L shape ──
            row-top:  [box-a]               ← vertical bar top
            row-foot: [box-b][box-c]        ← vertical bottom + foot right
        */}
        <div className="art-l-bl">
          <div className="row-top">
            <div className="art-box box-a" />
          </div>
          <div className="row-foot">
            <div className="art-box box-b" />
            <div className="art-box box-c" />
          </div>
        </div>

        {/* ── TOP-RIGHT Γ shape (mirror of L) ──
            row-head: [box-d][box-e]        ← head left + vertical bar top
            row-bot:          [box-f]       ← vertical bar bottom (right-aligned)
        */}
        <div className="art-l-tr">
          <div className="row-head">
            <div className="art-box box-d" />
            <div className="art-box box-e" />
          </div>
          <div className="row-bot">
            <div className="art-box box-f" />
          </div>
        </div>

        {/* ── INNER CONTAINER — scrollable cards live here, clear of L-shapes ── */}
        <div className="art-inner">
          <div className="art-cards-scroll">
            {ARTWORKS.map((artwork, index) => (
              <div key={index} className="art-card" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Image */}
                {imageSrc
                  ? <img className="art-card-image" src={imageSrc} alt={artwork.title} />
                  : <div className="art-card-image" />
                }

                {/* Text — white + black outline, transparent bg */}
                <div className="art-card-body">
                  <h2 className="art-card-title">{artwork.title}</h2>
                  <p className="art-card-desc">{artwork.description}</p>
                  <div className="art-card-meta">
                    <span>Medium: {artwork.medium}</span>
                    <span>Artist: {artwork.artist}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
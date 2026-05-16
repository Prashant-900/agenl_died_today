import './ProjectsOverlay.css'

const PROJECTS_DATA = [
  { name: 'phobos', description: 'The standard library of the D programming language', github: 'https://github.com/Prashant-900/phobos', website: 'https://dlang.org', language: 'D' },
  { name: 'SOME_PROBLEMS', description: 'need commits :)', github: 'https://github.com/Prashant-900/SOME_PROBLEMS', language: 'C++' },
  { name: 'C_PRODUCER_CONSUMER_MODEL', description: 'jsut some c code', github: 'https://github.com/Prashant-900/C_PRODUCER_CONSUMER_MODEL', language: 'C' },
  { name: 'YARA-ALL-THE-WAY', description: 'fun begins here', github: 'https://github.com/Prashant-900/YARA-ALL-THE-WAY' },
  { name: 'Prashant-900', description: "Yo!! you are looking at PRASHANT's profile so be gentle :)", github: 'https://github.com/Prashant-900/Prashant-900' },
]

export default function ProjectsOverlay({ visible }) {
  if (!visible) return null
  return (
    <div className="projects-overlay">
      <div className="projects-container">
        <div className="projects-scroll">
          {PROJECTS_DATA.map((project, i) => (
            <a
              key={i}
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="project-card"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="project-card-top">
                <span className="project-icon">📁</span>
                <span className="project-name">{project.name}</span>
              </div>
              <p className="project-desc">{project.description}</p>
              <div className="project-card-bottom">
                {project.language && <span className="project-lang">{project.language}</span>}
                {project.website && <span className="project-website">{project.website}</span>}
                <span className="project-arrow">→</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

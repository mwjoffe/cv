import Arcade from "./game/Arcade";
import { currentCommitments, experience, selectedWork } from "./resume";
const roles = [...currentCommitments, ...experience];
export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#resume">
        Skip game and read résumé
      </a>
      <header className="site-header">
        <a href="#" className="wordmark" aria-label="Michael Joffe home">
          <span className="mj-mark">MJ</span>
          <span>
            MICHAEL
            <br />
            JOFFE
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#arcade" className="nav-play">
            Play
          </a>
          <a href="#resume">Experience</a>
          <a
            href="https://www.linkedin.com/in/michaeljoffe"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
        </nav>
      </header>
      <section className="hero">
        <div>
          <h1 className="profile-name">Michael Joffe.</h1>
        </div>
      </section>
      <Arcade />
      <section className="resume-section" id="resume">
        <div className="resume-intro">
          <div>
            <span className="eyebrow">01 / ABOUT</span>
            <h2>About me</h2>
          </div>
          <div>
            <p className="intro-big">
              I help people adopt breakthrough technology by combining product
              thinking, behavioral science, and design.
            </p>
            <p>
              Over the past 15+ years, I’ve worked hands-on across Product,
              Engineering, Design, Research, and Marketing, shaping products
              from concept through launch and turning emerging technology into
              experiences millions of people understand and use.
            </p>
          </div>
        </div>
        <div className="resume-title">
          <h3>WORK & EXPERIENCE</h3>
        </div>
        {roles.map((role, i) => (
          <article className="role" id={`role-${i}`} key={role.role}>
            <div className="role-date">
              <span>{role.dates}</span>
              {i < 3 && (
                <small>
                  <i className="live-dot" /> CURRENT
                </small>
              )}
            </div>
            <div className="role-content">
              <span className="role-company">{role.company}</span>
              <h3>{role.role}</h3>
              <p>{role.summary}</p>
              {role.highlights.length > 0 && (
                <ul>
                  {role.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <span className="role-index">{String(i + 1).padStart(2, "0")}</span>
          </article>
        ))}
        <div className="resume-extras">
          <div>
            <span className="eyebrow">EDUCATION</span>
            <p>
              <b>MA, Media Production</b>
              <br />
              Toronto Metropolitan University
            </p>
            <p>
              <b>BA, Communication Studies</b>
              <br />
              Concordia University
            </p>
          </div>
          <div>
            <span className="eyebrow">RECOGNITION</span>
            <p>Business Insider’s 30 Most Creative People in Advertising</p>
            <p>Marketing Magazine’s 30 Under 30</p>
            <p>Cannes Lions Juror</p>
          </div>
        </div>
      </section>
      <section className="ideas-section" id="ideas">
        <div className="ideas-heading">
          <div>
            <span className="eyebrow">02 / IDEAS</span>
            <h2>Selected work</h2>
          </div>
          <p>
            A few things I’ve written,
            <br />
            researched, and shared.
          </p>
        </div>
        <div className="ideas-grid">
          {selectedWork.map((work, i) => (
            <a
              href={work.url}
              target="_blank"
              rel="noreferrer"
              className="idea"
              key={work.title}
            >
              <div className="idea-meta">
                <span>
                  {work.type} / {work.year}
                </span>
                <span>↗</span>
              </div>
              <div className={`idea-art art-${i}`} aria-hidden="true">
                {["✳", "aı", "↗", "◎"][i]}
              </div>
              <h3>{work.title}</h3>
              <p>{work.publisher}</p>
            </a>
          ))}
        </div>
      </section>
      <footer>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} MICHAEL JOFFE</span>
          <span>MARKETING BUILDER · PRODUCT MARKETING · APPLIED AI</span>
          <a
            href="https://www.linkedin.com/in/michaeljoffe"
            target="_blank"
            rel="noreferrer"
          >
            LINKEDIN ↗
          </a>
          <a href="#">BACK TO TOP ↑</a>
        </div>
      </footer>
    </main>
  );
}

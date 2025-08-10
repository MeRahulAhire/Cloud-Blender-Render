import "../style/footer.css";

export default function Footer() {
  return (
    <div className="footer-container">
      <div className="footer-glass-holder">
        <div className="footer-centered">
          <div className="ft-centered-left">
            <div className="footer-logo-heading">Cloud Blender Render</div>
            <div className="footer-madeby-credit">
              Made by{" "}
              <a
                href="https://rahulahire.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rahul Ahire
              </a>{" "}
              in Pune, India.
            </div>
          </div>
          <div className="ft-centered-right">
            {/* <div className="ft-donate-head">Be the top 0.1%</div> */}
            <a href="https://coff.ee/rahulahire" target="_blank" className="ft-donate-button">
            <p>

            Support this Project
            </p>
            </a>
          </div>
        </div>
        <div className="footer-end-contact">
          <div className="footer-email">
            Email us at{" "}
            <a href="mailto:info@rahulahire.com">info@rahulahire.com</a>
          </div>
          <div className="footer-github">
            Project is fully open source on{" "}
            <a
              href="https://github.com/MeRahulAhire/Cloud-Blender-Render"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bg-art-credit">
        Background art credit -{" "}
        <a
          href="https://www.behance.net/gallery/152184245/NZXT-keyboard-rendering-practice-by-blender"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pana Chena
        </a>
      </div>
    </div>
  );
}

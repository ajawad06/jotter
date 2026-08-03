import PropTypes from "prop-types";
import { Link } from "react-router-dom";

function AuthBrandPanel({ ctaLabel = "Try for Free", ctaTo = "/signup" }) {
  return (
    <aside className="auth-brand-panel">
      <div className="auth-brand-inner">
        <div className="auth-brand-text">
          <h2 className="auth-brand-headline">
            <span className="accent">Note</span> taking,
            <br />
            made simple
          </h2>
          <p className="auth-brand-sub">
            Jotter is the all-in-one note-taking app - capture everything that
            matters, beautifully organized.
          </p>
          <Link to={ctaTo} className="auth-brand-cta">
            {ctaLabel}
          </Link>
        </div>

        <div className="auth-brand-art" aria-hidden="true">
          <svg
            viewBox="0 0 300 250"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* checklist */}
            {/* row 1 (checked) */}
            <rect
              x="198"
              y="52"
              width="26"
              height="26"
              rx="7"
              stroke="#ef7d18"
              strokeWidth="4"
            />
            <path
              d="M204 65l5 5 9-12"
              stroke="#ef7d18"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="236"
              y1="58"
              x2="296"
              y2="58"
              stroke="#ef7d18"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="236"
              y1="73"
              x2="274"
              y2="73"
              stroke="#e7d8c4"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* row 2 (checked) */}
            <rect
              x="198"
              y="102"
              width="26"
              height="26"
              rx="7"
              stroke="#ef7d18"
              strokeWidth="4"
            />
            <path
              d="M204 115l5 5 9-12"
              stroke="#ef7d18"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="236"
              y1="108"
              x2="296"
              y2="108"
              stroke="#ef7d18"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="236"
              y1="123"
              x2="268"
              y2="123"
              stroke="#e7d8c4"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* row 3 (being ticked) */}
            <rect
              x="198"
              y="152"
              width="26"
              height="26"
              rx="7"
              stroke="#ef7d18"
              strokeWidth="4"
            />
            <line
              x1="236"
              y1="158"
              x2="296"
              y2="158"
              stroke="#e7d8c4"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="236"
              y1="173"
              x2="274"
              y2="173"
              stroke="#e7d8c4"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* person */}
            {/* ponytail */}
            <path
              d="M98 68 C62 56 60 26 86 30 C76 46 82 62 102 70 Z"
              fill="#2b2620"
            />
            <ellipse cx="74" cy="98" rx="15" ry="24" fill="#2b2620" />
            {/* body / sweater */}
            <path
              d="M58 250 C56 186 78 156 116 156 C154 156 166 190 162 250 Z"
              fill="#ef7d18"
              stroke="#2b2620"
              strokeWidth="4"
            />
            {/* neck */}
            <rect
              x="104"
              y="124"
              width="24"
              height="34"
              rx="8"
              fill="#f0c19a"
              stroke="#2b2620"
              strokeWidth="4"
            />
            {/* head */}
            <circle
              cx="114"
              cy="94"
              r="34"
              fill="#f0c19a"
              stroke="#2b2620"
              strokeWidth="4"
            />
            {/* hair cap */}
            <path
              d="M82 92 C80 56 122 46 146 70 C132 62 108 60 96 72 C89 79 85 85 82 92 Z"
              fill="#2b2620"
            />
            {/* ponytail tie */}
            <circle
              cx="80"
              cy="74"
              r="7"
              fill="#ef7d18"
              stroke="#2b2620"
              strokeWidth="3"
            />
            {/* face */}
            <circle cx="128" cy="92" r="3.5" fill="#2b2620" />
            <path
              d="M147 91 q7 5 0 10"
              stroke="#2b2620"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M132 108 q8 6 15 0"
              stroke="#2b2620"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* raised arm (sleeve) */}
            <path
              d="M152 182 C186 176 198 160 192 150"
              stroke="#2b2620"
              strokeWidth="26"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M152 182 C186 176 198 160 192 150"
              stroke="#ef7d18"
              strokeWidth="20"
              strokeLinecap="round"
              fill="none"
            />
            {/* hand */}
            <circle
              cx="192"
              cy="150"
              r="11"
              fill="#f0c19a"
              stroke="#2b2620"
              strokeWidth="4"
            />
            {/* pencil pointing at the checklist */}
            <g transform="rotate(128 192 150)">
              <rect
                x="185"
                y="120"
                width="14"
                height="52"
                rx="4"
                fill="#f5a623"
                stroke="#2b2620"
                strokeWidth="3.5"
              />
              <rect x="185" y="120" width="14" height="11" fill="#2b2620" />
              <path
                d="M185 172 l7 16 7-16 z"
                fill="#fff3d6"
                stroke="#2b2620"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path d="M188.5 182 l3.5 6 3.5-6 z" fill="#2b2620" />
            </g>
          </svg>
        </div>
      </div>
    </aside>
  );
}

AuthBrandPanel.propTypes = {
  ctaLabel: PropTypes.string,
  ctaTo: PropTypes.string,
};

export default AuthBrandPanel;

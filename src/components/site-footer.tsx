import Link from "next/link";

import { DEMO_DATA_LABEL, integrationMode, integrationModeCopy } from "@/platform/demo";
import { governmentNavigation } from "@/platform/navigation";

const primaryLinks = governmentNavigation.slice(0, 6);
const secondaryLinks = governmentNavigation.slice(6);

export function SiteFooter() {
  return (
    <footer className="gov-footer">
      <div className="shell-inner gov-footer__grid">
        <div>
          <div className="gov-footer__brand">
            <span className="brand__mark" aria-hidden="true">
              म
            </span>
            <strong>MahaSetu</strong>
          </div>
          <p>
            An evidence-led public innovation procurement demonstrator connecting
            problem discovery, startup matching, controlled pilots, milestone
            evidence, and responsible reuse in one accountable thread.
          </p>
          <p>
            <strong style={{ color: "#ffb787" }}>{integrationModeCopy[integrationMode]}</strong>
            {" · "}
            {DEMO_DATA_LABEL}. This prototype does not connect to live government
            identity, procurement, sandbox, or payment systems.
          </p>
        </div>

        <div>
          <h3>Workspace</h3>
          <ul>
            {primaryLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href as Parameters<typeof Link>[0]["href"]}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Lifecycle &amp; audit</h3>
          <ul>
            {secondaryLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href as Parameters<typeof Link>[0]["href"]}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shell-inner gov-footer__bar">
        <small>
          Pulse → Forge → Match → Lab → Proof → PayFlow → ScaleGraph · SIH 2026
          software demonstrator
        </small>
        <small>Prototype build · Not an official government service</small>
      </div>
    </footer>
  );
}

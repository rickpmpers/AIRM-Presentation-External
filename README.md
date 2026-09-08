# AIRM — Presentation Site

This is the public-facing presentation material for **AIRM**, an evidence-based
control-screening system for AI production risk. It checks — with evidence rather
than self-attestation — whether real technical and governance defenses exist
against ten specific, well-understood AI failure modes (prompt injection, drift,
hallucination, vendor concentration, and others).

## Where to start

- **[modes.html](modes.html)** — the interactive entry point. Talk through the
  project via a live person stream, an animated avatar, a chat bot, or plain
  static articles, whichever mode you prefer.
- **[apply.html](apply.html)** — apply for beta access.
- **[articles/](articles/)** — five short written pieces covering the problem
  space, the architecture, the scoring methodology, what we learned building it,
  and what's next.

## What this repo is (and isn't)

This repo holds only the public presentation site — static pages, styling, and
the client-side interactive guide. The actual engine, scoring logic, and
deployment code live in a **private repository** and are not published here.
Access to that codebase, and to the working beta, is by application only — see
[apply.html](apply.html).

## Who we're looking for

The beta is not aimed at companies or commercial applicants. We're specifically
looking for **individual peer builders** — people who personally run a
"company in a box," a swarm of autonomous agents doing real work under their own
supervision, not a team's. If that's you, [apply here](apply.html).

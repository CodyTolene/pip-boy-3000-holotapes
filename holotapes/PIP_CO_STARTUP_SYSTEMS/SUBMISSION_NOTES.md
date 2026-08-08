# Submission review note

This draft is packaged in the repository's documented Holotape layout.

Important before opening the PR:

1. Replace `app.min.js` with output from the official Pip-Boy Holotape
   Creator/Editor minifier. The current draft keeps `app.min.js` identical to
   `app.js` so behavior is not altered.
2. Add the exact tested firmware version to README.md.
3. The current application intentionally reassigns `Pip.bootAnimation` and
   `Pip.audioStart` and deletes several runtime flags. The repository
   contribution guide currently says Holotapes must not delete/reassign OS
   globals. A maintainer may reject this design unless an exception or supported
   startup-hook mechanism is agreed upon.

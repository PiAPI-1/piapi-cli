# Staged release of PiAPI CLI 0.4.0

## Scope and source of truth

`.github/workflows/stage-release.yml` is a manually dispatched, release-specific
workflow for the existing immutable `v0.4.0` tag. It checks the source commit and
package identity before building, pins Bun 1.4.3 and staging-capable npm 11.19.0,
and verifies the exact four-file tarball SHA-1 before any authenticated upload.
The verified artifact SHA-1 is `5feccd293700dd2bb0771c33572ef2fb3fde0eee`.
Do not move the tag, broaden token permissions or retry the legacy direct-publish
workflow with a stage-only token. This workflow intentionally does not accept
arbitrary release inputs or directly publish or approve packages.

## Stage and approve

1. Dispatch `Release staging` from `main`. The workflow has read-only repository
   permissions and exposes `NPM_TOKEN` only to the staging step. A successful stage
   is not a public release. Inspect the run summary for the stage identifier.
2. A package maintainer reviews `piapi-cli@0.4.0` in npm's **Staged Packages** tab
   and approves it using their own 2FA flow. Agents must not collect passwords,
   tokens or OTPs in chat. Approval is a user action, not a workflow step.
3. Verify npm registry metadata lists version 0.4.0 and latest=0.4.0, compare its
   tarball SHA-1 with the verified reference, then fresh-install the exact version
   into an isolated directory and run its CLI version and image workflow checks.
4. Create the GitHub Release for `v0.4.0` only after registry acceptance passes.

Staged versions reserve their package/version pair. Do not automatically retry a
stage submission after an ambiguous timeout or an already-staged-version error.
Inspect the existing stage first. Rejecting an unapproved stage also requires
maintainer 2FA. Reverting the workflow commit disables this release-specific path
without changing the immutable tag or token policy.

## Verified operational boundaries

The original token produced E404 during direct publication. After the token was
updated, npm explicitly returned E403/E_STAGE_REQUIRED: the token could stage but
not directly publish. Official documentation supports staging without a 2FA
prompt followed by maintainer approval with 2FA. Staging requires npm >=11.15.0
and Node >=22.14.0; the workflow pins supported versions.

Local Bun 1.4.0 and CI Bun 1.4.3 produced different minified bundles. Rebuilding
the tagged source with the exact CI Bun and frozen dependencies reproduced the
CI tarball byte-for-byte. Thus checksum acceptance must use the same build-tool
version, not only the same source commit. The guarded built CLI lifecycle passed
48 assertions on that artifact. No paid PiAPI generation was used.

Primary references:
- https://docs.npmjs.com/staged-publishing/
- https://docs.npmjs.com/cli/v11/commands/npm-stage/

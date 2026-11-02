# Clinic collaboration

Clinic: https://aqslim.com/clinic-preview

Authorized collaborators sign in with their existing account and verified primary email. The server-only `MYAQ_CLINIC_COLLABORATOR_EMAILS` configuration lists exact permitted addresses. Removing an address and rebuilding revokes that Clinic grant. A patient account alone grants no Clinic access. This setting does not grant global dashboard administration or change personal-portal ownership.

Clinic operators can review records and use the clinical consultation, notes, plan, material-assignment, patient-administration, onboarding and consultation-access workflows. Existing explicit confirmations, record scope, audit attribution and write-pause checks remain enforced. Legacy pilot activation keeps its separate exact-Founder restrictions. Executive assistant and private-guide import remain Founder-only.

Application changes use https://github.com/ituarte33/aqslim-website. A GitHub account is separate from the Clinic account. Contributors can fork the public repository and propose a pull request. Direct repository write access requires a separate repository invitation; the Clinic allowlist does not create that invitation. Review and publication are separate from submitting code. Never include patient records, passwords, tokens or deployment environment files in changes.

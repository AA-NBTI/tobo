# Version Bumping Rule

## Context
The user manages deployments heavily relying on the `version` field in `package.json` to verify that updates have been pushed correctly. A recurring mistake has been to fix the user's issue but forget to bump the version, leaving the admin dashboard unable to reflect the update.

## Rule
**MANDATORY:** 
EVERY TIME you fix a bug, implement a feature, or deploy any code changes to the remote repository that the user needs to test on their end (e.g. Vercel deployment), you MUST bump the `version` string in `package.json` BEFORE committing and pushing to Github. 
You must explicitly mention the new version number (e.g., `V9.02.xx`) in your response to the user so they know the deployment is verifiable.

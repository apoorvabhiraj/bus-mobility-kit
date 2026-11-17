# File ownership policy

Every task declares:
- task ID and human owner;
- implementing agent;
- allowed paths;
- forbidden paths;
- dependencies;
- protected shared resources;
- acceptance criteria.

One active writer per file. A human owner is accountable even if multiple agents assist sequentially.
Protected paths include API contracts, database migrations, root manifests and lockfiles, CI workflows, auth/security code, architecture and shared configuration.

CI scope validation can reject unauthorized files only when task metadata is trustworthy and protected. A simple Markdown registry is not a secure authorization system. For stronger enforcement, use a GitHub App or trusted server-side policy service.

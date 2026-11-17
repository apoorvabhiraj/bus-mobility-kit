# Branch protection policy

Protect `main` with:
- pull requests only;
- at least one independent approval;
- required CI checks;
- resolved review conversations;
- up-to-date branch or merge queue;
- no force pushes;
- no deletion;
- no routine administrator bypass.

CODEOWNERS requests review; it does not by itself prevent edits or enforce branch protection.
Configure these settings in GitHub repository Rulesets / branch protection. Files in this ZIP cannot configure remote repository settings automatically.

This directory is a placeholder for Newelle (https://github.com/qwersyk/Newelle).

What this branch contains
- README updated to embed the upstream Newelle demo video (streamed from the upstream repo at commit 09de8b1).

Why the video is streamed instead of copied
- The demo video (newelle.mp4) is kept upstream. Embedding it via the raw.githubusercontent URL allows the video to be playable on GitHub without adding a large binary to this repository.

How to add Newelle as a subtree (recommended if you want to edit upstream code inside this repo)
Run these commands locally in your moon-sparkles clone on the branch you want to add the code to (we used add-newelle-subtree):

```bash
git remote add newelle https://github.com/qwersyk/Newelle.git
git fetch newelle
# Add upstream at the specific commit (09de8b1) and place it under third_party/Newelle
git subtree add --prefix=third_party/Newelle newelle 09de8b1 --squash
```

Notes
- The subtree command above embeds the full upstream repository at the specified commit into third_party/Newelle.
- If you prefer a submodule instead (keeps a link to upstream but requires users to init submodules), use:

```bash
git submodule add https://github.com/qwersyk/Newelle.git third_party/Newelle
git commit -m "Add Newelle as submodule"
```

- If you want me to also add the full Newelle source into this branch for you, I can do that by forking Newelle and copying the files into this repo in a follow-up commit, but it will significantly increase repo size. Tell me if you want me to proceed with copying the files (I will open a PR).

Compatibility
- Newelle is a GNOME/Flatpak desktop app written in Python and may include build files (meson, nix, flatpak) and desktop UI code. If moon-sparkles is a web or React app, you may only want to extract Python modules or APIs rather than the whole app.

If you'd like, I can now open a PR from branch add-newelle-subtree to main with these changes and the instructions. Reply "open PR" and I'll create the PR with a short description.
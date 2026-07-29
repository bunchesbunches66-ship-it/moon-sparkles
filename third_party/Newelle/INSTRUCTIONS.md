How to finish adding Newelle locally (recommended):

1) Clone and prepare the branch (if you don't already have a clone):

  git clone git@github.com:bunchesbunches66-ship-it/moon-sparkles.git
  cd moon-sparkles
  git fetch origin
  git checkout -b the-big-moonhouse origin/the-big-moonhouse || git checkout -b the-big-moonhouse

2) Add Newelle as a remote and fetch it:

  git remote add newelle https://github.com/qwersyk/Newelle.git
  git fetch newelle

3) Add Newelle into third_party/Newelle pinned to commit 09de8b1:

  git subtree add --prefix=third_party/Newelle newelle 09de8b1 --squash

4) (Optional) Download and commit the demo video into the subtree (this will add a large binary):

  mkdir -p third_party/Newelle
  curl -L -o third_party/Newelle/newelle.mp4 https://raw.githubusercontent.com/qwersyk/Newelle/09de8b1/newelle.mp4
  git add third_party/Newelle/newelle.mp4
  git commit -m "Add Newelle demo video"

5) Push the branch and open the PR:

  git push origin the-big-moonhouse

  Open in browser:
  https://github.com/bunchesbunches66-ship-it/moon-sparkles/compare/main...the-big-moonhouse?expand=1

Notes and verification
- After step 3 verify third_party/Newelle contains the upstream files.
- If curl for the video 404s, the demo video path may be different — check the upstream repo for the correct path or download it manually and place it under third_party/Newelle/newelle.mp4.
- If you want me to attempt a full copy via the GitHub API from this environment instead of running commands locally, reply "continue via API" and I will start the process (it will take longer).
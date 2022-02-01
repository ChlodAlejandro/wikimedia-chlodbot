# Zoomiebot
Zoomiebot is a multi-purpose Wikipedia bot, primarily doing tasks that are completely unrelated. Maybe except for tasks that are related to WikiProject Tropical cyclones. Just maybe.

## Information
More information can be found at https://zoomiebot.toolforge.org or the bot's [English Wikipedia userpage](https://en.wikipedia.org/wiki/User:Zoomiebot).

## Deployment
Kubernetes jobs are defined in the etc/ folder. These use the `docker-registry.tools.wmflabs.org/toolforge-bullseye-sssd:latest` image by default. As to why the `bullseye` image is used instead of a prebuilt `node` image, there are no available Node 14.x images on the Toolforge Docker registry (see https://docker-registry.toolforge.org/), and importing containers from DockerHub or building images locally is not allowed.

One-off task execution is handled by [scripts/one-off.sh], which loads in the `$HOME/.profile` file, which in turn initializes the environment (and also imports a nvm-managed node and npm executable found inside `$HOME`) and then runs the script one-off task with `npm run run:<taskName>`.

When a tag is pushed (or a commit starts with "[rw]"), an SSH connection is opened up to `dev.toolforge.org` and executes the available `scripts/update.sh` file. This does not run the update.sh file on master, but instead the available `update.sh` for the current local HEAD.

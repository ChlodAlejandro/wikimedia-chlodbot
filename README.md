# Zoomiebot
Zoomiebot is a multi-purpose Wikipedia bot, primarily doing tasks that are completely unrelated. Maybe except for tasks that are related to WikiProject Tropical cyclones. Just maybe.

## Information
More information can be found at https://zoomiebot.toolforge.org or the bot's [English Wikipedia userpage](https://en.wikipedia.org/wiki/User:Zoomiebot).

## Deployment
Kubernetes jobs are defined in the etc/k8s. The file responsible for handling the bot and the webservice is [`zoomiebot.yaml`](/etc/k8s/zoomiebot.yaml). The pod contains two containers: `webservice` and `zoomiebot`. The latter is responsible for running the bot and also providing access to the bot using Express. More details on this setup can be seen [below](#Webservice).

When a tag is pushed (or a commit starts with "`[force] `"), an SSH connection is opened up to `dev.toolforge.org` and executes the available `scripts/update.sh` file. This does not run the update.sh file on master, but instead the available `update.sh` for the current local HEAD.

To execute, the following environment variables are required.
- `ENWIKI_USERNAME`: The bot's username.
- `ENWIKI_PASSWORD`: The bot's password.
- `IA_S3_ACCESS_KEY`: The Internet Archive S3 access key.
- `IA_S3_SECRET_KEY`: The Internet Archive S3 secret key.

## Webservice
The webservice is a hybrid server that is partly run by PHP and by Node. When a user connects to the tool, Apache will process the connection and determine the appropriate target. The `webservice` command provided by Toolforge cannot achieve this functionality, which means this requires a low-level implementation.

The low-level implementation consists of the [`zoomiebot.yaml`](/etc/k8s/zoomiebot.yaml) Kubernetes deployment (which, as mentioned, handles the two containers responsible for responding to requests) and two scripts: [`k8s_ingest_start.py`](/scripts/k8s_ingest_start.py) and [`k8s_ingest_stop.py`](/scripts/k8s_ingest_stop.py).

The two scripts are for constructing the `Ingress`, `Service`, and `Endpoints` resources that are required to allow access to the webservice from the outside world. If the webservice pod is down and ingest isn't stopped, the tool will reply with just a "503 Service Unavailable" message instead of the Toolforge fallback. If the webservice pod is up but ingest hasn't started, the tool will show the Toolforge fallback instead of the actual webservice contents. As such, care should be taken to ensure that responses are handled properly.

The tool does not destroy ingest resources when updating, so be wary when changing the scripts but not running them on the tool.

import yaml

from toolsws.backends import KubernetesBackend
from toolsws.tool import Tool
from toolsws.wstypes import WebService

tool = Tool.from_currentuser()

job = KubernetesBackend(
    tool,
    tool.manifest.get("web", "php7.3"),
    mem=tool.manifest.get("memory", None),
    cpu=tool.manifest.get("cpu", None),
    replicas=tool.manifest.get("replicas", 1),
    extra_args=tool.manifest.get(
        "web::extra_args", None
    )
)

print(yaml.safe_dump(job._get_deployment()))

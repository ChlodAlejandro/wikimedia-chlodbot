# Adapted from https://phabricator.wikimedia.org/diffusion/OSTW/browse/master/toolsws/backends/kubernetes.py
# Run with python3 -Es ~/project/scripts/k8s_ingest_start.py

from toolsws.tool import Tool
from toolsws.backends.kubernetes import KubernetesRoutingHandler
from toolsws.backends.kubernetes import K8sClient

tool = Tool.from_currentuser()
api = K8sClient.from_file()
routing_handler = KubernetesRoutingHandler(
    api, tool, "tool-{}".format(tool.name)
)

routing_handler.start_kubernetes()
print("Ingest started.")

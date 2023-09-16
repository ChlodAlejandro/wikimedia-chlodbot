# Adapted from https://gitlab.wikimedia.org/repos/cloud/toolforge/tools-webservice/-/blob/main/toolsws/backends/kubernetes.py
# Run with python3 -Es ~/project/scripts/k8s_ingest_start.py

from toolsws.tool import Tool
from toolsws.backends.kubernetes import KubernetesRoutingHandler
from toolsws.backends.kubernetes import K8sClient
from toolforge_weld.kubernetes_config import Kubeconfig

tool = Tool.from_currentuser()
api = K8sClient(kubeconfig=Kubeconfig.load(), user_agent="webservice")
routing_handler = KubernetesRoutingHandler(
    api=api, tool=tool, namespace="tool-{}".format(tool.name), webservice_config={}
)

routing_handler.start_kubernetes()
print("Ingest started.")
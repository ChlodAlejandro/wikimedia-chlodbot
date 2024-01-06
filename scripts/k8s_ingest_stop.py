# Adapted from https://phabricator.wikimedia.org/diffusion/OSTW/browse/master/toolsws/backends/kubernetes.py
# Run with python3 -Es ~/project/scripts/k8s_ingest_start.py

from toolsws.tool import Tool
from toolsws.backends.kubernetes import K8sClient
from toolforge_weld.kubernetes_config import Kubeconfig

tool = Tool.from_currentuser()
api = K8sClient(kubeconfig=Kubeconfig.load(), user_agent="webservice")
webservice_labels = {
    "app.kubernetes.io/component": "web",
    "app.kubernetes.io/managed-by": "webservice",
    "toolforge": "tool",
    "name": tool.name,
}
webservice_label_selector = {
    k: v
    for k, v in webservice_labels.items()
    if k not in ["toolforge", "name"]
}

api.delete_objects("ingresses", label_selector=webservice_label_selector)
api.delete_objects("services", label_selector=webservice_label_selector)
print("Stopped.")
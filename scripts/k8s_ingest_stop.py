# Adapted from https://phabricator.wikimedia.org/diffusion/OSTW/browse/master/toolsws/backends/kubernetes.py
# Run with python3 -Es ~/project/scripts/k8s_ingest_start.py

from toolsws.tool import Tool
from toolsws.backends.kubernetes import K8sClient

tool = Tool.from_currentuser()
api = K8sClient.from_file()
webservice_labels = {
    "app.kubernetes.io/component": "web",
    "app.kubernetes.io/managed-by": "webservice",
    "toolforge": "tool",
    "name": tool.name,
}
webservice_label_selector = ",".join(
    [
        "{k}={v}".format(k=k, v=v)
        for k, v in self.webservice_labels.items()
        if k not in ["toolforge", "name"]
    ]
)

api.delete_objects("ingresses", self.webservice_label_selector)
api.delete_objects("services", self.webservice_label_selector)
print("Stopped.")

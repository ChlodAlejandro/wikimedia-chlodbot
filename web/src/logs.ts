declare global {
    interface Window { logFiles: string[]; }
}
export {};

const logList = document.getElementById("logList");

/**
 * Sets the active log file.
 */
function setLogFile(file) {
    document.getElementById("activeLog").innerText = file;
    fetch(`/api/logs/get.php?file=${encodeURIComponent(file)}`)
        .then(r => r.text())
        .then(t => (new (require("ansi-to-html"))).toHtml(t))
        .then(t => {
            const log = document.getElementById("log");
            log.innerHTML = t;
            log.scrollTop = log.scrollHeight;
            window.location.hash = file;
        });
}

/**
 * Refreshes the available log files.
 */
function refreshLogFiles() {
    logList.innerHTML = "";
    for (const log of (window as any).logFiles) {
        if (log == null) continue;

        const li = document.createElement("li");
        const li_a = document.createElement("li");
        li_a.innerText = log;
        li_a.classList.add("dropdown-item");
        li_a.addEventListener("click", () => {
            setLogFile(log);
            fetch("/api/logs/files.php")
                .then(r => r.text())
                .then(JSON.parse)
                .then((j : string[]) => { window.logFiles = j; });
        });
        li.appendChild(li_a);
        logList.appendChild(li);
    }
}

refreshLogFiles();
if (window.location.hash) {
    setLogFile(window.location.hash.slice(1));
}

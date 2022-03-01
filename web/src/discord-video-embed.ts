(() => {
    const form: HTMLFormElement = document.forms.namedItem("videoForm");
    const commonsFile = (<HTMLInputElement>form.elements.namedItem("file"));
    const submitButton = (<HTMLButtonElement>form.elements.namedItem("submit"));

    const targetVideo = (<HTMLVideoElement>document.querySelector("#targetVideo"));
    const targetVideoUrl: HTMLElement = document.querySelector("#targetVideoUrl");
    const targetVideoDveUrl: HTMLElement = document.querySelector("#targetVideoDveUrl");

    /**
     * Loads the wanted video.
     */
    function loadVideo() {
        submitButton.toggleAttribute("disabled", true);

        const file = commonsFile.value
            .replace(/^:?File:/, "");
        targetVideo.addEventListener("loadeddata", () => {
            targetVideo.parentElement.classList.toggle("no-video", false);
        });
        const fullDveUrl = new URL(
            (window.location.host === "zoomiebot.toolforge.org" ? "/dve.php?file=" : "/dve.php?file=")
                + encodeURIComponent(file),
            window.location.href
        ).toString();
        targetVideo.src = fullDveUrl;

        targetVideoUrl.innerText = "Loading...";
        targetVideoDveUrl.setAttribute("href", fullDveUrl);
        targetVideoDveUrl.innerText = fullDveUrl;

        fetch(fullDveUrl, { method: "HEAD" })
            .then(r => r.url)
            .then(u => {
                targetVideoUrl.setAttribute("href", u);
                targetVideoUrl.innerText = u;
            });

        submitButton.toggleAttribute("disabled", false);
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        loadVideo();

        return false;
    });

    if (commonsFile.value) {
        loadVideo();
    }
})();

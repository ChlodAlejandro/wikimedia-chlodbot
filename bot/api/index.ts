import v1revisions from "./deputy/v1/revisions";
import recentchanges from "./rss/recentchanges";

const deputyEndpoints = {
    v1: {
        revisions: v1revisions
    }
};

export default {
    deputy: Object.assign({}, deputyEndpoints, {
        latest: deputyEndpoints.v1
    }),
    rss: {
        recentchanges: recentchanges
    }
};

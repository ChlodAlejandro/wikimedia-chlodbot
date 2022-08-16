import v1revisions from "./deputy/v1/revisions";
import recentchanges from "./rss/recentchanges";
//import diff from "./renderer/diff";

const deputyEndpoints = {
    v1: {
        revisions: v1revisions
    }
};

export default {
    deputy: Object.assign({}, deputyEndpoints, {
        latest: deputyEndpoints.v1
    }),
    // renderer: {
    //     diff: diff
    // },
    rss: {
        recentchanges: recentchanges
    }
};

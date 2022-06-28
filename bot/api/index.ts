import v1revisions from "./deputy/v1/revisions";
import recentchanges from "./rss/recentchanges";

export default {
    deputy: {
        v1: {
            revisions: v1revisions
        }
    },
    rss: {
        recentchanges: recentchanges
    }
};
